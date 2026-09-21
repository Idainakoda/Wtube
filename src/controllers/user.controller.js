import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOncloudinary } from "../utils/clodinary.js";
import { apiRes } from "../utils/Apiresponse.js";

const userRegister = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body

    if ([fullName, email, username, password].some((field) =>
        field?.trim() === "")
    ) {
        throw new apiErrors(400, "All fields are required");
    }

    const existedUser = await User.findOne(
        { $or: [{ username }, { email }] }
    )
    console.log("Existing user:", existedUser);

    if (existedUser) {
        throw new apiErrors(409, "Username or email already exist")
    }

    const localavatarFile = req.files?.avatar[0]?.path;

    let localcoverimageFile;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        localcoverimageFile = req.files.coverImage[0].path
    }

    if (!localavatarFile) {
        throw new apiErrors(400, "Avatar is required");
    }
    const avatar = await uploadOncloudinary(localavatarFile);
    const coverImage = await uploadOncloudinary(localcoverimageFile);


    const user = await User.create({
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshTockens"
    )

    if (!createdUser) {
        throw new apiErrors(500, "Something went wrong while creating the user!!(")
    }


    return res.status(201).json(
        new apiRes(200, createdUser, "User registered Sucessfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body

    const generateAccessandRefreshTokens = async (userId) => {
        try {
            const user = await User.findById(userId)
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()

            user.refreshToken = refreshToken
            user.save({validateBeforeSave:false}) 
            
            return {accessToken,refreshToken}
        } catch (error) {
            throw new apiErrors(500, "Something went wrong")
        }
    }

    if (!username && !email) {
        throw new apiErrors(400, "Email or Username is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiErrors(401, "Incorrect credentials")
    }

    const {accessToken,refreshToken} = await generateAccessandRefreshTokens(user._id)

    const loogedInUser = await User.findById(user._id).select(" -password -refreshTockens ")

    const options ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken)
    .cookie("refreshToken",refreshToken)
    .json(
        new apiRes(
            200,{
                user: loogedInUser, accessToken , refreshToken
            },
            "User Logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
    //clear refreshtoken
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshTockens: undefined
            }
        },
        {
            new: true
        }
    )

    //clear cookies
    const options ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new apiRes(200, "User Logged Out Successfully:))"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        // 1. Get refresh token from cookie or request body
        const incomingRefreshToken =
            req.cookies?.refreshToken ||
            req.body?.refreshToken;

        // 2. If no refresh token was provided
        if (!incomingRefreshToken) {
            throw new apiErrors(401, "Unauthorized request");
        }

        // 3. Verify the refresh token
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.SECRET_REFRESH_TOKEN
        );

        // 4. Find the existing user using the _id
        const user = await User.findById(decodedToken?._id);

        // 5. If user doesn't exist
        if (!user) {
            throw new apiErrors(401, "Invalid refresh token");
        }

        // 6. Check whether the incoming token matches
        //    the refresh token stored in MongoDB
        if (incomingRefreshToken !== user.refreshToken) {
            throw new apiErrors(
                401,
                "Refresh token is expired or already used"
            );
        }

        // 7. Generate NEW access + refresh tokens
        const {
            accessToken,
            refreshToken: newRefreshToken
        } = await generateAccessAndRefreshTokens(user._id);

        // 8. Cookie options
        const options = {
            httpOnly: true,
            secure: true
        };

        // 9. Send new tokens
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new apiRes(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed successfully"
                )
            );

    } catch (error) {
        throw new apiErrors(
            401,
            error?.message || "Invalid refresh token"
        );
    }
});

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldpassword,newpassword} = req.body;
    const user = await User.findById(req.user?.id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)

    if(!isPasswordCorrect){
        throw new apiErrors(400,"Invaid Password")
    }

    user.password = newpassword
    user.save({
        validateBeforeSave:false
    })

    return res
    .status(200)
    .json(new apiRes(200,{},"Password change succesffully"))
})


const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"Current user fetched succesfully")
})

export { userRegister, loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser }
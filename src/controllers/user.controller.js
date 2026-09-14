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
            const accessToken = req.generateAccessToken()
            const refreshToken = req.generateRefreshToken()

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

export { userRegister, loginUser,logoutUser }
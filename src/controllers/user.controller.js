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
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        localcoverimageFile = req.files.coverImage[0].path
    }
    
    if(!localavatarFile){
        throw new apiErrors(400,"Avatar is required");
    }
    const avatar = await uploadOncloudinary(localavatarFile);
    const coverImage = await uploadOncloudinary(localcoverimageFile);


    const user = await User.create({
        fullName,
        email,
        avatar:avatar.url,
        coverImage: coverImage?.url || "" ,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshTockens"
    )

    if(!createdUser){
        throw new apiErrors(500,"Something went wrong while creating the user!!(")
    }


    return res.status(201).json(
        new apiRes(200,createdUser,"User registered Sucessfully")
    )
})

export { userRegister }
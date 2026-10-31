import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOncloudinary } from "../utils/clodinary.js";
import { apiRes } from "../utils/apiResponse.js";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


// ======================================================
// HELPER: Generate Access + Refresh Tokens
// ======================================================

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new apiErrors(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshTockens = refreshToken;

        await user.save({
            validateBeforeSave: false
        });

        return {
            accessToken,
            refreshToken
        };

    } catch (error) {
        console.log("ACTUAL TOKEN ERROR:", error);

        if (error instanceof apiErrors) {
            throw error;
        }

        throw new apiErrors(
            500,
            error.message || "Something went wrong while generating tokens"
        );

    }
};


// ======================================================
// REGISTER USER
// ======================================================

const userRegister = asyncHandler(async (req, res) => {

    const {
        fullName,
        email,
        username,
        password
    } = req.body;


    // Check required fields
    if (
        [fullName, email, username, password]
            .some((field) => field?.trim() === "")
    ) {
        throw new apiErrors(400, "All fields are required");
    }


    // Check existing user
    const existedUser = await User.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    if (existedUser) {
        throw new apiErrors(
            409,
            "Username or email already exist"
        );
    }


    // Get avatar path
    const localavatarFile = req.files?.avatar?.[0]?.path;


    // Get cover image path
    const localcoverimageFile =
        req.files?.coverImage?.[0]?.path;


    // Avatar is required
    if (!localavatarFile) {
        throw new apiErrors(400, "Avatar is required");
    }


    // Upload avatar
    const avatar = await uploadOncloudinary(localavatarFile);

    if (!avatar) {
        throw new apiErrors(
            400,
            "Error while uploading avatar"
        );
    }


    // Upload cover only if provided
    let coverImage = null;

    if (localcoverimageFile) {
        coverImage = await uploadOncloudinary(
            localcoverimageFile
        );
    }


    // Create user
    const user = await User.create({
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        username: username.toLowerCase()
    });


    // Get created user without sensitive fields
    const createdUser = await User.findById(user._id)
        .select("-password -refreshTockens");


    if (!createdUser) {
        throw new apiErrors(
            500,
            "Something went wrong while creating the user"
        );
    }


    return res
        .status(201)
        .json(
            new apiRes(
                201,
                createdUser,
                "User registered successfully"
            )
        );
});


// ======================================================
// LOGIN USER
// ======================================================

const loginUser = asyncHandler(async (req, res) => {

    const {
        username,
        email,
        password
    } = req.body;


    // Username or email required
    if (!username && !email) {
        throw new apiErrors(
            400,
            "Email or Username is required"
        );
    }


    // Find user
    const user = await User.findOne({
        $or: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
        ]
    });


    // User doesn't exist
    if (!user) {
        throw new apiErrors(
            401,
            "Incorrect credentials"
        );
    }


    // Check password
    const isPasswordValid =
        await user.isPasswordCorrect(password);


    if (!isPasswordValid) {
        throw new apiErrors(
            401,
            "Incorrect credentials"
        );
    }


    // Generate tokens
    const {
        accessToken,
        refreshToken
    } = await generateAccessAndRefreshTokens(
        user._id
    );


    // Get logged-in user
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshTockens");


    // Cookie options
    const options = {
        httpOnly: true,
        secure: true
    };


    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiRes(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User Logged In Successfully"
            )
        );
});


// ======================================================
// LOGOUT USER
// ======================================================

const logoutUser = asyncHandler(async (req, res) => {

    // Remove refresh token from database
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshTockens: 1
            }
        },
        {
            new: true
        }
    );


    // Cookie options
    const options = {
        httpOnly: true,
        secure: true
    };


    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new apiRes(
                200,
                {},
                "User Logged Out Successfully"
            )
        );
});


// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

const refreshAccessToken = asyncHandler(async (req, res) => {

    // 1. Get refresh token
    const incomingRefreshToken =
        req.cookies?.refreshToken ||
        req.body?.refreshToken;


    // 2. Check token
    if (!incomingRefreshToken) {
        throw new apiErrors(
            401,
            "Unauthorized request"
        );
    }


    // 3. Verify refresh token
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.SECRET_REFRESH_TOKEN
    );


    // 4. Find user
    const user = await User.findById(
        decodedToken?._id
    );


    // 5. Check user
    if (!user) {
        throw new apiErrors(
            401,
            "Invalid refresh token"
        );
    }


    // 6. Compare stored refresh token
    if (
        incomingRefreshToken !==
        user.refreshTockens
    ) {
        throw new apiErrors(
            401,
            "Refresh token is expired or already used"
        );
    }


    // 7. Generate new tokens
    const {
        accessToken,
        refreshToken: newRefreshToken
    } = await generateAccessAndRefreshTokens(
        user._id
    );


    // 8. Cookie options
    const options = {
        httpOnly: true,
        secure: true
    };


    // 9. Send new tokens
    return res
        .status(200)
        .cookie(
            "accessToken",
            accessToken,
            options
        )
        .cookie(
            "refreshToken",
            newRefreshToken,
            options
        )
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
});


// ======================================================
// CHANGE PASSWORD
// ======================================================

const changeCurrentPassword = asyncHandler(
    async (req, res) => {

        const {
            oldpassword,
            newpassword
        } = req.body;


        const user = await User.findById(
            req.user?._id
        );


        if (!user) {
            throw new apiErrors(
                404,
                "User not found"
            );
        }


        const isPasswordCorrect =
            await user.isPasswordCorrect(
                oldpassword
            );


        if (!isPasswordCorrect) {
            throw new apiErrors(
                400,
                "Invalid password"
            );
        }


        user.password = newpassword;


        await user.save({
            validateBeforeSave: false
        });


        return res
            .status(200)
            .json(
                new apiRes(
                    200,
                    {},
                    "Password changed successfully"
                )
            );
    }
);


// ======================================================
// GET CURRENT USER
// ======================================================

const getCurrentUser = asyncHandler(
    async (req, res) => {

        return res
            .status(200)
            .json(
                new apiRes(
                    200,
                    req.user,
                    "Current user fetched successfully"
                )
            );
    }
);


// ======================================================
// CHANGE ACCOUNT DETAILS
// ======================================================

const changeAccountDetails = asyncHandler(
    async (req, res) => {

        const {
            fullName,
            email
        } = req.body;


        if (!fullName || !email) {
            throw new apiErrors(
                400,
                "All fields are required"
            );
        }


        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email
                }
            },
            {
                new: true
            }
        ).select("-password -refreshTockens");


        if (!user) {
            throw new apiErrors(
                404,
                "User not found"
            );
        }


        return res
            .status(200)
            .json(
                new apiRes(
                    200,
                    user,
                    "Fullname and Email are updated"
                )
            );
    }
);


// ======================================================
// DELETE OLD CLOUDINARY IMAGE
// ======================================================

const deleteOldImage = async (imageUrl) => {

    if (!imageUrl) {
        return;
    }


    const publicId = imageUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");


    await cloudinary.uploader.destroy(publicId);
};


// ======================================================
// CHANGE AVATAR
// ======================================================

const changeAvatarFile = asyncHandler(
    async (req, res) => {

        const avatarlocalPath =
            req.file?.path;


        if (!avatarlocalPath) {
            throw new apiErrors(
                400,
                "File is missing"
            );
        }


        // Get current user BEFORE updating
        const user = await User.findById(
            req.user?._id
        );


        if (!user) {
            throw new apiErrors(
                404,
                "User not found"
            );
        }


        // Save old Cloudinary URL
        const oldAvatar = user.avatar;


        // Upload new avatar
        const avatarUpload =
            await uploadOncloudinary(
                avatarlocalPath
            );


        if (!avatarUpload) {
            throw new apiErrors(
                400,
                "Error while uploading"
            );
        }


        // Update database
        const updatedUser =
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $set: {
                        avatar: avatarUpload.url
                    }
                },
                {
                    new: true
                }
            ).select("-password -refreshTockens");


        // Delete old image from Cloudinary
        await deleteOldImage(oldAvatar);


        return res
            .status(200)
            .json(
                new apiRes(
                    200,
                    updatedUser,
                    "Avatar updated successfully"
                )
            );
    }
);


// ======================================================
// CHANGE COVER IMAGE
// ======================================================

const changeCoverImage = asyncHandler(
    async (req, res) => {

        const coverImagelocalPath =
            req.file?.path;


        if (!coverImagelocalPath) {
            throw new apiErrors(
                400,
                "File is missing"
            );
        }


        // Get current user BEFORE updating
        const user = await User.findById(
            req.user?._id
        );


        if (!user) {
            throw new apiErrors(
                404,
                "User not found"
            );
        }


        // Save old Cloudinary URL
        const oldcoverImage =
            user.coverImage;


        // Upload new cover
        const coverUpload =
            await uploadOncloudinary(
                coverImagelocalPath
            );


        if (!coverUpload) {
            throw new apiErrors(
                400,
                "Error while uploading"
            );
        }


        // Update database
        const updatedUser =
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $set: {
                        coverImage: coverUpload.url
                    }
                },
                {
                    new: true
                }
            ).select("-password -refreshTockens");


        // Delete old image
        await deleteOldImage(oldcoverImage);


        return res
            .status(200)
            .json(
                new apiRes(
                    200,
                    updatedUser,
                    "Cover Image updated successfully"
                )
            );
    }
);


// ======================================================
// GET THE DETAILS OF THE SUBSCRIBERS AND SUNSCRIPTIONS OF CHANNELS
// ======================================================

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim) {
        throw new apiErrors(400, "Username is missing ")
    }

    const channel = await User.aggregate([
        {//1st pipeline
            $match: {
                username: username?.toLowerCase()
            }
        },

        {//to find subscribers of the user

            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }

        },

        {//to find the subscriptoin of the user

            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }

        },

        {
            $addFields: {

                subscriberCount: {
                    $size: "$subscribers"
                },

                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },

                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }


            }
        },

        {

            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,

                avatar: 1,
                coverImage: 1,
                email: 1


            }

        }
    ])

    if (!channel?.length) {
        throw new apiErrors(404, "Channel does not exist")
    }

    console.log(channel);
    return res
        .status(200)
        .json(new apiRes(200, channel[0], "User channel found"));
});

// ======================================================
// USER WATCH HISTORY
// ======================================================

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: "$owner"
                        }
                    }
                ]
            }
        }
    ])

    return res.
    status(200)
    .json(new apiRes(200,user[0].watchHistory,"Watch history fetched"))

});
// ======================================================
// EXPORT
// ======================================================

export {
    userRegister,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    changeAccountDetails,
    changeAvatarFile,
    changeCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
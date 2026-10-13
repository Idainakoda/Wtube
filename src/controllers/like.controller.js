import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { apiRes } from "../utils/Apiresponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";


const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiErrors(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiErrors(404, "Video not found");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new apiRes(200, { liked: false }, "Video unliked successfully")
        );
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id
    });

    return res.status(200).json(
        new apiRes(200, { liked: true }, "Video liked successfully")
    );
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new apiErrors(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new apiErrors(404, "Comment not found");
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new apiRes(
                200,
                { liked: false },
                "Comment unliked successfully"
            )
        );
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    });

    return res.status(200).json(
        new apiRes(
            200,
            { liked: true },
            "Comment liked successfully"
        )
    );
});


const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new apiErrors(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiErrors(404, "Tweet not found");
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new apiRes(
                200,
                { liked: false },
                "Tweet unliked successfully"
            )
        );
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user._id
    });

    return res.status(200).json(
        new apiRes(
            200,
            { liked: true },
            "Tweet liked successfully"
        )
    );
});


const getLikedVideos = asyncHandler(async (req, res) => {
    

    const userId = req.user._id;

    const likeVideo = await Like.aggregate([
        {
            $match:{
                likedBy: new mongoose.Types.ObjectId(userId) 
            }
        },
        {
            $lookup:{
                from:"videos",
                localfield:"video",
                foreignfield:"_id",
                as:"video"
            }
        },
        {
            $unwind:"$video"
        },
        {
            $lookup:{
                from:"users",
                localfield:"video.owner",
                foreignfield:"_id",
                as:"video.owner"
            }
        },
        {
            $unwind:"$video.owner"
        },
        {
            $project:{
                id:0,
                video:{
                    _id:"$video._id",
                    videoFile:"$video.videoFile",
                    thubnail:"$video.thumbnail",
                    title:"$video.title",
                    description:"$video.description",
                    views:"$video.views",
                    owner:{
                        _id:"$owner._id",
                        fullname:"$owner.fullName",
                        username:"$owner.username",
                        avatar:"$owner.avatar"
                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new apiRes(
        200,
        {likeVideo},
        "all liked videos fetched succeasfully :)"
    ))

});

export{
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}
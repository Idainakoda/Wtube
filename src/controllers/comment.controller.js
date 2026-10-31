import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { apiRes } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const { page = 1, limit = 10 } = req.query

    const pipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignfield: "_id",
                as: "owner"
            }
        },
        {
            $project: {
                content: 1,
                owner: {
                    username: "$owner.username",
                    avatar: "$owner.avatar"
                }
            }
        }
    ]

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate(pipeline),
        {
            page: Number(page),
            limit: Number(limit)
        }
    )

    return res
        .status(200)
        .json(
            new apiRes(
                200,
                comments,
                "Comments fetched successfully"
            )
        )
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiErrors(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    return res
        .status(201)
        .json(
            new apiRes(
                201,
                comment,
                "Comment added successfully"
            )
        )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new apiErrors(404, "Comment not found");
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(
            403,
            "You are not allowed to update this comment"
        );
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    );

    return res
        .status(200)
        .json(
            new apiRes(
                200,
                updatedComment,
                "Comment updated successfully"
            )
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new apiErrors(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(
            403,
            "You are not allowed to delete this comment"
        );
    }

    await Comment.findByIdAndDelete(commentId);

    return res
        .status(200)
        .json(
            new apiRes(
                200,
                {},
                "Comment deleted successfully"
            )
        );
});

export{
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
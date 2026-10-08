import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { uploadOncloudinary,deletefromCloudinary } from "../utils/clodinary.js";
import { apiRes } from "../utils/Apiresponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query

    const matchStage = {
        isPublished: true
    }

    if (query) {
        matchStage.$or = [
            {
                title: {
                    $regex: query,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query,
                    $options: "i"
                }
            }
        ]
    }

    if (userId && isValidObjectId(userId)) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const sortOrder = sortType === "asc" ? 1 : -1
    const pipeline = [
        {
            $match: matchStage
        },

        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },

        {
            $unwind: "$owner"
        },

        {
            $project: {
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                createdAt: 1,

                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullName: "$owner.fullName",
                    avatar: "$owner.avatar"
                }
            }
        },

        {
            $sort: {
                [sortBy]: sortOrder
            }
        }
    ]

    const options = {
        page: Number(page),
        limit: Number(limit)
    }

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        options
    )

    return res
        .status(200)
        .json(
            new apiRes(
                200,
                videos,
                "Videos fetched successfully"
            )
        )

})

const publishVideo = asyncHandler(async (req, res) => {

    const { title, description } = req.body

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new apiErrors(400, "File not found")
    }

    const videoUpload = await uploadOncloudinary(videoLocalPath);
    const thumbnailUpload = await uploadOncloudinary(thumbnailLocalPath);

    if (!videoUpload) {
        throw new apiErrors(400, "Video upload unsuccessful")
    }
    if (!thumbnailUpload) {
        throw new apiErrors(400, "Thumbnail upload unsuccessful")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        duration: videoUpload.duration,
        owner: req.user._id
    })

    return res
        .status(200)
        .json(
            new apiRes(200, video, "Video file uploaded successfully")
        )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.aggregate(
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                owner: {
                    username: "$owner.username",
                    fullName: "$owner.fullName",
                    avatar: "$owner.avatar"
                }
            }
        }
    );

    if (!video.length) {
        throw new apiErrors(404, "Video not found:(")
    }

    return res
        .status(200)
        .json(
            new apiRes(200, video[0], "Video fetched succesfully :)")
        )
})

const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    const { title, description } = req.body

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiErrors(404, "Video not found :(")
    }

    if (
        video.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new apiErrors(
            403,
            "You are not allowed to update this video"
        );
    }

    const thumbnailLocalPath = req.file?.path;

    const thumbnailUpload = await uploadOncloudinary(thumbnailLocalPath)

    if (!thumbnailUpload) {
        throw new apiErrors(404, "video file upload unsuccessfull :(")
    }

    const thumbnail = thumbnailUpload.url

    const videoDetailsUpdate = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail
            },
        }, 
        {
            new: true
        }
    )

    if(!videoDetailsUpdate){
        throw new apiErrors(404,"Update details unsuccessfull:(")
    }

    return res
    .status(200)
    .json(
        new apiRes(200,videoDetailsUpdate,"Details updated successfully :)")
    )

})

const deleteVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new apiErrors(404,"Video not found")
    }

    if(video.owner.toString()!== req.user._id.toString()){
        throw new apiErrors(403, "You are not allowded to delete the video")
    }

    await deletefromCloudinary(video.videoFile)
    
    await Video.findByIdAndDelete(videoId)

    return res
        .status(200)
        .json(
            new apiRes(
                200,
                {},
                "Video deleted successfully"
            )
        )
})

const togglepublishStatus = asyncHandler(async(req,res)=>{
    const {videoId} = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new apiErrors(404,"Video not found")
    }

    if(video.owner.toString()!== req.user._id.toString()){
        throw new apiErrors(403, "You are not allowed to change the publish status")
    }

    video.isPublished = !video.isPublished

    await video.save()

    return res
    .status(200)
    .json(
        new apiRes(
            200,
            {},
            "Video Publish Status complete"    
        )
    )
})

export {
    getAllVideos,
    getVideoById,
    publishVideo,
    updateVideo,
    deleteVideo,
    togglepublishStatus
}
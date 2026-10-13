import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { apiRes } from "../utils/Apiresponse.js";
import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { apiRes } from "../utils/apiRes.js";


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name?.trim()) {
        throw new apiErrors(400, "Playlist name is required");
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description || "",
        owner: req.user._id,
        videos: []
    });

    return res.status(201).json(
        new apiRes(201, playlist, "Playlist created successfully")
    );
});


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        throw new apiErrors(400, "Invalid user ID");
    }

    const playlists = await Playlist.find({ owner: userId });

    return res.status(200).json(
        new apiRes(200, playlists, "User playlists fetched successfully")
    );
});


const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new apiErrors(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            populate: {
                path: "owner",
                select: "username fullName avatar"
            }
        })
        .populate("owner", "username fullName avatar");

    if (!playlist) {
        throw new apiErrors(404, "Playlist not found");
    }

    return res.status(200).json(
        new apiRes(200, playlist, "Playlist fetched successfully")
    );
});


const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (
        !mongoose.isValidObjectId(playlistId) ||
        !mongoose.isValidObjectId(videoId)
    ) {
        throw new apiErrors(400, "Invalid playlist ID or video ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiErrors(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(403, "You cannot modify this playlist");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiErrors(404, "Video not found");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true
        }
    );

    return res.status(200).json(
        new apiRes(
            200,
            updatedPlaylist,
            "Video added to playlist successfully"
        )
    );
});


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (
        !mongoose.isValidObjectId(playlistId) ||
        !mongoose.isValidObjectId(videoId)
    ) {
        throw new apiErrors(400, "Invalid playlist ID or video ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiErrors(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(403, "You cannot modify this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    );

    return res.status(200).json(
        new apiRes(
            200,
            updatedPlaylist,
            "Video removed from playlist successfully"
        )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new apiErrors(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiErrors(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(403, "You cannot delete this playlist");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json(
        new apiRes(200, {}, "Playlist deleted successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new apiErrors(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiErrors(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(403, "You cannot update this playlist");
    }

    const updateFields = {};

    if (name !== undefined) {
        if (!name.trim()) {
            throw new apiErrors(400, "Playlist name cannot be empty");
        }

        updateFields.name = name.trim();
    }

    if (description !== undefined) {
        updateFields.description = description;
    }

    if (Object.keys(updateFields).length === 0) {
        throw new apiErrors(400, "Provide a name or description to update");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: updateFields
        },
        {
            new: true,
            runValidators: true
        }
    );

    return res.status(200).json(
        new apiRes(200, updatedPlaylist, "Playlist updated successfully")
    );
});


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};

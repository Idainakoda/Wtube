import mongoose from "mongoose";
import { Tweet } from "../models/tweets.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { apiRes } from "../utils/apiResponse.js";


const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content?.trim()) {
        throw new apiErrors(400, "Tweet content is required");
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    });

    return res.status(201).json(
        new apiRes(201, tweet, "Tweet created successfully")
    );
});


const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        throw new apiErrors(400, "Invalid user ID");
    }

    const tweets = await Tweet.find({
        owner: userId
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new apiRes(200, tweets, "User tweets fetched successfully")
    );
});


const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new apiErrors(400, "Invalid tweet ID");
    }

    if (!content?.trim()) {
        throw new apiErrors(400, "Tweet content is required");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiErrors(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(403, "You cannot update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content.trim()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    return res.status(200).json(
        new apiRes(200, updatedTweet, "Tweet updated successfully")
    );
});


const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new apiErrors(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiErrors(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new apiErrors(403, "You cannot delete this tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(
        new apiRes(200, {}, "Tweet deleted successfully")
    );
});


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};

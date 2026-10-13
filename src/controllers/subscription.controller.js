import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { apiRes } from "../utils/apiRes.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user._id;

    if (!mongoose.isValidObjectId(channelId)) {
        throw new apiErrors(400, "Invalid channel ID");
    }

    if (channelId === subscriberId.toString()) {
        throw new apiErrors(400, "You cannot subscribe to yourself");
    }

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new apiErrors(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    });

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);

        return res.status(200).json(
            new apiRes(200, { subscribed: false }, "Unsubscribed successfully")
        );
    }

    await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    });

    return res.status(200).json(
        new apiRes(200, { subscribed: true }, "Subscribed successfully")
    );
});


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.isValidObjectId(channelId)) {
        throw new apiErrors(400, "Invalid channel ID");
    }

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new apiErrors(404, "Channel not found");
    }

    const subscribers = await Subscription.find({
        channel: channelId
    }).populate("subscriber", "username fullName avatar");

    return res.status(200).json(
        new apiRes(
            200,
            {
                subscribers,
                subscribersCount: subscribers.length
            },
            "Channel subscribers fetched successfully"
        )
    );
});


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!mongoose.isValidObjectId(subscriberId)) {
        throw new apiErrors(400, "Invalid subscriber ID");
    }

    const user = await User.findById(subscriberId);

    if (!user) {
        throw new apiErrors(404, "User not found");
    }

    const subscriptions = await Subscription.find({
        subscriber: subscriberId
    }).populate("channel", "username fullName avatar");

    return res.status(200).json(
        new apiRes(
            200,
            {
                subscriptions,
                subscribedToCount: subscriptions.length
            },
            "Subscribed channels fetched successfully"
        )
    );
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};

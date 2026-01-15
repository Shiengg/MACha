import Notification from "../models/notification.js";
import { redisClient } from "../config/redis.js";
import mongoose from "mongoose";

export const createNotification = async (payload) => {
    const notification = new Notification(payload);
    await notification.save();
    return notification;
}

export const getNotifications = async (userId) => {
    // Convert userId to ObjectId to ensure consistent query
    const userIdStr = userId?.toString();
    const notificationKey = `notifications:${userIdStr}`;
    const cached = await redisClient.get(notificationKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Ensure userId is converted to ObjectId for proper matching
    const receiverId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

    const notifications = await Notification.find({ receiver: receiverId })
        .populate("sender", "username avatar")
        .populate("post", "content_text")
        .populate("campaign", "title")
        .populate("event", "title")
        .sort({ createdAt: -1 })
        .limit(50);

    await redisClient.setEx(notificationKey, 300, JSON.stringify(notifications));
    return notifications;
}

export const markAsRead = async (notificationId, userId) => {
    const userIdStr = userId?.toString();
    const notificationKey = `notifications:${userIdStr}`;
    
    // Ensure userId is converted to ObjectId for proper matching
    const receiverId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, receiver: receiverId },
        { is_read: true },
        { new: true }
    );

    await redisClient.del(notificationKey);
    return notification;
}

export const markAllAsRead = async (userId) => {
    const userIdStr = userId?.toString();
    const notificationKey = `notifications:${userIdStr}`;
    
    // Ensure userId is converted to ObjectId for proper matching
    const receiverId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    
    const result = await Notification.updateMany(
        { receiver: receiverId, is_read: false },
        { $set: { is_read: true } }
    );
    await redisClient.del(notificationKey);
    return result;
}

export const deleteNotification = async (notificationId, userId) => {
    const userIdStr = userId?.toString();
    const notificationKey = `notifications:${userIdStr}`;
    
    // Ensure userId is converted to ObjectId for proper matching
    const receiverId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    
    const notification = await Notification.findOne({
        _id: notificationId,
        receiver: receiverId
    });

    if (!notification) {
        return null;
    }

    await Notification.deleteOne({ _id: notificationId });

    await redisClient.del(notificationKey);
    return notification;
}
import Notification from "../models/notification.js";
import { redisClient } from "../config/redis.js";
export const createNotification = async (payload) => {
    const notification = new Notification(payload);
    await notification.save();
    return notification;
}

export const getNotifications = async (userId) => {
    const notificationKey = `notifications:${userId}`;
    const cached = await redisClient.get(notificationKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const notifications = await Notification.find({ receiver: userId })
        .populate("sender", "username avatar")
        .populate("post", "content_text")
        .populate("campaign", "title")
        .sort({ createdAt: -1 })
        .limit(50);

    await redisClient.setEx(notificationKey, 300, JSON.stringify(notifications));
    return notifications;
}

export const markAsRead = async (notificationId, userId) => {
    const notificationKey = `notifications:${userId}`;
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, receiver: userId },
        { is_read: true },
        { new: true }
    );

    await redisClient.del(notificationKey);
    return notification;
}

export const markAllAsRead = async (userId) => {
    const notificationKey = `notifications:${userId}`;
    const result = await Notification.updateMany(
        { receiver: userId, is_read: false },
        { $set: { is_read: true } }
    );
    await redisClient.del(notificationKey);
    return result;
}

export const deleteNotification = async (notificationId, userId) => {
    const notificationKey = `notifications:${userId}`;
    const notification = await Notification.findOne({
        _id: notificationId,
        receiver: userId
    });

    if (!notification) {
        return null;
    }

    await Notification.deleteOne({ _id: notificationId });

    await redisClient.del(notificationKey);
    return notification;
}
import Notification from "../models/notification.js";

export const createNotification = async (payload) => {
    const notification = new Notification(payload);
    await notification.save();
    return notification;
}

export const getNotifications = async (userId) => {
    const notifications = await Notification.find({ receiver: userId })
        .populate("sender", "username avatar")
        .populate("post", "content_text")
        .populate("campaign", "title")
        .sort({ createdAt: -1 })
        .limit(50); // Giới hạn 50 notifications gần nhất
    return notifications;
}

export const markAsRead = async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, receiver: userId },
        { is_read: true },
        { new: true }
    );
    return notification;
}

export const markAllAsRead = async (userId) => {
    const result = await Notification.updateMany(
        { receiver: userId, is_read: false },
        { $set: { is_read: true } }
    );
    return result;
}

export const deleteNotification = async (notificationId, userId) => {
    const notification = await Notification.findOne({ 
        _id: notificationId, 
        receiver: userId 
    });
    
    if (!notification) {
        return null;
    }
    
    // Delete notification
    await Notification.deleteOne({ _id: notificationId });
    
    return notification;
}
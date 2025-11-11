import Notification from "../models/notification.js";
import { HTTP_STATUS } from "../utils/status.js";

export const createNotification = async ({ receiver, sender, type, message, post, campaign }) => {
    try {
        await Notification.create({ receiver, sender, type, message, post, campaign });
    } catch (error) {
        console.error("Error creating notification:", error.message);
    }
}

export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ receiver: req.user._id })
            .populate("sender", "username avatar")
            .populate("post", "content_text")
            .populate("campaign", "title")
            .sort({ created_at: -1 });

        return res.status(HTTP_STATUS.OK).json({ count: notifications.length, notifications });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, receiver: req.user._id },
            { is_read: true },
            { new: true });

        if (!notification) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Notification not found" })
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Marked as read", notification })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await Notification.updateMany(
            { receiver: userId, is_read: false },
            { $set: { is_read: true } }
        );

        return res.status(HTTP_STATUS.OK).json({
            message: "All notifications marked as read",
            modifiedCount: result.modifiedCount
        })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOne({ _id: id, receiver: userId });

        if (!notification) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Notification not found or not authorized" });
        }

        await Notification.deleteOne({ _id: id });

        return res.status(HTTP_STATUS.OK).json({ message: "Notification deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}
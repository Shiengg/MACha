import { HTTP_STATUS } from "../utils/status.js";
import * as notificationService from "../services/notification.service.js";

export const createNotification = async ({ receiver, sender, type, message, post, campaign }) => {
    try {
        await notificationService.createNotification({ receiver, sender, type, message, post, campaign });
    } catch (error) {
        console.error("Error creating notification:", error.message);
    }
}

export const getNotifications = async (req, res) => {
    try {
        const notifications = await notificationService.getNotifications(req.user._id);

        return res.status(HTTP_STATUS.OK).json({ notifications });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const markAsRead = async (req, res) => {
    try {
        const notification = await notificationService.markAsRead(req.params.id, req.user._id);
        return res.status(HTTP_STATUS.OK).json({ notification })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await notificationService.markAllAsRead(userId);
        return res.status(HTTP_STATUS.OK).json({ result })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await notificationService.deleteNotification(id, userId);

        if (!notification) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Notification not found or not authorized" });
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Notification deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}
/**
 * Notification Service for Worker
 * 
 * Creates notification records in MongoDB and publishes to Redis pub/sub
 */

import Notification from "../models/notification.js";
import { getNotificationPublisher } from "../config/redis.js";

export const createNotification = async (payload) => {
    // Create notification in DB
    const notification = new Notification(payload);
    await notification.save();
    
    // Publish to Redis pub/sub
    try {
        const publisher = getNotificationPublisher();
        await publisher.publish('notification:new', JSON.stringify({
            recipientId: payload.receiver.toString(),
            notification: {
                _id: notification._id.toString(),
                type: notification.type,
                message: notification.message,
                content: notification.content,
                sender: payload.sender ? payload.sender.toString() : null,
                post: payload.post ? payload.post.toString() : null,
                campaign: payload.campaign ? payload.campaign.toString() : null,
                event: payload.event ? payload.event.toString() : null,
                is_read: notification.is_read,
                createdAt: notification.createdAt
            }
        }));
    } catch (error) {
        console.error('[Notification Service] Failed to publish notification:', error);
        // Don't throw - notification đã được lưu vào DB
    }
    
    return notification;
};


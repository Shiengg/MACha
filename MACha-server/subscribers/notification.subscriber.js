import { createSubcriber, redisClient } from "../config/redis.js";
import Notification from "../models/notification.js";

export const initNotificationSubscriber = async (io) => {
    const sub = await createSubcriber();
    
    console.log("✅ Notification subscriber connected");
    console.log("📡 Listening to: notification:new\n");
    
    await sub.subscribe("notification:new", async (message) => {
        try {
            const event = JSON.parse(message);
            
            // Invalidate Redis cache for this user's notifications
            // This ensures the next API call fetches fresh data from DB
            const notificationCacheKey = `notifications:${event.recipientId}`;
            try {
                await redisClient.del(notificationCacheKey);
                console.log(`🗑️  Invalidated notification cache for user: ${event.recipientId}`);
            } catch (cacheError) {
                console.error('❌ Error invalidating notification cache:', cacheError.message);
                // Don't throw - continue with emitting notification
            }
            
            // Populate notification với sender, post, campaign, event trước khi emit
            // Đảm bảo payload giống hệt REST API response
            try {
                const populatedNotification = await Notification.findById(event.notification._id)
                    .populate("sender", "username avatar")
                    .populate("post", "content_text")
                    .populate("campaign", "title")
                    .populate("event", "title")
                    .lean(); // Convert to plain object for JSON serialization
                
                if (!populatedNotification) {
                    console.error(`❌ Notification not found: ${event.notification._id}`);
                    return;
                }
                
                // Emit CHỈ cho user cụ thể (vào room của họ)
                const userRoom = `user:${event.recipientId}`;
                io.to(userRoom).emit("new-notification", populatedNotification);
                
                console.log(`✅ Emitted populated notification to room: ${userRoom}\n`);
            } catch (populateError) {
                console.error('❌ Error populating notification:', populateError.message);
                // Fallback: emit raw notification if populate fails
                const userRoom = `user:${event.recipientId}`;
                io.to(userRoom).emit("new-notification", event.notification);
                console.log(`⚠️  Emitted raw notification (populate failed) to room: ${userRoom}\n`);
            }
        } catch (error) {
            console.error('❌ Error parsing notification event:', error);
        }
    })
}


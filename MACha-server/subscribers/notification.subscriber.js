import { createSubcriber, redisClient } from "../config/redis.js";

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
            
            // Emit CHỈ cho user cụ thể (vào room của họ)
            const userRoom = `user:${event.recipientId}`;
            io.to(userRoom).emit("new-notification", event.notification);
            
            console.log(`✅ Emitted notification to room: ${userRoom}\n`);
        } catch (error) {
            console.error('❌ Error parsing notification event:', error);
        }
    })
}


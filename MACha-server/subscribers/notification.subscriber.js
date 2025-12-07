import { createSubcriber } from "../config/redis.js";

export const initNotificationSubscriber = async (io) => {
    const sub = await createSubcriber();
    
    console.log("✅ Notification subscriber connected");
    console.log("📡 Listening to: notification:new\n");
    
    await sub.subscribe("notification:new", (message) => {
        try {
            const event = JSON.parse(message);
            
            // Emit CHỈ cho user cụ thể (vào room của họ)
            const userRoom = `user:${event.recipientId}`;
            io.to(userRoom).emit("new-notification", event.notification);
            
            console.log(`✅ Emitted notification to room: ${userRoom}\n`);
        } catch (error) {
            console.error('❌ Error parsing notification event:', error);
        }
    })
}


import { createSubcriber } from "../config/redis.js";

export const initLikeSubscriber = async (io) => {
    const sub = await createSubcriber();
    
    console.log("✅ Like subscriber connected");
    console.log("📡 Listening to: tracking:post:liked, tracking:post:unliked\n");
    
    await sub.subscribe("tracking:post:liked", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🎉 Received post liked event!");    
            console.log("📦 Event data:", event);
            
            // Emit to Socket.IO clients
            io.emit("post:liked", event);
            console.log("✅ Emitted to Socket.IO clients for post liked\n");
        } catch (error) {
            console.error('❌ Error parsing post liked event:', error);
        }
    });

    await sub.subscribe("tracking:post:unliked", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🎉 Received post unliked event!");
            console.log("📦 Event data:", event);
            
            // Emit to Socket.IO clients
            io.emit("post:unliked", event);
            console.log("✅ Emitted to Socket.IO clients for post unliked\n");
        } catch (error) {
            console.error('❌ Error parsing post unliked event:', error);
        }
    });
}
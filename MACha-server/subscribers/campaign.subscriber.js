import { createSubcriber } from "../config/redis.js";

export const initCampaignSubscriber = async (io) => {
    const sub = await createSubcriber();
    
    console.log("✅ Campaign subscriber connected");
    console.log("📡 Listening to: tracking:campaign:created\n");
    
    await sub.subscribe("tracking:campaign:created", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🎉 Received campaign created event!");
            console.log("📦 Event data:", event);
            
            // Emit to Socket.IO clients
            io.emit("campaign:created", event);
            console.log("✅ Emitted to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign created event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:updated", (message) => {
        try {
            const event = JSON.parse(message);
            //Logic xử lí
            
            // Emit to Socket.IO clients
            io.emit("campaign:updated", event);
            console.log("✅ Emitted to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign updated event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:deleted", (message) => {
        try {
            const event = JSON.parse(message);
            //Logic xử lí
            
            // Emit to Socket.IO clients
            io.emit("campaign:deleted", event);
            console.log("✅ Emitted to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign deleted event:', error);
        }
    });
}
import { createSubcriber } from "../config/redis.js";

export const initDonationSubscriber = async (io) => {
    const sub = await createSubcriber();
    
    console.log("✅ Donation subscriber connected");
    console.log("📡 Listening to donation events\n");
    
    await sub.subscribe("tracking:donation:created", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🎉 Received donation created event!");
            console.log("📦 Event data:", event);
            
            // Emit to all clients watching this campaign
            io.emit("donation:created", event);
            // Also emit to campaign-specific room
            io.to(`campaign:${event.campaignId}`).emit("donation:created", event);
            
            console.log("✅ Emitted donation:created to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing donation created event:', error);
        }
    });

    await sub.subscribe("tracking:donation:updated", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🔄 Received donation updated event!");
            console.log("📦 Event data:", event);
            
            // Emit to all clients watching this campaign
            io.emit("donation:updated", event);
            // Also emit to campaign-specific room
            io.to(`campaign:${event.campaignId}`).emit("donation:updated", event);
            
            console.log("✅ Emitted donation:updated to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing donation updated event:', error);
        }
    });

    await sub.subscribe("tracking:donation:status_changed", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🔄 Received donation status changed event!");
            console.log("📦 Event data:", event);
            
            // Emit to all clients watching this campaign
            io.emit("donation:status_changed", event);
            // Also emit to campaign-specific room
            io.to(`campaign:${event.campaignId}`).emit("donation:status_changed", event);
            
            console.log("✅ Emitted donation:status_changed to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing donation status changed event:', error);
        }
    });
}


import { createSubcriber } from "../config/redis.js";
import * as notificationService from "../services/notification.service.js";

export const initCampaignSubscriber = async (io) => {
    const sub = await createSubcriber();
    
    console.log("✅ Campaign subscriber connected");
    console.log("📡 Listening to campaign events\n");
    
    await sub.subscribe("tracking:campaign:created", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🎉 Received campaign created event!");
            console.log("📦 Event data:", event);
            
            io.emit("campaign:created", event);
            console.log("✅ Emitted to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign created event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:updated", (message) => {
        try {
            const event = JSON.parse(message);
            
            io.emit("campaign:updated", event);
            console.log("✅ Emitted campaign:updated to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign updated event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:deleted", (message) => {
        try {
            const event = JSON.parse(message);
            
            io.emit("campaign:deleted", event);
            console.log("✅ Emitted campaign:deleted to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign deleted event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:approved", async (message) => {
        try {
            const event = JSON.parse(message);
            console.log("✅ Campaign approved event received:", event.campaignId);
            
            const notification = await notificationService.createNotification({
                receiver: event.creatorId,
                type: "campaign_approved",
                campaign: event.campaignId,
                content: `Your campaign "${event.title}" has been approved and is now active!`
            });

            io.to(event.creatorId.toString()).emit("notification", notification);
            io.emit("campaign:approved", event);
            
            console.log("✅ Notification sent to creator\n");
        } catch (error) {
            console.error('❌ Error handling campaign approved event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:rejected", async (message) => {
        try {
            const event = JSON.parse(message);
            console.log("❌ Campaign rejected event received:", event.campaignId);
            
            const notification = await notificationService.createNotification({
                receiver: event.creatorId,
                type: "campaign_rejected",
                campaign: event.campaignId,
                content: `Your campaign "${event.title}" has been rejected. Reason: ${event.rejection_reason}`
            });

            io.to(event.creatorId.toString()).emit("notification", notification);
            io.emit("campaign:rejected", event);
            
            console.log("✅ Rejection notification sent to creator\n");
        } catch (error) {
            console.error('❌ Error handling campaign rejected event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:cancelled", (message) => {
        try {
            const event = JSON.parse(message);
            
            io.emit("campaign:cancelled", event);
            console.log("✅ Emitted campaign:cancelled to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign cancelled event:', error);
        }
    });
}
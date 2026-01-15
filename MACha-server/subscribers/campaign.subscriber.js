import { createSubcriber } from "../config/redis.js";
import { invalidateCampaignCache } from "../services/campaign.service.js";

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
        const requestId = `subscriber-${Date.now()}`;
        try {
            const event = JSON.parse(message);
            console.log(`[Campaign Subscriber] Campaign approved event received`, {
                requestId,
                campaignId: event.campaignId,
                eventRequestId: event.requestId,
                timestamp: event.timestamp || new Date().toISOString()
            });

            // Defensive cache invalidation - ensure cache is invalidated even if
            // it was missed in the main approval flow
            try {
                await invalidateCampaignCache(
                    event.campaignId, 
                    event.category, 
                    `${requestId}-defensive`,
                    event.creatorId // Include creatorId for creator cache invalidation
                );
                console.log(`[Campaign Subscriber] Defensive cache invalidation completed`, {
                    requestId,
                    campaignId: event.campaignId,
                    creatorId: event.creatorId
                });
            } catch (cacheError) {
                // Log but don't fail - this is defensive
                console.error(`[Campaign Subscriber] Defensive cache invalidation failed (non-critical)`, {
                    requestId,
                    campaignId: event.campaignId,
                    error: cacheError.message
                });
            }

            io.emit("campaign:approved", event);
            console.log(`[Campaign Subscriber] Emitted campaign:approved to Socket.IO clients`, {
                requestId,
                campaignId: event.campaignId
            });
        } catch (error) {
            console.error(`[Campaign Subscriber] Error parsing campaign approved event`, {
                requestId,
                error: error.message,
                stack: error.stack
            });
        }
    });

    await sub.subscribe("tracking:campaign:rejected", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("❌ Campaign rejected event received:", event.campaignId);
            
            io.emit("campaign:rejected", event);
            console.log("✅ Emitted campaign:rejected to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing campaign rejected event:', error);
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

    await sub.subscribe("tracking:campaign:update:created", (message) => {
        try {
            const event = JSON.parse(message);
            
            // Emit to all clients (like donation events)
            io.emit("campaign:update:created", event);
            // Also emit to campaign-specific room
            const room = `campaign:${event.campaignId}`;
            io.to(room).emit("campaign:update:created", event);
        } catch (error) {
            console.error('Error parsing campaign update created event:', error);
        }
    });

    await sub.subscribe("tracking:campaign:update:deleted", (message) => {
        try {
            const event = JSON.parse(message);
            
            // Emit to all clients (like donation events)
            io.emit("campaign:update:deleted", event);
            // Also emit to campaign-specific room
            const room = `campaign:${event.campaignId}`;
            io.to(room).emit("campaign:update:deleted", event);
        } catch (error) {
            console.error('Error parsing campaign update deleted event:', error);
        }
    });
}
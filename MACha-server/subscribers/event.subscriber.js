import { createSubcriber } from "../config/redis.js";

export const initEventSubscriber = async (io) => {
    const sub = await createSubcriber();
    
    console.log("✅ Event subscriber connected");
    console.log("📡 Listening to event RSVP events\n");
    
    await sub.subscribe("tracking:event:rsvp:created", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🎉 Received event RSVP created event!");
            console.log("📦 Event data:", event);
            
            if (event.rsvp && (event.rsvp.status === 'going' || event.rsvp.status === 'interested')) {
                const userRoom = `user:${event.userId}`;
                io.to(userRoom).emit("event:join-room", { 
                    eventId: event.eventId,
                    room: `event:${event.eventId}`
                });
                console.log(`📢 Told user ${event.userId} to join event room: event:${event.eventId}`);
            }
            
            io.emit("event:rsvp:updated", event);
            const room = `event:${event.eventId}`;
            io.to(room).emit("event:rsvp:updated", event);
            
            console.log("✅ Emitted event:rsvp:updated to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing event RSVP created event:', error);
        }
    });

    await sub.subscribe("tracking:event:rsvp:updated", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🔄 Received event RSVP updated event!");
            console.log("📦 Event data:", event);
            
            if (event.rsvp && (event.rsvp.status === 'going' || event.rsvp.status === 'interested')) {
                const userRoom = `user:${event.userId}`;
                io.to(userRoom).emit("event:join-room", { 
                    eventId: event.eventId,
                    room: `event:${event.eventId}`
                });
                console.log(`📢 Told user ${event.userId} to join event room: event:${event.eventId}`);
            }
            
            io.emit("event:rsvp:updated", event);
            const room = `event:${event.eventId}`;
            io.to(room).emit("event:rsvp:updated", event);
            
            console.log("✅ Emitted event:rsvp:updated to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing event RSVP updated event:', error);
        }
    });

    await sub.subscribe("tracking:event:rsvp:deleted", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("🗑️ Received event RSVP deleted event!");
            console.log("📦 Event data:", event);
            
            io.emit("event:rsvp:deleted", event);
            const room = `event:${event.eventId}`;
            io.to(room).emit("event:rsvp:deleted", event);
            
            console.log("✅ Emitted event:rsvp:deleted to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing event RSVP deleted event:', error);
        }
    });

    await sub.subscribe("tracking:event:update:created", (message) => {
        try {
            const event = JSON.parse(message);
            console.log("📢 Received event update created event!");
            console.log("📦 Event data:", event);
            
            io.emit("event:update:created", event);
            const room = `event:${event.eventId}`;
            io.to(room).emit("event:update:created", event);
            
            console.log("✅ Emitted event:update:created to Socket.IO clients\n");
        } catch (error) {
            console.error('❌ Error parsing event update created event:', error);
        }
    });
}


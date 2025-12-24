import { createSubcriber } from "../config/redis.js";

export const initMessageSubscriber = async (io) => {
    const sub = await createSubcriber();

    console.log("✅ Message subscriber connected");
    console.log("📡 Listening to: chat:message:new\n");

    await sub.subscribe("chat:message:new", (raw) => {
        try {
            const event = JSON.parse(raw);
            const message = event.message;
            const memberIds = event.memberIds || [];

            if (!message || memberIds.length === 0) {
                return;
            }

            memberIds.forEach((userId) => {
                const room = `user:${userId}`;
                io.to(room).emit("chat:message:new", message);
            });
        } catch (error) {
            console.error("❌ Error parsing chat message event:", error);
        }
    });
};



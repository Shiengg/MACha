import { createSubcriber } from "../config/redis.js";

export const initUserSubscriber = async (io) => {
    const sub = await createSubcriber();

    console.log("✅ User subscriber connected");
    console.log("📡 Listening to: tracking:user:followed\n", "tracking:user:unfollowed\n");

    await sub.subscribe("tracking:user:followed", (message) => {
        try {
            const event = JSON.parse(message);

            io.emit("user:followed", event);
        } catch (error) {
            console.error('❌ Error parsing user followed event:', error);
        }
    });

    await sub.subscribe("tracking:user:unfollowed", (message) => {
        try {
            const event = JSON.parse(message);

            io.emit("user:unfollowed", event);
        } catch (error) {
            console.error('❌ Error parsing user unfollowed event:', error);
        }
    });
}
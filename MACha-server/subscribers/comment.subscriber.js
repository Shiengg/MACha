import { createSubcriber } from "../config/redis.js";

export const initCommentSubscriber = async (io) => {
    const sub = await createSubcriber();

    await sub.subscribe("tracking:comment:added", (message) => {
        try {
            const event = JSON.parse(message);

            io.emit("comment:added", event);
        } catch (error) {
            console.error('Error parsing comment added event:', error);
        }
    })

    await sub.subscribe("tracking:comment:deleted", (message) => {
        try {
            const event = JSON.parse(message);

            io.emit("comment:deleted", event);
        } catch (error) {
            console.error('Error parsing comment deleted event:', error);
        }
    })
}
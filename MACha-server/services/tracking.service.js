import { redisClient } from "../config/redis.js";

export const publishEvent = async (channel, event) => {
    await redisClient.publish(channel, JSON.stringify(event));
}

export const publishSignUpEvent = async (event) => {
    const channel = `tracking:signup`;
    await publishEvent(channel, event);
}
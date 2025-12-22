import { redisClient } from "../config/redis.js";

export const publishEvent = async (channel, event) => {
    await redisClient.publish(channel, JSON.stringify(event));
}
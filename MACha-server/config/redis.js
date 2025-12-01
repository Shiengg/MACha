import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redisClient = createClient({url: redisUrl});

//1. Exception handling
redisClient.on("error", (err) => console.error("Redis Client Error", err));

//2. Connect to Redis
export const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log("Redis connected successfully");
    } catch (error) {
        console.error("Failue to connect with Redis", error);
        process.exit(1);
    }
}

//3 Create channel
export const createSubcriber = async () => {
    const sub = redisClient.duplicate();
    await sub.connect();
    return sub;
}
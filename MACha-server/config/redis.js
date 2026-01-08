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
        if (!redisUrl) {
            throw new Error("REDIS_URL environment variable is not defined");
        }
        await redisClient.connect();
        console.log("Redis connected successfully");
    } catch (error) {
        console.error("Failed to connect with Redis:", error.message);
        // In production (Railway), throw error instead of exit to allow retries
        if (process.env.NODE_ENV === 'production') {
            throw error;
        } else {
            process.exit(1);
        }
    }
}

//3. Create a single shared subscriber client (reused by all subscribers)
// This ensures all 8 subscribers (campaign, like, notification, comment, donation, user, message, event)
// share the same Redis connection, minimizing connection usage
let subscriberClient = null;
let subscriberConnectionPromise = null; // Prevent race conditions when multiple subscribers init simultaneously

export const getSubscriber = async () => {
    // Reuse existing subscriber if available and ready
    if (subscriberClient) {
        try {
            // Check if connection is still alive by pinging
            await subscriberClient.ping();
            return subscriberClient;
        } catch (error) {
            // Connection is dead, reset it
            console.warn("Subscriber connection lost, recreating...");
            subscriberClient = null;
            subscriberConnectionPromise = null;
        }
    }
    
    // If another subscriber is already creating a connection, wait for it
    if (subscriberConnectionPromise) {
        await subscriberConnectionPromise;
        if (subscriberClient) {
            return subscriberClient;
        }
    }
    
    // Create new subscriber only if needed (with promise to prevent race conditions)
    subscriberConnectionPromise = (async () => {
        try {
            subscriberClient = redisClient.duplicate();
            subscriberClient.on("error", (err) => console.error("Redis Subscriber Error", err));
            await subscriberClient.connect();
            console.log("✅ Redis subscriber connection created (shared by all subscribers)");
            subscriberConnectionPromise = null;
            return subscriberClient;
        } catch (error) {
            subscriberConnectionPromise = null;
            throw error;
        }
    })();
    
    return await subscriberConnectionPromise;
}

// Legacy function for backward compatibility (deprecated)
export const createSubcriber = async () => {
    return getSubscriber();
}

// Cleanup function to close subscriber when server shuts down
export const closeSubscriber = async () => {
    if (subscriberClient) {
        try {
            await subscriberClient.quit();
            console.log("✅ Redis subscriber connection closed");
        } catch (error) {
            console.error('Error closing Redis subscriber:', error);
        } finally {
            subscriberClient = null;
            subscriberConnectionPromise = null;
        }
    }
}

// Get connection info for monitoring
export const getConnectionInfo = () => {
    return {
        hasMainClient: !!redisClient,
        hasSubscriberClient: !!subscriberClient,
        totalConnections: (redisClient ? 1 : 0) + (subscriberClient ? 1 : 0)
    };
}
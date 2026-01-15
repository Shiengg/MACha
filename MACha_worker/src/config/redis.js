/**
 * Redis Configuration for Worker
 * 
 * Redis connection for pub/sub notifications
 */

import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("❌ REDIS_URL environment variable is not defined");
    if (process.env.NODE_ENV === 'production') {
        throw new Error("REDIS_URL is required in production");
    }
}

const redisOptions = {
    url: redisUrl,
    socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
        reconnectStrategy: (retries) => {
            const maxRetries = Number(process.env.REDIS_MAX_RETRIES) || 10;
            if (retries > maxRetries) {
                console.error('❌ Redis: Max reconnection attempts reached');
                return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            return delay;
        },
    },
};

let notificationPublisher = null;
let isConnecting = false;

const logRedisEvent = (event, data = {}) => {
    const timestamp = new Date().toISOString();
    switch (event) {
        case 'ready':
            console.log(`✅ [Redis] ${data.message || 'Connected'}`);
            break;
        case 'error':
            console.error(`❌ [Redis] Error: ${data.error?.message || data.message}`);
            break;
        case 'reconnecting':
            console.log(`🔄 [Redis] Reconnecting... (attempt ${data.attempt})`);
            break;
        default:
            console.log(`[Redis] ${event}:`, data);
    }
};

export const connectRedis = async () => {
    if (isConnecting && notificationPublisher?.isOpen) {
        return notificationPublisher;
    }

    if (notificationPublisher?.isOpen) {
        return notificationPublisher;
    }

    if (!redisUrl) {
        throw new Error("REDIS_URL environment variable is not defined");
    }

    isConnecting = true;

    try {
        notificationPublisher = createClient(redisOptions);
        
        notificationPublisher.on('error', (err) => {
            logRedisEvent('error', { error: err, message: 'Publisher error' });
        });

        notificationPublisher.on('connect', () => {
            logRedisEvent('ready', { message: 'Publisher connecting...' });
        });

        notificationPublisher.on('ready', () => {
            logRedisEvent('ready', { message: 'Publisher ready' });
        });

        notificationPublisher.on('reconnecting', () => {
            logRedisEvent('reconnecting', { message: 'Publisher reconnecting' });
        });

        await notificationPublisher.connect();
        
        logRedisEvent('ready', { message: 'Redis publisher connected successfully' });
        isConnecting = false;
        
        return notificationPublisher;
    } catch (error) {
        isConnecting = false;
        logRedisEvent('error', { 
            message: 'Failed to connect with Redis',
            error: error.message 
        });
        throw error;
    }
};

export const getNotificationPublisher = () => {
    if (!notificationPublisher || !notificationPublisher.isOpen) {
        throw new Error("Redis publisher not connected. Call connectRedis() first.");
    }
    return notificationPublisher;
};

export const disconnectRedis = async () => {
    if (notificationPublisher?.isOpen) {
        try {
            await notificationPublisher.quit();
            console.log("✅ Redis publisher disconnected gracefully");
            notificationPublisher = null;
        } catch (error) {
            console.error("❌ Error disconnecting Redis publisher:", error);
        }
    }
};


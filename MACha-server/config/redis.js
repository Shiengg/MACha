import { createClient } from "redis";
import dotenv from "dotenv";
import { randomUUID } from 'crypto';

dotenv.config();

export const WORKER_ID = process.env.WORKER_ID || `worker-${randomUUID().slice(0, 8)}`;

const logRedisEvent = (event, data = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        service: 'redis',
        workerId: WORKER_ID,
        event,
        ...data
    };
    
    if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(logEntry));
    } else {
        const emoji = {
            connect: '🔌',
            ready: '✅',
            reconnecting: '🔄',
            error: '❌',
            end: '⏹️',
            subscriber_created: '📡',
            subscriber_closed: '🔒'
        }[event] || 'ℹ️';
        
        console.log(`${emoji} Redis [${event}]`, data.message || '');
        if (data.error) console.error('   Error:', data.error);
    }
};
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
                logRedisEvent('error', { 
                    message: 'Max reconnection attempts reached',
                    retries 
                });
                return new Error('Max reconnection attempts reached');
            }
            
            const delay = Math.min(retries * 100, 3000);
            logRedisEvent('reconnecting', { 
                message: `Reconnecting in ${delay}ms`,
                attempt: retries,
                maxRetries 
            });
            
            return delay;
        },
    },
    
    enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE === 'true' || false,
};

export const redisClient = createClient(redisOptions);

redisClient.on('connect', () => {
    logRedisEvent('connect', { message: 'Connecting to Redis...' });
});

redisClient.on('ready', () => {
    logRedisEvent('ready', { 
        message: 'Redis connection ready',
        url: redisUrl?.replace(/:[^:]*@/, ':****@')
    });
});

redisClient.on('reconnecting', () => {
    logRedisEvent('reconnecting', { message: 'Attempting to reconnect...' });
});

redisClient.on('error', (err) => {
    logRedisEvent('error', { 
        message: 'Redis Client Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

redisClient.on('end', () => {
    logRedisEvent('end', { message: 'Redis connection ended' });
});


let isConnecting = false;
let connectionPromise = null;

export const connectRedis = async () => {
    try {
        if (isConnecting && connectionPromise) {
            return await connectionPromise;
        }
        
        if (redisClient.isOpen) {
            logRedisEvent('ready', { message: 'Redis already connected' });
            return;
        }
        
        if (!redisUrl) {
            throw new Error("REDIS_URL environment variable is not defined");
        }
        
        isConnecting = true;
        
        connectionPromise = (async () => {
            const connectPromise = redisClient.connect();
            const timeoutMs = Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000;
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Redis connection timeout after ${timeoutMs}ms`)), timeoutMs)
            );
            
            try {
                await Promise.race([connectPromise, timeoutPromise]);
                logRedisEvent('ready', { message: 'Redis connected successfully' });
            } finally {
                isConnecting = false;
                connectionPromise = null;
            }
        })();
        
        await connectionPromise;
        
    } catch (error) {
        isConnecting = false;
        connectionPromise = null;
        
        logRedisEvent('error', { 
            message: 'Failed to connect with Redis',
            error: error.message 
        });
        
        if (process.env.NODE_ENV === 'production') {
            throw error;
        } else {
            console.error("Redis connection failed. Please check:");
            console.error("1. Redis server is running");
            console.error("2. REDIS_URL is correct in .env");
            console.error("3. Network/firewall allows connection");
            process.exit(1);
        }
    }
};

let subscriberClient = null;
let subscriberConnectionPromise = null;
let isSubscriberConnecting = false;

export const getSubscriber = async () => {
    if (subscriberClient) {
        try {
            await subscriberClient.ping();
            return subscriberClient;
        } catch (error) {
            logRedisEvent('error', {
                message: 'Subscriber connection lost, recreating...',
                error: error.message
            });
            subscriberClient = null;
            subscriberConnectionPromise = null;
            isSubscriberConnecting = false;
        }
    }
    
    if (isSubscriberConnecting && subscriberConnectionPromise) {
        return await subscriberConnectionPromise;
    }
    
    isSubscriberConnecting = true;
    subscriberConnectionPromise = (async () => {
        try {
            subscriberClient = redisClient.duplicate();
            
            subscriberClient.on("error", (err) => {
                logRedisEvent('error', {
                    message: 'Redis Subscriber Error',
                    error: err.message
                });
            });
            
            subscriberClient.on("ready", () => {
                logRedisEvent('subscriber_created', {
                    message: 'Subscriber connection ready'
                });
            });
            
            await subscriberClient.connect();
            
            logRedisEvent('subscriber_created', {
                message: 'Redis subscriber connection created (shared by all subscribers)'
            });
            
            return subscriberClient;
        } catch (error) {
            logRedisEvent('error', {
                message: 'Failed to create subscriber',
                error: error.message
            });
            throw error;
        } finally {
            isSubscriberConnecting = false;
            subscriberConnectionPromise = null;
        }
    })();
    
    return await subscriberConnectionPromise;
};

export const createSubcriber = async () => {
    return getSubscriber();
};

export const closeSubscriber = async () => {
    if (subscriberClient) {
        try {
            await subscriberClient.quit();
            logRedisEvent('subscriber_closed', {
                message: 'Redis subscriber connection closed'
            });
        } catch (error) {
            logRedisEvent('error', {
                message: 'Error closing Redis subscriber',
                error: error.message
            });
        } finally {
            subscriberClient = null;
            subscriberConnectionPromise = null;
            isSubscriberConnecting = false;
        }
    }
};

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
export const disconnectRedis = async () => {
    logRedisEvent('end', { message: 'Disconnecting Redis...' });
    
    try {
        await closeSubscriber();
        
        if (redisClient.isOpen) {
            await redisClient.quit();
            logRedisEvent('end', { message: 'Redis main client closed' });
        }
    } catch (error) {
        logRedisEvent('error', {
            message: 'Error during Redis disconnect',
            error: error.message
        });
        
        try {
            if (redisClient.isOpen) {
                await redisClient.disconnect();
            }
        } catch (forceError) {
            logRedisEvent('error', {
                message: 'Error forcing Redis disconnect',
                error: forceError.message
            });
        }
    }
};

export const getRedisHealth = async () => {
    try {
        if (!redisClient.isOpen) {
            return {
                status: 'disconnected',
                connected: false,
                message: 'Redis client is not connected'
            };
        }
        
        const startTime = Date.now();
        await redisClient.ping();
        const latency = Date.now() - startTime;
        
        return {
            status: 'connected',
            connected: true,
            latency: `${latency}ms`,
            workerId: WORKER_ID
        };
    } catch (error) {
        return {
            status: 'error',
            connected: false,
            message: error.message,
            workerId: WORKER_ID
        };
    }
};

export const getConnectionInfo = () => {
    return {
        workerId: WORKER_ID,
        hasMainClient: !!redisClient,
        isMainClientOpen: redisClient?.isOpen || false,
        hasSubscriberClient: !!subscriberClient,
        isSubscriberOpen: subscriberClient?.isOpen || false,
        totalConnections: (redisClient?.isOpen ? 1 : 0) + (subscriberClient?.isOpen ? 1 : 0),
        url: redisUrl?.replace(/:[^:]*@/, ':****@')
    };
};

export const cacheSet = async (key, value, ttlSeconds = 3600) => {
    try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await redisClient.setEx(key, ttlSeconds, serialized);
    } catch (error) {
        logRedisEvent('error', {
            message: 'Cache set error',
            key,
            error: error.message
        });
        throw error;
    }
};

export const cacheGet = async (key) => {
    try {
        const data = await redisClient.get(key);
        if (!data) return null;
        
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    } catch (error) {
        logRedisEvent('error', {
            message: 'Cache get error',
            key,
            error: error.message
        });
        throw error;
    }
};

export const cacheDel = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        logRedisEvent('error', {
            message: 'Cache delete error',
            key,
            error: error.message
        });
        throw error;
    }
};

export const cacheExists = async (key) => {
    try {
        const exists = await redisClient.exists(key);
        return exists === 1;
    } catch (error) {
        logRedisEvent('error', {
            message: 'Cache exists error',
            key,
            error: error.message
        });
        throw error;
    }
};

console.log(`\n📡 Redis Module Initialized`);
console.log(`   Worker ID: ${WORKER_ID}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Offline Queue: ${redisOptions.enableOfflineQueue ? 'Enabled' : 'Disabled'}`);
console.log(`   Max Retries: ${process.env.REDIS_MAX_RETRIES || '10'}`);
console.log(`   Connect Timeout: ${process.env.REDIS_CONNECT_TIMEOUT || '10000'}ms\n`);

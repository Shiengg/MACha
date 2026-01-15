import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let connectionRetries = 0;
let currentMaxPoolSize = 50;
const MAX_RETRIES = 3;

const calculateOptimalPoolSize = () => {
    const instances = Number(process.env.INSTANCE_COUNT) || 1;
    const basePoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE) || 50;
    
    return Math.max(20, Math.floor(basePoolSize / Math.sqrt(instances)));
};

export const connectDB = async () => {
    if (isConnected) {
        if (mongoose.connection.readyState === 1) return;
        if (mongoose.connection.readyState === 2) {
            await new Promise((resolve) => {
                mongoose.connection.once('connected', resolve);
                mongoose.connection.once('error', resolve);
            });
            return;
        }
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE is not defined in the environment variables");
        process.exit(1);
    }

    let optimizedUrl = url;
    try {
        if (url.includes('://')) {
            const urlObj = new URL(url);
            const searchParams = urlObj.searchParams;
            
            if (!searchParams.has('retryWrites')) {
                searchParams.set('retryWrites', 'true');
            }
            if (!searchParams.has('retryReads')) {
                searchParams.set('retryReads', 'true');
            }
            if (process.env.NODE_ENV === 'production' && !searchParams.has('w')) {
                searchParams.set('w', 'majority');
            }
            
            optimizedUrl = urlObj.toString();
        } else {
            const separator = url.includes('?') ? '&' : '?';
            optimizedUrl = `${url}${separator}retryWrites=true&retryReads=true`;
            if (process.env.NODE_ENV === 'production') {
                optimizedUrl += '&w=majority';
            }
        }
    } catch (err) {
        console.warn('Could not parse DATABASE_URL, using as-is:', err.message);
        optimizedUrl = url;
    }

    const maxPoolSize = calculateOptimalPoolSize();
    currentMaxPoolSize = maxPoolSize;
    const minPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE) || Math.max(5, Math.floor(maxPoolSize * 0.2));

    try {
        const options = {
            maxPoolSize,
            minPoolSize,
            waitQueueTimeoutMS: Number(process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS) || 5000,
            
            maxIdleTimeMS: Number(process.env.MONGODB_MAX_IDLE_TIME_MS) || 30000,
            
            serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 5000,
            socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
            connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000,
            
            heartbeatFrequencyMS: Number(process.env.MONGODB_HEARTBEAT_FREQUENCY_MS) || 10000,
            
            readPreference: process.env.MONGODB_READ_PREFERENCE || 'primary',
            
            bufferCommands: true,
        };

        await mongoose.connect(optimizedUrl, options);
        
        setupConnectionEventHandlers();
        
        isConnected = true;
        connectionRetries = 0;
        
        const poolInfo = mongoose.connection.getClient().options;
        console.log("MongoDB connected successfully");
        console.log(`   Pool: ${minPoolSize}-${maxPoolSize} connections`);
        console.log(`   ReadyState: ${mongoose.connection.readyState} (1=connected)`);
        
    } catch (error) {
        connectionRetries++;
        console.error(`Failed to connect with MongoDB (attempt ${connectionRetries}/${MAX_RETRIES}):`, error.message);
        
        if (process.env.NODE_ENV !== 'production') {
            console.error(error);
        }
        
        // Retry với exponential backoff
        if (connectionRetries < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, connectionRetries - 1), 10000);
            console.log(`   Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return connectDB(); // Retry
        }
        
        // Sau MAX_RETRIES lần, fail fast
        console.error("Max retries reached. Exiting...");
        process.exit(1);
    }
}

/**
 * Setup connection event handlers để monitor và handle connection issues
 */
const setupConnectionEventHandlers = () => {
    const connection = mongoose.connection;
    
    connection.on('connected', () => {
        console.log('MongoDB connection: CONNECTED');
        isConnected = true;
    });
    
    connection.on('disconnected', () => {
        console.warn('MongoDB connection: DISCONNECTED');
        isConnected = false;
    });
    
    connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
        // Không exit ngay, để auto-reconnect hoạt động
    });
    
    connection.on('reconnected', () => {
        console.log('MongoDB connection: RECONNECTED');
        isConnected = true;
    });
    
    if (process.env.NODE_ENV === 'development' || process.env.MONGODB_LOG_POOL_STATS === 'true') {
        setInterval(() => {
            try {
                const poolStats = connection.db?.serverConfig?.pool;
                if (poolStats) {
                    const activeConnectionCount = poolStats.totalConnectionCount || 0;
                    const waitQueueLength = poolStats.waitQueueLength || 0;
                    if (waitQueueLength > 0 || activeConnectionCount > currentMaxPoolSize * 0.8) {
                        console.warn(`⚠️  Pool stats: active=${activeConnectionCount}/${currentMaxPoolSize}, waitQueue=${waitQueueLength}`);
                    }
                }
            } catch (err) {
                // Ignore pool stats errors (có thể không available trong một số version)
            }
        }, 30000); // Log mỗi 30s
    }
};

/**
 * Get MongoDB connection health status
 */
export const getDBHealth = () => {
    const connection = mongoose.connection;
    const readyState = connection.readyState;
    
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    return {
        status: readyState === 1 ? 'healthy' : 'unhealthy',
        readyState: readyState,
        state: states[readyState] || 'unknown',
        isConnected: readyState === 1,
        host: connection.host,
        port: connection.port,
        name: connection.name,
    };
};

export const disconnectDB = async () => {
    if (!isConnected) return;
  
    try {
        // Đóng tất cả connections một cách graceful
        await mongoose.connection.close(false);
        console.log("MongoDB connection closed gracefully");
        isConnected = false;
    } catch (error) {
        console.error("Error while closing MongoDB connection:", error);
        // Force close nếu graceful close fail
        try {
            await mongoose.connection.close(true);
        } catch (forceError) {
            console.error("Force close also failed:", forceError);
        }
    }
};


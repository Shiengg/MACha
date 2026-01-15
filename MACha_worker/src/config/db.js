/**
 * MongoDB Configuration for Worker
 * 
 * Simplified connection for worker (no need for complex pooling)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("❌ DATABASE_URL is not defined in environment variables");
        process.exit(1);
    }

    try {
        const options = {
            maxPoolSize: 10, // Worker needs fewer connections
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            bufferCommands: true,
        };

        await mongoose.connect(url, options);
        
        setupConnectionEventHandlers();
        
        isConnected = true;
        console.log("✅ MongoDB connected successfully (Worker)");
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error.message);
        process.exit(1);
    }
};

const setupConnectionEventHandlers = () => {
    const connection = mongoose.connection;
    
    connection.on('connected', () => {
        console.log('📊 MongoDB connection: CONNECTED');
        isConnected = true;
    });
    
    connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB connection: DISCONNECTED');
        isConnected = false;
    });
    
    connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
    });
    
    connection.on('reconnected', () => {
        console.log('🔄 MongoDB connection: RECONNECTED');
        isConnected = true;
    });
};

export const getDBHealth = () => {
    const connection = mongoose.connection;
    const readyState = connection.readyState;
    
    return {
        status: readyState === 1 ? 'healthy' : 'unhealthy',
        readyState: readyState,
        isConnected: readyState === 1,
    };
};

export const disconnectDB = async () => {
    if (!isConnected) return;
  
    try {
        await mongoose.connection.close(false);
        console.log("✅ MongoDB connection closed gracefully (Worker)");
        isConnected = false;
    } catch (error) {
        console.error("❌ Error closing MongoDB connection:", error);
        try {
            await mongoose.connection.close(true);
        } catch (forceError) {
            console.error("❌ Force close failed:", forceError);
        }
    }
};


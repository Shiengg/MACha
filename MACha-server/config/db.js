import mongoose from "mongoose";

const connectDB = async() => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL environment variable is not defined");
        }
        
        // Connection pool configuration for high concurrency
        const options = {
            maxPoolSize: 50, // Maximum number of connections in the pool (default: 100)
            minPoolSize: 10, // Minimum number of connections to maintain
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            serverSelectionTimeoutMS: 5000, // How long to try selecting a server before timing out
            socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timing out
        };
        
        // Disable mongoose buffering (set on mongoose, not connection options)
        mongoose.set('bufferCommands', false);
        
        await mongoose.connect(process.env.DATABASE_URL, options);
        console.log("MongoDB connected successfully");
        console.log(`Connection pool: min=${options.minPoolSize}, max=${options.maxPoolSize}`);
    } catch(error) {
        console.error("Failed to connect with MongoDB:", error.message);
        if (process.env.NODE_ENV === 'production') {
            throw error;
        } else {
            process.exit(1);
        }
    }
}

export default connectDB;
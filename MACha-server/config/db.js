import mongoose from "mongoose";

const connectDB = async() => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL environment variable is not defined");
        }
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("MongoDB connected successfully");
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
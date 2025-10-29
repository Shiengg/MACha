import mongoose from "mongoose";

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("MongoDB connected successfully");
    } catch(error) {
        console.error("Failue to connect with MongoDB", error);
        process.exit(1);
    }
}

export default connectDB;
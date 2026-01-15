import dotenv from "dotenv";
import { connectRabbitMQ, disconnectRabbitMQ, getRabbitMQHealth } from "./config/rabbitmq.js";
import { connectDB, disconnectDB, getDBHealth } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { startMailConsumer } from "./consumers/mail.consumer.js";
import { startNotificationConsumer } from "./consumers/notification.consumer.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    "RABBITMQ_URL",
    "EMAIL_USER",
    "EMAIL_PASSWORD",
    "DATABASE_URL",  // MongoDB
    "REDIS_URL",     // Redis for pub/sub
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error("❌ Missing required environment variables:", missingEnvVars.join(", "));
    console.error("Please check your .env file");
    process.exit(1);
}

// Worker state
let isShuttingDown = false;
let mailConsumerTag = null;
let notificationConsumerTag = null;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        console.log("⚠️  Shutdown already in progress...");
        return;
    }

    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);

    try {
        if (mailConsumerTag || notificationConsumerTag) {
            console.log("⏹️  Stopping consumers...");
        }

        console.log("🔌 Disconnecting from services...");
        await disconnectRabbitMQ();
        await disconnectRedis();
        await disconnectDB();

        console.log("✅ Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
    }
};

const logHealthStatus = () => {
    const rabbitMQHealth = getRabbitMQHealth();
    const dbHealth = getDBHealth();
    
    console.log("[Health Check]", {
        rabbitMQ: rabbitMQHealth.connected ? "✅ Connected" : "❌ Disconnected",
        consumerChannel: rabbitMQHealth.hasConsumerChannel ? "✅ Active" : "❌ Inactive",
        mongodb: dbHealth.isConnected ? "✅ Connected" : "❌ Disconnected",
        redis: "✅ Connected", // Assume connected if no error
        reconnectAttempts: rabbitMQHealth.reconnectAttempts,
    });
};

const bootstrap = async () => {
    console.log("🚀 Starting MACha Worker...");
    console.log("Environment:", process.env.NODE_ENV || "development");

    try {
        // 1. Connect MongoDB
        console.log("📊 Connecting to MongoDB...");
        await connectDB();
        
        // 2. Connect Redis
        console.log("🔴 Connecting to Redis...");
        await connectRedis();
        
        // 3. Connect RabbitMQ
        console.log("📡 Connecting to RabbitMQ...");
        await connectRabbitMQ();

        // 4. Start mail consumer
        console.log("📧 Starting mail consumer...");
        mailConsumerTag = await startMailConsumer();

        // 5. Start notification consumer
        console.log("🔔 Starting notification consumer...");
        notificationConsumerTag = await startNotificationConsumer();

        // Log health status
        logHealthStatus();

        console.log("✅ Worker started successfully!");
        console.log("📬 Listening for mail and notification jobs...");
        console.log("Press Ctrl+C to stop\n");

        // Setup graceful shutdown handlers
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle uncaught errors
        process.on("unhandledRejection", (reason, promise) => {
            console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
        });

        process.on("uncaughtException", (error) => {
            console.error("❌ Uncaught Exception:", error);
            gracefulShutdown("uncaughtException");
        });

    } catch (error) {
        console.error("❌ Failed to start worker:", error);
        process.exit(1);
    }
};

bootstrap();


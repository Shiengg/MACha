import dotenv from "dotenv";
import { connectRabbitMQ, disconnectRabbitMQ, getRabbitMQHealth } from "./config/rabbitmq.js";
import { startMailConsumer } from "./consumers/mail.consumer.js";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    "RABBITMQ_URL",
    "RESEND_API_KEY",
    "FROM_EMAIL",
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error("❌ Missing required environment variables:", missingEnvVars.join(", "));
    console.error("Please check your .env file");
    process.exit(1);
}

// Worker state
let isShuttingDown = false;
let consumerTag = null;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        console.log("⚠️  Shutdown already in progress...");
        return;
    }

    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);

    try {
        if (consumerTag) {
            console.log("⏹️  Stopping consumer...");
        }

        console.log("🔌 Disconnecting from RabbitMQ...");
        await disconnectRabbitMQ();

        console.log("✅ Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
    }
};

const logHealthStatus = () => {
    const health = getRabbitMQHealth();
    console.log("[Health Check]", {
        rabbitMQ: health.connected ? "✅ Connected" : "❌ Disconnected",
        consumerChannel: health.hasConsumerChannel ? "✅ Active" : "❌ Inactive",
        reconnectAttempts: health.reconnectAttempts,
    });
};

const bootstrap = async () => {
    console.log("🚀 Starting MACha Worker...");
    console.log("Environment:", process.env.NODE_ENV || "development");

    try {
        console.log("📡 Connecting to RabbitMQ...");
        await connectRabbitMQ();

        // Start mail consumer
        console.log("📧 Starting mail consumer...");
        consumerTag = await startMailConsumer();

        // Log health status
        logHealthStatus();

        console.log("✅ Worker started successfully!");
        console.log("📬 Listening for mail jobs...");
        console.log("Press Ctrl+C to stop\n");

        // Setup graceful shutdown handlers
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle uncaught errors
        process.on("unhandledRejection", (reason, promise) => {
            console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
            // Don't exit, let the process continue but log the error
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


import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

// Tạo Redis client riêng cho worker (không dùng chung với server)
const workerRedisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

workerRedisClient.on("error", (err) => console.error("❌ Worker Redis Error:", err));

async function processQueue() {
    console.log('🔄 Worker started! Listening to job_queue...');
    console.log('⏳ Waiting for jobs...\n');

    while (true) {
        try {
            const jobQueue = await workerRedisClient.brPop("job_queue", 5);

            if (!jobQueue) {
                // Timeout - không có job, tiếp tục chờ
                continue;
            }

            const jobData = jobQueue.element;
            const job = JSON.parse(jobData);

            console.log(`📦 Received job:`, job);

            if (job.type === "SIGNUP") {
                await handleSignUp(job);
            } else {
                console.log(`⚠️  Unknown job type: ${job.type}`);
            }
        } catch (error) {
            console.error('❌ Error processing job:', error);
        }
    }
}

async function handleSignUp(job) {
    try {
        console.log(`✉️  Processing signup for user ${job.userId}...`);
        
        await sendEmail(job.userId, {
            subject: "Welcome to MACha!",
            body: `Welcome ${job.username || 'User'}! Thank you for signing up.`
        });
        
        console.log(`✅ Signup job completed for user ${job.userId}\n`);
    } catch (error) {
        console.error('❌ Error processing signup job:', error);
    }
}

async function sendEmail(userId, payload) {
    // Giả lập gửi email (delay 1s)
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`   📧 Email sent to user ${userId}: "${payload.subject}"`);
    return true;
}

async function startWorker() {
    try {
        console.log('🚀 Starting Worker...');
        await workerRedisClient.connect();
        console.log('✅ Worker Redis connected successfully\n');

        await processQueue();
    } catch (error) {
        console.error('❌ Error starting worker:', error);
        process.exit(1);
    }
}

// Xử lý graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Worker shutting down gracefully...');
    await workerRedisClient.quit();
    console.log('✅ Worker stopped');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Worker shutting down gracefully...');
    await workerRedisClient.quit();
    console.log('✅ Worker stopped');
    process.exit(0);
});

startWorker();
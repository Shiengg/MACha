import { createClient } from "redis";
import dotenv from "dotenv";
import Post from "../models/post.js";
import Notification from "../models/notification.js";
import User from "../models/user.js";
import connectDB from "../config/db.js";
import * as notificationService from "../services/notification.service.js";

dotenv.config();

// Kết nối MongoDB
connectDB();

// Tạo Redis client riêng cho worker (không dùng chung với server)
const workerRedisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

workerRedisClient.on("error", (err) => console.error("❌ Worker Redis Error:", err));

// Tạo Redis Publisher để gửi notification events
const notificationPublisher = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

notificationPublisher.on("error", (err) => console.error("❌ Notification Publisher Error:", err));

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

            switch (job.type) {
                case "SIGNUP":
                    await handleSignUp(job);
                    break;
                case "CAMPAIGN_CREATED":
                    await handleCampaignCreated(job);
                    break;
                case "POST_LIKED":
                    await handlePostLiked(job);
                    break;
                case "COMMENT_ADDED":
                    await handleCommentAdded(job);
                    break;
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

async function handleCampaignCreated(job) {
    try {
        console.log(`✉️  Processing campaign created for campaign ${job.campaignId}...`);

        await sendEmail(job.userId, {
            subject: "Campaign Created",
            body: `Your campaign has been created successfully by ${job.userId}. You can now start fundraising.`
        });
    } catch (error) {
        console.error('❌ Error processing campaign created job:', error);
    }
}

async function handlePostLiked(job) {
    try {
        console.log(`❤️  Processing POST_LIKED for post ${job.postId}...`);
        
        // 1. Lấy thông tin post để biết author
        const post = await Post.findById(job.postId)
            .populate('user', '_id username avatar')
            .select('user content_text');
        
        if (!post) {
            console.log('⚠️  Post not found');
            return;
        }
        
        // 2. Lấy thông tin người like
        const liker = await User.findById(job.userId).select('username avatar');
        
        if (!liker) {
            console.log('⚠️  Liker not found');
            return;
        }
        
        // 3. Không tạo notification nếu tự like bài viết của mình
        if (post.user._id.toString() === job.userId) {
            console.log('👤 User liked their own post, skip notification');
            return;
        }
        
        // 4. Tạo notification trong database
        const notification = await notificationService.createNotification({
            receiver: post.user._id,
            sender: job.userId,
            type: 'like',
            post: job.postId,
            message: `đã thích bài viết của bạn`,
            is_read: false
        });
        
        console.log(`✅ Notification created: ${notification._id}`);
        
        // 5. Publish event để server emit vào room
        await notificationPublisher.publish('notification:new', JSON.stringify({
            recipientId: post.user._id.toString(),
            notification: {
                _id: notification._id,
                type: 'like',
                message: `${liker.username} đã thích bài viết của bạn`,
                sender: {
                    _id: liker._id,
                    username: liker.username,
                    avatar: liker.avatar
                },
                post: {
                    _id: post._id,
                    content_text: post.content_text.substring(0, 50) + (post.content_text.length > 50 ? '...' : '')
                },
                is_read: false,
                createdAt: notification.createdAt
            }
        }));
        
        console.log(`📬 Published notification event for user ${post.user._id}\n`);
        
    } catch (error) {
        console.error('❌ Error processing POST_LIKED job:', error);
    }
}

async function handleCommentAdded(job) {
    try {
        const post = await Post.findById(job.postId)
            .populate('user', '_id username avatar')
            .select('user content_text');
        
        if (!post) {
            console.log('⚠️  Post not found');
            return;
        }
        
        const userComment = await User.findById(job.userId).select('username avatar');

        if (!userComment) {
            console.log('⚠️  User comment not found');
            return;
        }

        const notification = await notificationService.createNotification({
            receiver: post.user._id,
            sender: job.userId,
            type: 'comment',
            post: job.postId,
            message: `đã bình luận vào bài viết của bạn`,
            is_read: false
        });

        await notificationPublisher.publish('notification:new', JSON.stringify({
            recipientId: post.user._id.toString(),
            notification: {
                _id: notification._id,
                type: 'comment',
                message: ` đã bình luận vào bài viết của bạn`,
                sender: {
                    _id: userComment._id,
                    username: userComment.username,
                    avatar: userComment.avatar
                },
                post: {
                    _id: post._id,
                    content_text: post.content_text.substring(0, 50) + (post.content_text.length > 50 ? '...' : '')
                },
                is_read: false,
                createdAt: notification.createdAt
            }
        }));

    } catch (error) {
        console.error('❌ Error processing COMMENT_ADDED job:', error);
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
        console.log('✅ Worker Redis connected successfully');
        
        await notificationPublisher.connect();
        console.log('✅ Notification Publisher connected successfully\n');

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
    await notificationPublisher.quit();
    console.log('✅ Worker stopped');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Worker shutting down gracefully...');
    await workerRedisClient.quit();
    await notificationPublisher.quit();
    console.log('✅ Worker stopped');
    process.exit(0);
});

startWorker();
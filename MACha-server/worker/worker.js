import { createClient } from "redis";
import dotenv from "dotenv";
import Post from "../models/post.js";
import Notification from "../models/notification.js";
import User from "../models/user.js";
import Campaign from "../models/campaign.js";
import connectDB from "../config/db.js";
import * as notificationService from "../services/notification.service.js";
import * as mailerService from "../utils/mailer.js";

dotenv.config();

// Kết nối MongoDB
connectDB();

// Tạo Redis client riêng cho worker (không dùng chung với server)
const workerRedisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

workerRedisClient.on("error", (err) => console.error("Worker Redis Error:", err));

// Tạo Redis Publisher để gửi notification events
const notificationPublisher = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

notificationPublisher.on("error", (err) => console.error("Notification Publisher Error:", err));

async function processQueue() {

    while (true) {
        try {
            const jobQueue = await workerRedisClient.brPop("job_queue", 5);

            if (!jobQueue) {
                // Timeout - không có job, tiếp tục chờ
                continue;
            }

            const jobData = jobQueue.element;
            const job = JSON.parse(jobData);


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
                case "CAMPAIGN_APPROVED":
                    await handleCampaignApproved(job);
                    break;
                case "CAMPAIGN_REJECTED":
                    await handleCampaignRejected(job);
                    break;
                case "SEND_OTP":
                    await handleSendOtp(job);
                    break;
                case "SEND_FORGOT_PASSWORD":
                    await handleSendForgotPassword(job);
                    break;
                case "USER_FOLLOWED":
                    await handleUserFollowed(job);
                    break;
            }
        } catch (error) {
            console.error('Error processing job:', error);
        }
    }
}

async function handleCampaignCreated(job) {
    try {
    } catch (error) {
        console.error('Error processing campaign created job:', error);
    }
}

async function handlePostLiked(job) {
    try {
        const post = await Post.findById(job.postId)
            .populate('user', '_id username avatar')
            .select('user content_text');

        if (!post) {
            console.log('Post not found');
            return;
        }

        // 2. Lấy thông tin người like
        const liker = await User.findById(job.userId).select('username avatar');

        if (!liker) {
            console.log('Liker not found');
            return;
        }

        // 3. Không tạo notification nếu tự like bài viết của mình
        if (post.user._id.toString() === job.userId) {
            console.log('User liked their own post, skip notification');
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

    } catch (error) {
        console.error('Error processing POST_LIKED job:', error);
    }
}

async function handleCommentAdded(job) {
    try {
        const post = await Post.findById(job.postId)
            .populate('user', '_id username avatar')
            .select('user content_text');

        if (!post) {
            console.log('Post not found');
            return;
        }

        const userComment = await User.findById(job.userId).select('username avatar');

        if (!userComment) {
            console.log('User comment not found');
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
        console.error('Error processing COMMENT_ADDED job:', error);
    }
}

async function handleCampaignApproved(job) {
    try {
        const campaign = await Campaign.findById(job.campaignId)
            .select('title creator');

        if (!campaign) {
            console.log('Campaign not found');
            return;
        }

        // 2. Lấy thông tin creator (người nhận notification + email)
        const creator = await User.findById(job.creatorId)
            .select('username avatar email');

        if (!creator) {
            console.log('Creator not found');
            return;
        }

        // 3. Lấy thông tin admin (người gửi notification)
        const admin = await User.findById(job.adminId)
            .select('username avatar');

        if (!admin) {
            console.log('Admin not found');
            return;
        }

        // 4. Tạo notification trong database
        const notification = await notificationService.createNotification({
            receiver: creator._id,
            sender: admin._id,
            type: 'campaign_approved',
            campaign: job.campaignId,
            message: `Chiến dịch "${campaign.title}" của bạn đã được phê duyệt`,
            is_read: false
        });

        await notificationPublisher.publish('notification:new', JSON.stringify({
            recipientId: creator._id.toString(),
            notification: {
                _id: notification._id,
                type: 'campaign_approved',
                message: `Chiến dịch "${campaign.title}" của bạn đã được phê duyệt`,
                sender: {
                    _id: admin._id,
                    username: admin.username,
                    avatar: admin.avatar
                },
                campaign: {
                    _id: campaign._id,
                    title: campaign.title,
                },
                is_read: false,
                createdAt: notification.createdAt
            },
        }));

        if (creator.email) {
            await mailerService.sendCampaignApprovedEmail(creator.email, {
                username: creator.username,
                campaignTitle: campaign.title,
                campaignId: campaign._id.toString()
            });
        }
    } catch (error) {
        console.error('Error processing CAMPAIGN_APPROVED job:', error);
    }
}

async function handleCampaignRejected(job) {
    try {
        const campaign = await Campaign.findById(job.campaignId)
            .select('title creator');

        if (!campaign) {
            console.log('Campaign not found');
            return;
        }

        // 2. Lấy thông tin creator (người nhận notification + email)
        const creator = await User.findById(job.creatorId)
            .select('username avatar email');

        if (!creator) {
            console.log('Creator not found');
            return;
        }

        // 3. Lấy thông tin admin (người gửi notification)
        const admin = await User.findById(job.adminId)
            .select('username avatar');

        if (!admin) {
            console.log('Admin not found');
            return;
        }

        // 4. Tạo notification trong database
        const notification = await notificationService.createNotification({
            receiver: creator._id,
            sender: admin._id,
            type: 'campaign_rejected',
            campaign: job.campaignId,
            message: `Chiến dịch "${campaign.title}" không được phê duyệt`,
            is_read: false
        });

        await notificationPublisher.publish('notification:new', JSON.stringify({
            recipientId: creator._id.toString(),
            notification: {
                _id: notification._id,
                type: 'campaign_rejected',
                message: `Chiến dịch "${campaign.title}" không được phê duyệt`,
                sender: {
                    _id: admin._id,
                    username: admin.username,
                    avatar: admin.avatar
                },
                campaign: {
                    _id: campaign._id,
                    title: campaign.title,
                },
                is_read: false,
                createdAt: notification.createdAt
            },
        }));

        if (creator.email) {
            await sendCampaignRejectedEmail(creator.email, {
                username: creator.username,
                campaignTitle: campaign.title,
                campaignId: campaign._id.toString(),
                reason: job.reason || 'Không có lý do cụ thể'
            });

        }
    } catch (error) {
        console.error('Error processing CAMPAIGN_REJECTED job:', error);
    }
}

async function handleSendOtp(job) {
    try {
        await mailerService.sendOtpEmail(job.email, {
            username: job.username,
            otp: job.otp,
            expiresIn: job.expiresIn
        });
    } catch (error) {
        console.error('Error processing SEND_OTP job:', error);
    }
}

async function handleSendForgotPassword(job) {
    try {
        await mailerService.sendForgotPasswordEmail(job.email, {
            username: job.username,
            newPassword: job.newPassword
        });
    } catch (error) {
        console.error('Error processing SEND_FORGOT_PASSWORD job:', error);
    }
}

async function handleUserFollowed(job) {
    try {
        const follower = await User.findById(job.followerId).select('username avatar');
        const targetUser = await User.findById(job.targetUserId).select('username avatar');

        if (!follower || !targetUser) {
            console.log('Follower or target user not found');
            return;
        }

        const notification = await notificationService.createNotification({
            receiver: targetUser._id,
            sender: follower._id,
            type: 'follow',
            message: 'đã theo dõi bạn',
            is_read: false
        });

        await notificationPublisher.publish('notification:new', JSON.stringify({
            recipientId: targetUser._id.toString(),
            notification: {
                _id: notification._id,
                type: 'follow',
                message: 'đã theo dõi bạn',
                sender: {
                    _id: follower._id,
                    username: follower.username,
                    avatar: follower.avatar
                },
                is_read: false,
                createdAt: notification.createdAt
            }
        }));
    } catch (error) {
        console.error('Error processing USER_FOLLOWED job:', error);
    }
}

async function startWorker() {
    try {
        await workerRedisClient.connect();
        await notificationPublisher.connect();

        // await verifyConnection();

        await processQueue();
    } catch (error) {
        console.error('Error starting worker:', error);
        process.exit(1);
    }
}

// Xử lý graceful shutdown
process.on('SIGINT', async () => {
    await workerRedisClient.quit();
    await notificationPublisher.quit();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await workerRedisClient.quit();
    await notificationPublisher.quit();
    process.exit(0);
});

startWorker();
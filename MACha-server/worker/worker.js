import { createClient } from "redis";
import dotenv from "dotenv";
import Post from "../models/post.js";
import Notification from "../models/notification.js";
import User from "../models/user.js";
import Campaign from "../models/campaign.js";
import Event from "../models/event.js";
import EventRSVP from "../models/eventRSVP.js";
import Donation from "../models/donation.js";
import mongoose from "mongoose";
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
                case "SEND_OTP_SIGNUP":
                    await handleSendOtpSignup(job);
                    break;
                case "SEND_FORGOT_PASSWORD":
                    await handleSendForgotPassword(job);
                    break;
                case "USER_FOLLOWED":
                    await handleUserFollowed(job);
                    break;
                case "SEND_KYC_APPROVED":
                    await handleSendKycApproved(job);
                    break;
                case "POST_REMOVED":
                    await handlePostRemoved(job);
                    break;
                case "USER_WARNED":
                    await handleUserWarned(job);
                    break;
                case "EVENT_UPDATE_CREATED":
                    await handleEventUpdateCreated(job);
                    break;
                case "EVENT_REMOVED":
                    await handleEventRemoved(job);
                    break;
                case "CAMPAIGN_REMOVED":
                    await handleCampaignRemoved(job);
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

        const liker = await User.findById(job.userId).select('username avatar');

        if (!liker) {
            console.log('Liker not found');
            return;
        }

        if (post.user._id.toString() === job.userId) {
            console.log('User liked their own post, skip notification');
            return;
        }
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

        const creator = await User.findById(job.creatorId)
            .select('username avatar email');

        if (!creator) {
            console.log('Creator not found');
            return;
        }

        const admin = await User.findById(job.adminId)
            .select('username avatar');

        if (!admin) {
            console.log('Admin not found');
            return;
        }
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

        const creator = await User.findById(job.creatorId)
            .select('username avatar email');

        if (!creator) {
            console.log('Creator not found');
            return;
        }

        const admin = await User.findById(job.adminId)
            .select('username avatar');

        if (!admin) {
            console.log('Admin not found');
            return;
        }
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
            await mailerService.sendCampaignRejectedEmail(creator.email, {
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
                    fullname: follower.fullname,
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

async function handleSendOtpSignup(job) {
    try {
        await mailerService.sendOtpSignupEmail(job.email, {
            username: job.username,
            otp: job.otp,
            expiresIn: job.expiresIn
        });
    } catch (error) {
        console.error('Error processing SEND_OTP_SIGNUP job:', error);
    }
}

async function handleSendKycApproved(job) {
    try {
        await mailerService.sendKycApprovedEmail(job.email, {
            username: job.username,
        });
    }
    catch (error) {
        console.error('Error processing SEND_KYC_APPROVED job:', error);
    }
}

async function handlePostRemoved(job) {
    try {
        const post = await Post.findById(job.postId)
            .populate('user', '_id username avatar')
            .select('user content_text');

        if (!post) {
            console.log('Post not found');
            return;
        }

        const creator = post.user;

        if (!creator) {
            console.log('Creator not found');
            return;
        }

        let admin = null;
        if (job.adminId) {
            admin = await User.findById(job.adminId).select('username avatar');
        }

        const notification = await notificationService.createNotification({
            receiver: creator._id,
            sender: admin ? admin._id : null,
            type: 'post_removed',
            post: job.postId,
            message: 'Nội dung bài viết của bạn bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha',
            is_read: false
        });

        await notificationPublisher.publish('notification:new', JSON.stringify({
            recipientId: creator._id.toString(),
            notification: {
                _id: notification._id,
                type: 'post_removed',
                message: 'Nội dung bài viết của bạn bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha',
                sender: admin ? {
                    _id: admin._id,
                    username: admin.username,
                    avatar: admin.avatar
                } : null,
                post: {
                    _id: post._id,
                    content_text: post.content_text.substring(0, 50) + (post.content_text.length > 50 ? '...' : '')
                },
                is_read: false,
                createdAt: notification.createdAt
            }
        }));

    } catch (error) {
        console.error('Error processing POST_REMOVED job:', error);
    }
}

async function handleUserWarned(job) {
    try {
        const userId = job.userId;
        
        if (!userId) {
            console.log('User ID not found in job');
            return;
        }

        const user = await User.findById(userId).select('_id username avatar');

        if (!user) {
            console.log('User not found');
            return;
        }

        let admin = null;
        if (job.adminId) {
            admin = await User.findById(job.adminId).select('username avatar');
        }

        const notification = await notificationService.createNotification({
            receiver: user._id,
            sender: admin ? admin._id : null,
            type: 'user_warned',
            message: 'Tài khoản của bạn đã nhận một cảnh báo từ quản trị viên',
            content: job.resolutionDetails || 'Bạn đã vi phạm quy định của cộng đồng MACha. Vui lòng tuân thủ các quy định để tránh bị khóa tài khoản.',
            is_read: false
        });

        await notificationPublisher.publish('notification:new', JSON.stringify({
            recipientId: user._id.toString(),
            notification: {
                _id: notification._id,
                type: 'user_warned',
                message: 'Tài khoản của bạn đã nhận một cảnh báo từ quản trị viên',
                content: job.resolutionDetails || 'Bạn đã vi phạm quy định của cộng đồng MACha. Vui lòng tuân thủ các quy định để tránh bị khóa tài khoản.',
                sender: admin ? {
                    _id: admin._id,
                    username: admin.username,
                    avatar: admin.avatar
                } : null,
                is_read: false,
                createdAt: notification.createdAt
            }
        }));

    } catch (error) {
        console.error('Error processing USER_WARNED job:', error);
    }
}

async function handleEventUpdateCreated(job) {
    try {
        const { eventId, userId, updateContent, eventTitle } = job;

        if (!eventId || !userId) {
            console.log('Event ID or User ID not found in job');
            return;
        }

        const event = await Event.findById(eventId).select('title');
        if (!event) {
            console.log('Event not found');
            return;
        }

        const author = await User.findById(userId).select('username avatar');
        if (!author) {
            console.log('Author not found');
            return;
        }

        const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
            ? new mongoose.Types.ObjectId(eventId) 
            : eventId;
        
        const rsvps = await EventRSVP.find({
            event: eventObjectId,
            status: { $in: ['going', 'interested'] }
        }).select('user').lean();
        
        const userIds = rsvps.map(rsvp => rsvp.user.toString()).filter(id => id !== userId.toString());
        
        if (userIds.length === 0) {
            console.log('No RSVP users to notify');
            return;
        }

        const notifications = userIds.map(receiverId => ({
            receiver: receiverId,
            sender: userId,
            type: 'event_update',
            event: eventId,
            message: `Sự kiện "${event.title}" có cập nhật mới`,
            content: updateContent || 'Có cập nhật mới về sự kiện',
            is_read: false
        }));
        
        // Create notifications in database
        const createdNotifications = await Promise.all(
            notifications.map(notif => notificationService.createNotification(notif))
        );
        
        // Publish notifications to Redis for real-time delivery
        for (let i = 0; i < createdNotifications.length; i++) {
            try {
                const notification = createdNotifications[i];
                await notificationPublisher.publish('notification:new', JSON.stringify({
                    recipientId: userIds[i],
                    notification: {
                        _id: notification._id.toString(),
                        type: 'event_update',
                        message: notifications[i].message,
                        sender: {
                            _id: userId.toString(),
                            username: author.username,
                            avatar: author.avatar
                        },
                        event: {
                            _id: eventId.toString(),
                            title: event.title
                        },
                        is_read: false,
                        createdAt: notification.createdAt
                    }
                }));
            } catch (notifError) {
                console.error('Error publishing notification:', notifError);
            }
        }

        console.log(`✅ Created ${createdNotifications.length} notifications for event update: ${eventId}`);
    } catch (error) {
        console.error('Error processing EVENT_UPDATE_CREATED job:', error);
    }
}

async function handleEventRemoved(job) {
    try {
        const event = await Event.findById(job.eventId)
            .populate('creator', '_id username avatar')
            .select('creator title');

        if (!event) {
            console.log('Event not found');
            return;
        }

        const creator = event.creator;

        if (!creator) {
            console.log('Creator not found');
            return;
        }

        let admin = null;
        if (job.adminId) {
            admin = await User.findById(job.adminId).select('username avatar');
        }

        const eventObjectId = mongoose.Types.ObjectId.isValid(job.eventId) 
            ? new mongoose.Types.ObjectId(job.eventId) 
            : job.eventId;
        
        const rsvps = await EventRSVP.find({
            event: eventObjectId,
            status: { $in: ['going', 'interested'] }
        }).select('user').lean();
        
        const userIds = rsvps.map(rsvp => rsvp.user.toString());
        const creatorId = creator._id.toString();
        
        const allUserIds = [...new Set([creatorId, ...userIds])];
        
        const notifications = allUserIds.map(receiverId => {
            const isCreator = receiverId === creatorId;
            return {
                receiver: receiverId,
                sender: admin ? admin._id : null,
                type: 'event_removed',
                event: job.eventId,
                message: isCreator 
                    ? `Sự kiện "${event.title}" của bạn đã bị hủy do vi phạm Tiêu chuẩn của MACha`
                    : `Sự kiện "${event.title}" mà bạn đã tham gia/quan tâm đã bị hủy`,
                content: job.resolutionDetails || (isCreator 
                    ? 'Sự kiện của bạn đã bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha'
                    : 'Sự kiện đã bị hủy do vi phạm Tiêu chuẩn của MACha'),
                is_read: false
            };
        });
        
        const createdNotifications = await Promise.all(
            notifications.map(notif => notificationService.createNotification(notif))
        );
        
        for (let i = 0; i < createdNotifications.length; i++) {
            try {
                const notification = createdNotifications[i];
                const isCreator = allUserIds[i] === creatorId;
                await notificationPublisher.publish('notification:new', JSON.stringify({
                    recipientId: allUserIds[i],
                    notification: {
                        _id: notification._id.toString(),
                        type: 'event_removed',
                        message: notifications[i].message,
                        content: notifications[i].content,
                        sender: admin ? {
                            _id: admin._id,
                            username: admin.username,
                            avatar: admin.avatar
                        } : null,
                        event: {
                            _id: event._id.toString(),
                            title: event.title
                        },
                        is_read: false,
                        createdAt: notification.createdAt
                    }
                }));
            } catch (notifError) {
                console.error('Error publishing notification:', notifError);
            }
        }

        console.log(`✅ Created ${createdNotifications.length} notifications for event removed: ${job.eventId}`);
    } catch (error) {
        console.error('Error processing EVENT_REMOVED job:', error);
    }
}

async function handleCampaignRemoved(job) {
    try {
        const campaign = await Campaign.findById(job.campaignId)
            .populate('creator', '_id username avatar email')
            .select('creator title');

        if (!campaign) {
            console.log('Campaign not found');
            return;
        }

        const creator = campaign.creator;

        if (!creator) {
            console.log('Creator not found');
            return;
        }

        let admin = null;
        if (job.adminId) {
            admin = await User.findById(job.adminId).select('username avatar');
        }

        const campaignObjectId = mongoose.Types.ObjectId.isValid(job.campaignId) 
            ? new mongoose.Types.ObjectId(job.campaignId) 
            : job.campaignId;
        
        // Get all donors who have completed donations
        const donations = await Donation.find({
            campaign: campaignObjectId,
            payment_status: 'completed'
        }).select('donor').lean();
        
        const donorIds = [...new Set(donations.map(donation => donation.donor.toString()))];
        const creatorId = creator._id.toString();
        
        // Remove creator from donor list (creator will receive email, not notification)
        const donorIdsOnly = donorIds.filter(id => id !== creatorId);
        
        // Create notifications for all donors (excluding creator)
        const notifications = donorIdsOnly.map(donorId => ({
            receiver: donorId,
            sender: admin ? admin._id : null,
            type: 'campaign_removed',
            campaign: job.campaignId,
            message: `Chiến dịch "${campaign.title}" mà bạn đã ủng hộ đã bị hủy`,
            content: job.resolutionDetails || 'Chiến dịch đã bị hủy do vi phạm Tiêu chuẩn của MACha',
            is_read: false
        }));
        
        const createdNotifications = await Promise.all(
            notifications.map(notif => notificationService.createNotification(notif))
        );
        
        // Publish notifications to Redis for real-time updates
        for (let i = 0; i < createdNotifications.length; i++) {
            try {
                const notification = createdNotifications[i];
                await notificationPublisher.publish('notification:new', JSON.stringify({
                    recipientId: donorIdsOnly[i],
                    notification: {
                        _id: notification._id.toString(),
                        type: 'campaign_removed',
                        message: notifications[i].message,
                        content: notifications[i].content,
                        sender: admin ? {
                            _id: admin._id,
                            username: admin.username,
                            avatar: admin.avatar
                        } : null,
                        campaign: {
                            _id: campaign._id.toString(),
                            title: campaign.title
                        },
                        is_read: false,
                        createdAt: notification.createdAt
                    }
                }));
            } catch (notifError) {
                console.error('Error publishing notification:', notifError);
            }
        }

        // Send email to creator
        if (creator.email) {
            try {
                await mailerService.sendCampaignRemovedEmail(creator.email, {
                    username: creator.username || 'Bạn',
                    campaignTitle: campaign.title,
                    campaignId: job.campaignId,
                    resolutionDetails: job.resolutionDetails || 'Chiến dịch của bạn đã bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha'
                });
                console.log(`✅ Sent campaign removed email to creator: ${creator.email}`);
            } catch (emailError) {
                console.error('Error sending email to creator:', emailError);
            }
        } else {
            console.log('Creator does not have email address');
        }

        console.log(`✅ Created ${createdNotifications.length} notifications for campaign removed: ${job.campaignId}`);
    } catch (error) {
        console.error('Error processing CAMPAIGN_REMOVED job:', error);
    }
}

async function startWorker() {
    try {
        await workerRedisClient.connect();
        await notificationPublisher.connect();

        await mailerService.verifyConnection();

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
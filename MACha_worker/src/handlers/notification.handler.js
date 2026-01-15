/**
 * Notification Handler for Worker
 * 
 * Handles different notification job types from queue
 * 
 * Uses standardized job format: { jobId, type, payload, meta }
 * Extracts data from job.payload
 */

import mongoose from "mongoose";
import * as notificationService from "../services/notification.service.js";
import { JOB_TYPES } from "../schemas/job.schema.js";

export const handleNotificationJob = async (job) => {
    if (!job || !job.type || !job.payload) {
        throw new Error("Invalid job: must have type and payload");
    }

    const { type, payload } = job;

    switch (type) {
        case JOB_TYPES.POST_LIKED:
            return await handlePostLiked(payload);
            
        case JOB_TYPES.COMMENT_ADDED:
            return await handleCommentAdded(payload);
            
        case JOB_TYPES.USER_FOLLOWED:
            return await handleUserFollowed(payload);
            
        case JOB_TYPES.POST_REMOVED:
            return await handlePostRemoved(payload);
            
        case JOB_TYPES.USER_WARNED:
            return await handleUserWarned(payload);
            
        case JOB_TYPES.EVENT_UPDATE_CREATED:
            return await handleEventUpdateCreated(payload);
            
        case JOB_TYPES.EVENT_REMOVED:
            return await handleEventRemoved(payload);
            
        case JOB_TYPES.CAMPAIGN_CREATED:
            // Empty handler - skip
            return { success: true, skipped: true };
            
        default:
            throw new Error(`Unknown notification job type: ${type}`);
    }
};

// Helper to get model (for fallback DB queries)
const getModel = (modelName) => {
    try {
        return mongoose.model(modelName);
    } catch (error) {
        // Model not registered, try to import
        console.warn(`[Notification Handler] Model ${modelName} not found. Make sure models are registered.`);
        return null;
    }
};

// POST_LIKED handler
const handlePostLiked = async (payload) => {
    const { postId, userId, postOwnerId } = payload;
    
    // If server passes postOwnerId directly, use it (recommended)
    if (postOwnerId) {
        // Skip if user liked their own post
        if (postOwnerId.toString() === userId) {
            return { success: true, skipped: true };
        }
        
        await notificationService.createNotification({
            receiver: postOwnerId,
            sender: userId,
            type: 'like',
            post: postId,
            message: `đã thích bài viết của bạn`,
            is_read: false
        });
        
        return { success: true };
    }
    
    // Fallback: Query DB if postOwnerId not provided
    const Post = getModel("Post");
    if (!Post) {
        throw new Error("Post model not available. Please provide postOwnerId in job payload.");
    }
    
    const post = await Post.findById(postId)
        .populate('user', '_id username avatar')
        .select('user content_text');
    
    if (!post) {
        console.log('[Notification Handler] Post not found:', postId);
        return { success: false, error: 'POST_NOT_FOUND' };
    }
    
    const liker = await getModel("User")?.findById(userId).select('username avatar');
    if (!liker) {
        console.log('[Notification Handler] Liker not found:', userId);
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    // Skip if user like chính post của mình
    if (post.user._id.toString() === userId) {
        return { success: true, skipped: true };
    }
    
    // Create notification
    await notificationService.createNotification({
        receiver: post.user._id,
        sender: userId,
        type: 'like',
        post: postId,
        message: `đã thích bài viết của bạn`,
        is_read: false
    });
    
    return { success: true };
};

// COMMENT_ADDED handler
const handleCommentAdded = async (payload) => {
    const { postId, userId, postOwnerId } = payload;
    
    // If server passes postOwnerId directly, use it (recommended)
    if (postOwnerId) {
        await notificationService.createNotification({
            receiver: postOwnerId,
            sender: userId,
            type: 'comment',
            post: postId,
            message: `đã bình luận vào bài viết của bạn`,
            is_read: false
        });
        
        return { success: true };
    }
    
    // Fallback: Query DB
    const Post = getModel("Post");
    if (!Post) {
        throw new Error("Post model not available. Please provide postOwnerId in job payload.");
    }
    
    const post = await Post.findById(postId)
        .populate('user', '_id username avatar')
        .select('user content_text');
    
    if (!post) {
        console.log('[Notification Handler] Post not found:', postId);
        return { success: false, error: 'POST_NOT_FOUND' };
    }
    
    const userComment = await getModel("User")?.findById(userId).select('username avatar');
    if (!userComment) {
        console.log('[Notification Handler] User comment not found:', userId);
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    await notificationService.createNotification({
        receiver: post.user._id,
        sender: userId,
        type: 'comment',
        post: postId,
        message: `đã bình luận vào bài viết của bạn`,
        is_read: false
    });
    
    return { success: true };
};

// USER_FOLLOWED handler
const handleUserFollowed = async (payload) => {
    const { followerId, targetUserId } = payload;
    
    // Both IDs should be provided by server
    if (!followerId || !targetUserId) {
        throw new Error("followerId and targetUserId are required");
    }
    
    await notificationService.createNotification({
        receiver: targetUserId,
        sender: followerId,
        type: 'follow',
        message: 'đã theo dõi bạn',
        is_read: false
    });
    
    return { success: true };
};

// POST_REMOVED handler
const handlePostRemoved = async (payload) => {
    const { postId, userId, adminId } = payload;
    
    // If server passes userId (post owner) directly, use it
    if (userId) {
        await notificationService.createNotification({
            receiver: userId,
            sender: adminId || null,
            type: 'post_removed',
            post: postId,
            message: 'Nội dung bài viết của bạn bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha',
            is_read: false
        });
        
        return { success: true };
    }
    
    // Fallback: Query DB
    const Post = getModel("Post");
    if (!Post) {
        throw new Error("Post model not available. Please provide userId (post owner) in job payload.");
    }
    
    const post = await Post.findById(postId)
        .populate('user', '_id username avatar')
        .select('user content_text');
    
    if (!post) {
        console.log('[Notification Handler] Post not found:', postId);
        return { success: false, error: 'POST_NOT_FOUND' };
    }
    
    const creator = post.user;
    if (!creator) {
        console.log('[Notification Handler] Creator not found');
        return { success: false, error: 'CREATOR_NOT_FOUND' };
    }
    
    let admin = null;
    if (adminId) {
        admin = await getModel("User")?.findById(adminId).select('username avatar');
    }
    
    await notificationService.createNotification({
        receiver: creator._id,
        sender: admin ? admin._id : null,
        type: 'post_removed',
        post: postId,
        message: 'Nội dung bài viết của bạn bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha',
        is_read: false
    });
    
    return { success: true };
};

// USER_WARNED handler
const handleUserWarned = async (payload) => {
    const { userId, adminId, resolutionDetails } = payload;
    
    if (!userId) {
        throw new Error("userId is required");
    }
    
    await notificationService.createNotification({
        receiver: userId,
        sender: adminId || null,
        type: 'user_warned',
        message: 'Tài khoản của bạn đã nhận một cảnh báo từ quản trị viên',
        content: resolutionDetails || 'Bạn đã vi phạm quy định của cộng đồng MACha. Vui lòng tuân thủ các quy định để tránh bị khóa tài khoản.',
        is_read: false
    });
    
    return { success: true };
};

// EVENT_UPDATE_CREATED handler
const handleEventUpdateCreated = async (payload) => {
    const { eventId, userId, updateContent, eventTitle, rsvpUserIds } = payload;
    
    if (!eventId || !userId) {
        throw new Error("eventId and userId are required");
    }
    
    // If server passes rsvpUserIds directly, use it (recommended)
    if (rsvpUserIds && Array.isArray(rsvpUserIds)) {
        const userIds = rsvpUserIds.filter(id => id.toString() !== userId.toString());
        
        if (userIds.length === 0) {
            return { success: true, skipped: true };
        }
        
        const notifications = userIds.map(receiverId => ({
            receiver: receiverId,
            sender: userId,
            type: 'event_update',
            event: eventId,
            message: `Sự kiện "${eventTitle || 'có tên'}" có cập nhật mới`,
            content: updateContent || 'Có cập nhật mới về sự kiện',
            is_read: false
        }));
        
        // Create notifications in database
        await Promise.all(
            notifications.map(notif => notificationService.createNotification(notif))
        );
        
        return { success: true, count: notifications.length };
    }
    
    // Fallback: Query DB
    const EventRSVP = getModel("EventRSVP");
    if (!EventRSVP) {
        throw new Error("EventRSVP model not available. Please provide rsvpUserIds in job payload.");
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
        return { success: true, skipped: true };
    }
    
    const Event = getModel("Event");
    const event = await Event?.findById(eventId).select('title');
    const eventTitleFinal = eventTitle || event?.title || 'có tên';
    
    const notifications = userIds.map(receiverId => ({
        receiver: receiverId,
        sender: userId,
        type: 'event_update',
        event: eventId,
        message: `Sự kiện "${eventTitleFinal}" có cập nhật mới`,
        content: updateContent || 'Có cập nhật mới về sự kiện',
        is_read: false
    }));
    
    // Create notifications in database
    await Promise.all(
        notifications.map(notif => notificationService.createNotification(notif))
    );
    
    return { success: true, count: notifications.length };
};

// EVENT_REMOVED handler
const handleEventRemoved = async (payload) => {
    const { eventId, adminId, resolutionDetails, creatorId, rsvpUserIds, eventTitle } = payload;
    
    if (!eventId) {
        throw new Error("eventId is required");
    }
    
    // If server passes creatorId and rsvpUserIds directly, use it (recommended)
    if (creatorId && rsvpUserIds && Array.isArray(rsvpUserIds)) {
        const allUserIds = [...new Set([creatorId.toString(), ...rsvpUserIds.map(id => id.toString())])];
        
        const notifications = allUserIds.map(receiverId => {
            const isCreator = receiverId === creatorId.toString();
            return {
                receiver: receiverId,
                sender: adminId || null,
                type: 'event_removed',
                event: eventId,
                message: isCreator 
                    ? `Sự kiện "${eventTitle || 'có tên'}" của bạn đã bị hủy do vi phạm Tiêu chuẩn của MACha`
                    : `Sự kiện "${eventTitle || 'có tên'}" mà bạn đã tham gia/quan tâm đã bị hủy`,
                content: resolutionDetails || (isCreator 
                    ? 'Sự kiện của bạn đã bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha'
                    : 'Sự kiện đã bị hủy do vi phạm Tiêu chuẩn của MACha'),
                is_read: false
            };
        });
        
        // Create notifications in database
        await Promise.all(
            notifications.map(notif => notificationService.createNotification(notif))
        );
        
        return { success: true, count: notifications.length };
    }
    
    // Fallback: Query DB
    const Event = getModel("Event");
    if (!Event) {
        throw new Error("Event model not available. Please provide creatorId and rsvpUserIds in job payload.");
    }
    
    const event = await Event.findById(eventId)
        .populate('creator', '_id username avatar')
        .select('creator title');
    
    if (!event) {
        console.log('[Notification Handler] Event not found:', eventId);
        return { success: false, error: 'EVENT_NOT_FOUND' };
    }
    
    const creator = event.creator;
    if (!creator) {
        console.log('[Notification Handler] Creator not found');
        return { success: false, error: 'CREATOR_NOT_FOUND' };
    }
    
    let admin = null;
    if (adminId) {
        admin = await getModel("User")?.findById(adminId).select('username avatar');
    }
    
    const EventRSVP = getModel("EventRSVP");
    if (!EventRSVP) {
        throw new Error("EventRSVP model not available.");
    }
    
    const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
        ? new mongoose.Types.ObjectId(eventId) 
        : eventId;
    
    const rsvps = await EventRSVP.find({
        event: eventObjectId,
        status: { $in: ['going', 'interested'] }
    }).select('user').lean();
    
    const userIds = rsvps.map(rsvp => rsvp.user.toString());
    const creatorIdFinal = creator._id.toString();
    
    const allUserIds = [...new Set([creatorIdFinal, ...userIds])];
    
    const notifications = allUserIds.map(receiverId => {
        const isCreator = receiverId === creatorIdFinal;
        return {
            receiver: receiverId,
            sender: admin ? admin._id : null,
            type: 'event_removed',
            event: eventId,
            message: isCreator 
                ? `Sự kiện "${event.title}" của bạn đã bị hủy do vi phạm Tiêu chuẩn của MACha`
                : `Sự kiện "${event.title}" mà bạn đã tham gia/quan tâm đã bị hủy`,
            content: resolutionDetails || (isCreator 
                ? 'Sự kiện của bạn đã bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha'
                : 'Sự kiện đã bị hủy do vi phạm Tiêu chuẩn của MACha'),
            is_read: false
        };
    });
    
    // Create notifications in database
    await Promise.all(
        notifications.map(notif => notificationService.createNotification(notif))
    );
    
    return { success: true, count: notifications.length };
};


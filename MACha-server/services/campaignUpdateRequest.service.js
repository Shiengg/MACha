import CampaignUpdateRequest from "../models/campaignUpdateRequest.js";
import Campaign from "../models/campaign.js";
import { invalidateCampaignCache } from "./campaign.service.js";
import { createNotification } from "./notification.service.js";
import { redisClient } from "../config/redis.js";
import mongoose from "mongoose";

/**
 * Tạo request chỉnh sửa campaign
 * @param {string} campaignId - ID của campaign
 * @param {string} userId - ID của creator
 * @param {Object} requestedChanges - Các thay đổi được yêu cầu
 * @returns {Promise<Object>} Result object
 */
export const createUpdateRequest = async (campaignId, userId, requestedChanges) => {
    const requestId = `create-update-req-${campaignId}-${Date.now()}`;
    
    console.log(`[Campaign Update Request] Creating request`, {
        requestId,
        campaignId,
        userId,
        requestedFields: Object.keys(requestedChanges),
        timestamp: new Date().toISOString()
    });

    // Validate: Campaign phải tồn tại
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return {
            success: false,
            error: 'CAMPAIGN_NOT_FOUND',
            message: 'Campaign không tồn tại'
        };
    }

    // Validate: User phải là creator
    if (campaign.creator.toString() !== userId.toString()) {
        return {
            success: false,
            error: 'FORBIDDEN',
            message: 'Chỉ creator của campaign mới có thể gửi request chỉnh sửa'
        };
    }

    // Validate: Campaign phải ở trạng thái ACTIVE
    if (campaign.status !== 'active') {
        return {
            success: false,
            error: 'INVALID_STATUS',
            message: `Chỉ có thể gửi request chỉnh sửa cho campaign đang ACTIVE. Trạng thái hiện tại: ${campaign.status}`
        };
    }

    // Validate: Không được có request PENDING khác
    const existingPendingRequest = await CampaignUpdateRequest.findOne({
        campaign: campaignId,
        status: 'pending'
    });

    if (existingPendingRequest) {
        return {
            success: false,
            error: 'PENDING_REQUEST_EXISTS',
            message: 'Đã có request chỉnh sửa đang chờ duyệt. Vui lòng đợi admin xử lý request hiện tại.',
            pendingRequestId: existingPendingRequest._id
        };
    }

    // Validate: requestedChanges chỉ chứa các field được phép
    const allowedFields = ['banner_image', 'gallery_images', 'description', 'end_date'];
    const requestedFields = Object.keys(requestedChanges);
    const invalidFields = requestedFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
        return {
            success: false,
            error: 'INVALID_FIELDS',
            message: `Không được phép chỉnh sửa các field: ${invalidFields.join(', ')}. Chỉ được chỉnh sửa: ${allowedFields.join(', ')}`,
            invalidFields
        };
    }

    // Validate: Phải có ít nhất 1 field được yêu cầu chỉnh sửa
    if (requestedFields.length === 0) {
        return {
            success: false,
            error: 'EMPTY_REQUEST',
            message: 'Phải có ít nhất một field được yêu cầu chỉnh sửa'
        };
    }

    // Validate: end_date phải là Date hợp lệ và sau ngày hiện tại (nếu được cung cấp)
    if (requestedChanges.end_date) {
        const newEndDate = new Date(requestedChanges.end_date);
        const now = new Date();
        if (isNaN(newEndDate.getTime())) {
            return {
                success: false,
                error: 'INVALID_END_DATE',
                message: 'end_date không hợp lệ'
            };
        }
        if (campaign.end_date && newEndDate <= new Date(campaign.end_date)) {
            return {
                success: false,
                error: 'INVALID_END_DATE',
                message: 'end_date mới phải sau end_date hiện tại'
            };
        }
    }

    // Tạo request
    const updateRequest = await CampaignUpdateRequest.create({
        campaign: campaignId,
        creator: userId,
        requested_changes: requestedChanges,
        status: 'pending'
    });

    console.log(`[Campaign Update Request] Request created successfully`, {
        requestId,
        updateRequestId: updateRequest._id,
        campaignId
    });

    // Gửi notification cho admin (async, không block response)
    try {
        // Lấy tất cả admin users
        const User = (await import('../models/user.js')).default;
        const Notification = (await import('../models/notification.js')).default;
        const admins = await User.find({ role: 'admin' }).select('_id');
        
        const notifications = admins.map(admin => ({
            receiver: admin._id,
            sender: null, // System notification
            type: 'campaign_update_request',
            campaign: campaignId,
            message: `Có yêu cầu chỉnh sửa campaign mới`,
            content: `Creator đã gửi yêu cầu chỉnh sửa campaign "${campaign.title}". Vui lòng xem xét.`,
            is_read: false
        }));

        if (notifications.length > 0) {
            // Create notifications in database
            const createdNotifications = await Notification.insertMany(notifications);
            
            // Publish real-time notifications cho tất cả admin
            for (let i = 0; i < createdNotifications.length; i++) {
                try {
                    const notif = createdNotifications[i];
                    await redisClient.publish('notification:new', JSON.stringify({
                        recipientId: notif.receiver.toString(),
                        notification: {
                            _id: notif._id.toString(),
                            type: 'campaign_update_request',
                            message: notif.message,
                            campaign: {
                                _id: campaignId.toString(),
                                title: campaign.title
                            },
                            is_read: false,
                            createdAt: notif.createdAt
                        }
                    }));
                } catch (publishError) {
                    console.error(`[Campaign Update Request] Error publishing notification:`, publishError);
                }
            }
            
            // Invalidate notification cache cho admin
            await Promise.all(admins.map(admin => redisClient.del(`notifications:${admin._id}`)));
            
            console.log(`[Campaign Update Request] ✅ Notifications sent to ${admins.length} admins`);
        }
    } catch (notifError) {
        console.error(`[Campaign Update Request] ❌ Error sending notifications (non-critical):`, notifError);
        // Không fail toàn bộ flow nếu notification lỗi
    }

    // Populate trước khi return
    await updateRequest.populate('campaign', 'title status');
    await updateRequest.populate('creator', 'username fullname avatar');

    return {
        success: true,
        updateRequest
    };
};

/**
 * Lấy danh sách update requests (Admin)
 * @param {string} status - Filter theo status (pending, approved, rejected)
 * @returns {Promise<Array>} Danh sách update requests
 */
export const getUpdateRequests = async (status = 'pending') => {
    const query = status ? { status } : {};
    
    const requests = await CampaignUpdateRequest.find(query)
        .populate('campaign', 'title status banner_image gallery_images description end_date creator')
        .populate('creator', 'username fullname avatar email')
        .populate('reviewed_by', 'username fullname')
        .sort({ createdAt: -1 });

    // Tạo comparison data (before/after) cho mỗi request
    const requestsWithComparison = requests.map(request => {
        const campaign = request.campaign;
        const changes = request.requested_changes;
        
        const comparison = {
            banner_image: {
                before: campaign.banner_image,
                after: changes.banner_image || campaign.banner_image
            },
            gallery_images: {
                before: campaign.gallery_images || [],
                after: changes.gallery_images || campaign.gallery_images || []
            },
            description: {
                before: campaign.description || '',
                after: changes.description || campaign.description || ''
            },
            end_date: {
                before: campaign.end_date || null,
                after: changes.end_date ? new Date(changes.end_date) : (campaign.end_date || null)
            }
        };

        return {
            ...request.toObject(),
            comparison
        };
    });

    return requestsWithComparison;
};

/**
 * Admin approve update request
 * @param {string} requestId - ID của update request
 * @param {string} adminId - ID của admin
 * @returns {Promise<Object>} Result object
 */
export const approveUpdateRequest = async (requestId, adminId) => {
    const requestIdLog = `approve-update-req-${requestId}-${Date.now()}`;
    
    console.log(`[Campaign Update Request] Approving request`, {
        requestId: requestIdLog,
        updateRequestId: requestId,
        adminId,
        timestamp: new Date().toISOString()
    });

    // Find request
    const updateRequest = await CampaignUpdateRequest.findById(requestId)
        .populate('campaign')
        .populate('creator', 'username email fullname');

    if (!updateRequest) {
        return {
            success: false,
            error: 'REQUEST_NOT_FOUND',
            message: 'Không tìm thấy update request'
        };
    }

    // Validate: Request phải ở trạng thái pending
    if (updateRequest.status !== 'pending') {
        return {
            success: false,
            error: 'INVALID_STATUS',
            message: `Chỉ có thể duyệt request ở trạng thái pending. Trạng thái hiện tại: ${updateRequest.status}`
        };
    }

    const campaign = updateRequest.campaign;

    // Validate: Campaign vẫn phải ACTIVE (đảm bảo không bị thay đổi trạng thái)
    if (campaign.status !== 'active') {
        return {
            success: false,
            error: 'CAMPAIGN_NOT_ACTIVE',
            message: `Campaign không còn ở trạng thái ACTIVE. Trạng thái hiện tại: ${campaign.status}. Không thể áp dụng chỉnh sửa.`
        };
    }

    // Start transaction để đảm bảo atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Apply changes lên campaign
        const changes = updateRequest.requested_changes;
        const updatePayload = {};

        if (changes.banner_image !== undefined) {
            updatePayload.banner_image = changes.banner_image;
        }
        if (changes.gallery_images !== undefined) {
            updatePayload.gallery_images = changes.gallery_images;
        }
        if (changes.description !== undefined) {
            updatePayload.description = changes.description;
        }
        if (changes.end_date !== undefined) {
            updatePayload.end_date = new Date(changes.end_date);
        }

        // Update campaign với optimistic locking
        const oldUpdatedAt = campaign.updatedAt;
        const updatedCampaign = await Campaign.findOneAndUpdate(
            {
                _id: campaign._id,
                status: 'active', // Atomic check - chỉ update nếu vẫn active
                updatedAt: oldUpdatedAt // Optimistic lock
            },
            updatePayload,
            { 
                new: true, 
                runValidators: true,
                session 
            }
        );

        if (!updatedCampaign) {
            // Optimistic lock failed hoặc status changed
            await session.abortTransaction();
            const currentCampaign = await Campaign.findById(campaign._id);
            if (currentCampaign.status !== 'active') {
                return {
                    success: false,
                    error: 'CAMPAIGN_NOT_ACTIVE',
                    message: `Campaign đã thay đổi trạng thái. Trạng thái hiện tại: ${currentCampaign.status}. Không thể áp dụng chỉnh sửa.`
                };
            }
            return {
                success: false,
                error: 'CONCURRENT_UPDATE',
                message: 'Campaign đang được cập nhật bởi process khác. Vui lòng thử lại.'
            };
        }

        // Update request status
        updateRequest.status = 'approved';
        updateRequest.reviewed_by = adminId;
        updateRequest.reviewed_at = new Date();
        await updateRequest.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        console.log(`[Campaign Update Request] Request approved and campaign updated successfully`, {
            requestId: requestIdLog,
            updateRequestId: requestId,
            campaignId: campaign._id,
            updatedFields: Object.keys(updatePayload)
        });

        // Invalidate cache AFTER transaction committed
        try {
            await invalidateCampaignCache(
                campaign._id,
                updatedCampaign.category,
                requestIdLog,
                campaign.creator.toString()
            );
            console.log(`[Campaign Update Request] Cache invalidated successfully`, {
                requestId: requestIdLog,
                campaignId: campaign._id
            });
        } catch (cacheError) {
            console.error(`[Campaign Update Request] Cache invalidation failed (non-critical)`, {
                requestId: requestIdLog,
                campaignId: campaign._id,
                error: cacheError.message
            });
        }

        // Gửi notification cho creator (async, không block response)
        try {
            await createNotification({
                receiver: updateRequest.creator._id,
                sender: null, // System notification
                type: 'campaign_update_approved',
                campaign: campaign._id,
                message: `Yêu cầu chỉnh sửa campaign đã được duyệt`,
                content: `Yêu cầu chỉnh sửa campaign "${campaign.title}" đã được admin duyệt và áp dụng thành công.`,
                is_read: false
            });

            // Publish real-time notification
            await redisClient.publish('notification:new', JSON.stringify({
                recipientId: updateRequest.creator._id.toString(),
                notification: {
                    type: 'campaign_update_approved',
                    message: `Yêu cầu chỉnh sửa campaign đã được duyệt`,
                    campaign: {
                        _id: campaign._id.toString(),
                        title: campaign.title
                    },
                    is_read: false,
                    createdAt: new Date()
                }
            }));

            await redisClient.del(`notifications:${updateRequest.creator._id}`);
            
            console.log(`[Campaign Update Request] ✅ Notification sent to creator`);
        } catch (notifError) {
            console.error(`[Campaign Update Request] ❌ Error sending notification to creator (non-critical):`, notifError);
        }

        // Populate trước khi return
        await updateRequest.populate('reviewed_by', 'username fullname');

        return {
            success: true,
            updateRequest,
            campaign: updatedCampaign
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error(`[Campaign Update Request] Error approving request:`, error);
        throw error;
    }
};

/**
 * Admin reject update request
 * @param {string} requestId - ID của update request
 * @param {string} adminId - ID của admin
 * @param {string} adminNote - Lý do từ chối
 * @returns {Promise<Object>} Result object
 */
export const rejectUpdateRequest = async (requestId, adminId, adminNote = null) => {
    const requestIdLog = `reject-update-req-${requestId}-${Date.now()}`;
    
    console.log(`[Campaign Update Request] Rejecting request`, {
        requestId: requestIdLog,
        updateRequestId: requestId,
        adminId,
        timestamp: new Date().toISOString()
    });

    // Find request
    const updateRequest = await CampaignUpdateRequest.findById(requestId)
        .populate('campaign', 'title')
        .populate('creator', 'username email fullname');

    if (!updateRequest) {
        return {
            success: false,
            error: 'REQUEST_NOT_FOUND',
            message: 'Không tìm thấy update request'
        };
    }

    // Validate: Request phải ở trạng thái pending
    if (updateRequest.status !== 'pending') {
        return {
            success: false,
            error: 'INVALID_STATUS',
            message: `Chỉ có thể từ chối request ở trạng thái pending. Trạng thái hiện tại: ${updateRequest.status}`
        };
    }

    // Update request
    updateRequest.status = 'rejected';
    updateRequest.reviewed_by = adminId;
    updateRequest.reviewed_at = new Date();
    updateRequest.admin_note = adminNote || 'Yêu cầu chỉnh sửa bị từ chối';
    await updateRequest.save();

    console.log(`[Campaign Update Request] Request rejected successfully`, {
        requestId: requestIdLog,
        updateRequestId: requestId
    });

    // Gửi notification cho creator (async, không block response)
    try {
        const rejectionReason = adminNote || 'Yêu cầu chỉnh sửa bị từ chối bởi admin';
        
        await createNotification({
            receiver: updateRequest.creator._id,
            sender: null, // System notification
            type: 'campaign_update_rejected',
            campaign: updateRequest.campaign._id,
            message: `Yêu cầu chỉnh sửa campaign bị từ chối`,
            content: `Yêu cầu chỉnh sửa campaign "${updateRequest.campaign.title}" đã bị admin từ chối. Lý do: ${rejectionReason}`,
            is_read: false
        });

        // Publish real-time notification
        await redisClient.publish('notification:new', JSON.stringify({
            recipientId: updateRequest.creator._id.toString(),
            notification: {
                type: 'campaign_update_rejected',
                message: `Yêu cầu chỉnh sửa campaign bị từ chối`,
                campaign: {
                    _id: updateRequest.campaign._id.toString(),
                    title: updateRequest.campaign.title
                },
                admin_note: rejectionReason,
                is_read: false,
                createdAt: new Date()
            }
        }));

        await redisClient.del(`notifications:${updateRequest.creator._id}`);
        
        console.log(`[Campaign Update Request] ✅ Notification sent to creator`);
    } catch (notifError) {
        console.error(`[Campaign Update Request] ❌ Error sending notification to creator (non-critical):`, notifError);
    }

    // Populate trước khi return
    await updateRequest.populate('reviewed_by', 'username fullname');

    return {
        success: true,
        updateRequest
    };
};

/**
 * Lấy update request theo ID
 * @param {string} requestId - ID của update request
 * @returns {Promise<Object|null>} Update request object hoặc null
 */
export const getUpdateRequestById = async (requestId) => {
    const request = await CampaignUpdateRequest.findById(requestId)
        .populate('campaign', 'title status banner_image gallery_images description end_date creator')
        .populate('creator', 'username fullname avatar email')
        .populate('reviewed_by', 'username fullname');

    if (!request) {
        return null;
    }

    // Tạo comparison data
    const campaign = request.campaign;
    const changes = request.requested_changes;
    
    const comparison = {
        banner_image: {
            before: campaign.banner_image,
            after: changes.banner_image || campaign.banner_image
        },
        gallery_images: {
            before: campaign.gallery_images || [],
            after: changes.gallery_images || campaign.gallery_images || []
        },
        description: {
            before: campaign.description || '',
            after: changes.description || campaign.description || ''
        },
        end_date: {
            before: campaign.end_date || null,
            after: changes.end_date ? new Date(changes.end_date) : (campaign.end_date || null)
        }
    };

    return {
        ...request.toObject(),
        comparison
    };
};

/**
 * Lấy update requests của một campaign (creator)
 * @param {string} campaignId - ID của campaign
 * @param {string} userId - ID của user (để verify creator)
 * @returns {Promise<Array>} Danh sách update requests
 */
export const getUpdateRequestsByCampaign = async (campaignId, userId = null) => {
    // Verify user là creator nếu userId được cung cấp
    if (userId) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return [];
        }
        if (campaign.creator.toString() !== userId.toString()) {
            return [];
        }
    }

    const requests = await CampaignUpdateRequest.find({ campaign: campaignId })
        .populate('campaign', 'title status')
        .populate('reviewed_by', 'username fullname')
        .sort({ createdAt: -1 });

    return requests;
};


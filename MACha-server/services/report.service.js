import Report from "../models/report.js";
import Post from "../models/post.js";
import Campaign from "../models/campaign.js";
import User from "../models/user.js";
import Comment from "../models/comment.js";
import Event from "../models/event.js";
import { redisClient } from "../config/redis.js";
import * as queueService from "./queue.service.js";
import * as postService from "./post.service.js";
import * as trackingService from "./tracking.service.js";

const invalidateEventCaches = async (eventId, category = null, status = null) => {
    const keys = [
        `event:${eventId}`,
        'events:all',
        'events:pending',
        'events:upcoming',
        'events:past'
    ];
    
    if (category) {
        keys.push(`events:category:${category}`);
    }
    
    if (status) {
        keys.push(`events:status:${status}`);
    }
    
    await Promise.all(keys.map(key => redisClient.del(key)));
};

const invalidateCampaignCaches = async (campaignId, category = null) => {
    const keySet = 'campaigns:all:keys';
    const keys = await redisClient.sMembers(keySet);
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all:total')
    ];
    
    if (category) {
        cachesToInvalidate.push(redisClient.del(`campaigns:category:${category}`));
    }
    
    if (keys.length > 0) {
        cachesToInvalidate.push(redisClient.del(...keys));
    }
    
    cachesToInvalidate.push(redisClient.del(keySet));
    
    await Promise.all(cachesToInvalidate);
};

const removeReportedItem = async (reportedType, reportedId, resolutionDetails, adminId = null) => {
    const reportedModelMap = {
        post: Post,
        campaign: Campaign,
        comment: Comment,
        event: Event
    };

    const ReportedModel = reportedModelMap[reportedType];
    if (!ReportedModel) {
        return { success: false, error: 'INVALID_TYPE' };
    }

    const reportedItem = await ReportedModel.findById(reportedId);
    if (!reportedItem) {
        return { success: false, error: 'NOT_FOUND' };
    }

    let creatorId = null;

    switch (reportedType) {
        case 'post':
            creatorId = reportedItem.user;
            reportedItem.is_hidden = true;
            await reportedItem.save();
            
            try {
                await postService.invalidatePostCache(reportedId);
            } catch (error) {
                console.error('Error invalidating post cache:', error);
            }
            
            try {
                await queueService.pushJob({
                    type: "POST_REMOVED",
                    postId: reportedId,
                    adminId: adminId,
                    resolutionDetails: resolutionDetails
                });
            } catch (error) {
                console.error('Error pushing POST_REMOVED job:', error);
            }
            break;
        case 'comment':
            creatorId = reportedItem.user;
            reportedItem.is_hidden = true;
            await reportedItem.save();
            break;
        case 'campaign':
            creatorId = reportedItem.creator;
            reportedItem.status = 'cancelled';
            reportedItem.cancellation_reason = resolutionDetails || 'Removed due to report';
            reportedItem.cancelled_at = new Date();
            reportedItem.cancelled_by = adminId;
            await reportedItem.save();
            
            // Invalidate campaign cache to remove it from discover page
            try {
                await invalidateCampaignCaches(reportedId, reportedItem.category);
            } catch (cacheError) {
                console.error('Error invalidating campaign cache:', cacheError);
            }
            
            // Publish campaign cancelled event for real-time UI updates
            try {
                await trackingService.publishEvent("tracking:campaign:cancelled", {
                    campaignId: reportedId.toString(),
                    userId: adminId ? adminId.toString() : null,
                    reason: resolutionDetails || 'Removed due to report',
                    category: reportedItem.category,
                });
            } catch (eventError) {
                console.error('Error publishing campaign cancelled event:', eventError);
            }
            
            try {
                await queueService.pushJob({
                    type: "CAMPAIGN_REMOVED",
                    campaignId: reportedId,
                    adminId: adminId,
                    resolutionDetails: resolutionDetails
                });
            } catch (error) {
                console.error('Error pushing CAMPAIGN_REMOVED job:', error);
            }

            try {
                const refundServiceModule = await import('./refund.service.js');
                const recoveryServiceModule = await import('./recovery.service.js');
                const escrowServiceModule = await import('./escrow.service.js');
                
                await escrowServiceModule.cancelPendingWithdrawalRequests(reportedId);
                
                const totalReleasedAmount = await escrowServiceModule.getTotalReleasedAmount(reportedId);
                
                if (reportedItem.current_amount > 0) {
                    const refundResult = await refundServiceModule.processProportionalRefund(reportedId, adminId, resolutionDetails);
                    
                    if (!refundResult.success) {
                        const errorMsg = `Refund failed: ${refundResult.error || refundResult.message}`;
                        console.error(errorMsg);
                        throw new Error(errorMsg);
                    }
                    
                    if (totalReleasedAmount > 0) {
                        const recoveryResult = await recoveryServiceModule.createRecoveryCase(reportedId, adminId, 30);
                        if (!recoveryResult.success) {
                            const errorMsg = `Failed to create recovery case: ${recoveryResult.error || 'Unknown error'}`;
                            console.error(errorMsg);
                            throw new Error(errorMsg);
                        }
                    }
                } else {
                    if (totalReleasedAmount > 0) {
                        const recoveryResult = await recoveryServiceModule.createRecoveryCase(reportedId, adminId, 30);
                        if (!recoveryResult.success) {
                            const errorMsg = `Failed to create recovery case: ${recoveryResult.error || 'Unknown error'}`;
                            console.error(errorMsg);
                            throw new Error(errorMsg);
                        }
                    }
                }
            } catch (refundError) {
                console.error('Error processing refund for cancelled campaign:', refundError);
                throw refundError;
            }
            break;
        case 'event':
            creatorId = reportedItem.creator;
            reportedItem.status = 'cancelled';
            reportedItem.cancellation_reason = resolutionDetails || 'Removed due to report';
            reportedItem.cancelled_at = new Date();
            reportedItem.cancelled_by = adminId;
            await reportedItem.save();
            
            try {
                await invalidateEventCaches(reportedId, reportedItem.category, 'cancelled');
            } catch (cacheError) {
                console.error('Error invalidating event cache:', cacheError);
            }
            
            try {
                await queueService.pushJob({
                    type: "EVENT_REMOVED",
                    eventId: reportedId,
                    adminId: adminId,
                    resolutionDetails: resolutionDetails
                });
            } catch (error) {
                console.error('Error pushing EVENT_REMOVED job:', error);
            }
            break;
        case 'user':
            return { success: false, error: 'USER_SHOULD_BE_BANNED_NOT_REMOVED' };
        default:
            return { success: false, error: 'UNSUPPORTED_TYPE' };
    }

    return { success: true, message: 'Item removed successfully' };
};

const warnUser = async (reportedType, reportedId, adminId, resolutionDetails) => {
    let userId = null;

    if (reportedType === 'user') {
        userId = reportedId;
    } else {
        const reportedModelMap = {
            post: Post,
            campaign: Campaign,
            comment: Comment,
            event: Event
        };
        const ReportedModel = reportedModelMap[reportedType];
        if (ReportedModel) {
            const reportedItem = await ReportedModel.findById(reportedId);
            if (reportedItem) {
                userId = reportedItem.user || reportedItem.creator;
            }
        }
    }

    if (!userId) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }

    if (reportedType === 'user') {
        const previousWarnings = await Report.countDocuments({
            reported_type: 'user',
            reported_id: userId,
            status: 'resolved',
            resolution: 'user_warned'
        });

        if (previousWarnings >= 1) {
            console.log(`User ${userId} has been warned ${previousWarnings} time(s) before. Automatically banning instead.`);
            const banResult = await banUser(reportedType, reportedId, adminId, resolutionDetails || 'Bị khóa sau nhiều lần cảnh báo');
            return { ...banResult, auto_banned: true };
        }

        try {
            await queueService.pushJob({
                type: "USER_WARNED",
                userId: userId,
                adminId: adminId,
                resolutionDetails: resolutionDetails
            });
        } catch (error) {
            console.error('Error pushing USER_WARNED job:', error);
        }
    }

    console.log(`Warning issued to user ${userId} by admin ${adminId}: ${resolutionDetails || 'No details provided'}`);
    
    return { success: true, message: 'User warned successfully' };
};

const banUser = async (reportedType, reportedId, adminId, resolutionDetails) => {
    let userId = null;

    if (reportedType === 'user') {
        userId = reportedId;
    } else {
        const reportedModelMap = {
            post: Post,
            campaign: Campaign,
            comment: Comment,
            event: Event
        };
        const ReportedModel = reportedModelMap[reportedType];
        if (ReportedModel) {
            const reportedItem = await ReportedModel.findById(reportedId);
            if (reportedItem) {
                userId = reportedItem.user || reportedItem.creator;
            }
        }
    }

    if (!userId) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }

    const user = await User.findById(userId);
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }

    user.is_banned = true;
    user.banned_at = new Date();
    user.banned_by = adminId;
    user.ban_reason = resolutionDetails || 'Banned due to report';
    await user.save();

    return { success: true, message: 'User banned successfully' };
};

export const executeResolution = async (report, resolution, adminId) => {
    if (!resolution || resolution === 'no_action') {
        return { success: true, message: 'No action taken' };
    }

    const { reported_type, reported_id, resolution_details } = report;

    // Admin reports are handled manually by owner, not through executeResolution
    if (reported_type === 'admin') {
        return { success: true, message: 'Admin reports are handled manually by owner' };
    }

    try {
        switch (resolution) {
            case 'removed':
                return await removeReportedItem(reported_type, reported_id, resolution_details, adminId);
            
            case 'user_warned':
                return await warnUser(reported_type, reported_id, adminId, resolution_details);
            
            case 'user_banned':
                return await banUser(reported_type, reported_id, adminId, resolution_details);
            
            default:
                return { success: false, error: 'INVALID_RESOLUTION' };
        }
    } catch (error) {
        console.error('Error executing resolution:', error);
        return { success: false, error: error.message };
    }
};

export const createReport = async (reporterId, reportData) => {
    const { reported_type, reported_id, reported_reason, description } = reportData;

    const hasReported = await Report.hasUserReported(reporterId, reported_type, reported_id);
    if (hasReported) {
        return { success: false, error: 'ALREADY_REPORTED' };
    }

    // Special handling for admin reports
    if (reported_type === "admin") {
        const reportedAdmin = await User.findById(reported_id);
        if (!reportedAdmin) {
            return { success: false, error: 'NOT_FOUND' };
        }

        // Validate reported_id is an admin
        if (reportedAdmin.role !== "admin") {
            return { success: false, error: 'INVALID_ADMIN' };
        }

        // Prevent admin from reporting themselves
        if (reported_id.toString() === reporterId.toString()) {
            return { success: false, error: 'CANNOT_REPORT_SELF' };
        }

        const report = await Report.create({
            reporter: reporterId,
            reported_type,
            reported_id,
            reported_reason,
            description: description || null
        });

        await report.populate('reporter', 'username avatar fullname');

        const keySet = 'reports:keys';
        const keys = await redisClient.sMembers(keySet);

        if (keys.length > 0) {
            await redisClient.del(...keys);
        }

        await redisClient.del(keySet);
        await redisClient.del(`reports:${reported_type}:${reported_id}`);

        return { success: true, report };
    }

    const reportedModelMap = {
        post: Post,
        campaign: Campaign,
        user: User,
        comment: Comment,
        event: Event
    };

    const ReportedModel = reportedModelMap[reported_type];
    if (!ReportedModel) {
        return { success: false, error: 'INVALID_TYPE' };
    }

    const reportedItem = await ReportedModel.findById(reported_id);
    if (!reportedItem) {
        return { success: false, error: 'NOT_FOUND' };
    }

    const report = await Report.create({
        reporter: reporterId,
        reported_type,
        reported_id,
        reported_reason,
        description: description || null
    });

    await report.populate('reporter', 'username avatar fullname');

    const keySet = 'reports:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);
    await redisClient.del(`reports:${reported_type}:${reported_id}`);

    return { success: true, report };
};

export const getReports = async (filters = {}, page = 0, limit = 20) => {
    const { status, reported_type, reporter_id } = filters;

    const query = {};
    if (status) query.status = status;
    if (reported_type) query.reported_type = reported_type;
    if (reporter_id) query.reporter = reporter_id;

    const cacheKey = `reports:${JSON.stringify(query)}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const reports = await Report.find(query)
        .populate('reporter', 'username avatar fullname')
        .populate('reviewed_by', 'username avatar fullname')
        .sort({ submitted_at: -1 })
        .skip(page * limit)
        .limit(limit);

    const total = await Report.countDocuments(query);

    const result = {
        reports,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };

    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    await redisClient.sAdd('reports:keys', cacheKey);

    return result;
};

export const getReportById = async (reportId) => {
    const cacheKey = `report:${reportId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const report = await Report.findById(reportId)
        .populate('reporter', 'username avatar fullname')
        .populate('reviewed_by', 'username avatar fullname');

    if (!report) {
        return { success: false, error: 'NOT_FOUND' };
    }

    const reportObject = report.toObject();

    const reportedModelMap = {
        post: Post,
        campaign: Campaign,
        user: User,
        comment: Comment,
        event: Event,
        admin: User
    };

    const ReportedModel = reportedModelMap[report.reported_type];
    if (ReportedModel) {
        const reportedItem = await ReportedModel.findById(report.reported_id);
        if (reportedItem) {
            reportObject.reported_item = reportedItem;
        }
    }

    await redisClient.setEx(cacheKey, 300, JSON.stringify(reportObject));

    return { success: true, report: reportObject };
};

export const updateReportStatus = async (reportId, adminId, updateData) => {
    const { status, resolution, resolution_details } = updateData;

    const report = await Report.findById(reportId);
    if (!report) {
        return { success: false, error: 'NOT_FOUND' };
    }

    const resolvedStatuses = ['resolved', 'rejected', 'auto_resolved'];
    const shouldSetResolution = resolvedStatuses.includes(status);

    if (shouldSetResolution) {
        report.status = status;
        report.reviewed_by = adminId;
        
        let finalResolution = resolution || (status === 'resolved' ? 'no_action' : 'no_action');
        
        if (status === 'resolved' && report.reported_type === 'user' && !resolution) {
            const previousWarnings = await Report.countDocuments({
                reported_type: 'user',
                reported_id: report.reported_id,
                status: 'resolved',
                resolution: 'user_warned'
            });

            if (previousWarnings >= 1) {
                finalResolution = 'user_banned';
            } else {
                finalResolution = 'user_warned';
            }
        }
        
        report.resolution = finalResolution;
        
        if (resolution_details) {
            report.resolution_details = resolution_details;
        }

        // Admin reports are handled manually by owner, not through executeResolution
        if (status === 'resolved' && finalResolution !== 'no_action' && report.reported_type !== 'admin') {
            const executionResult = await executeResolution(report, finalResolution, adminId);
            if (!executionResult.success) {
                console.error('Error executing resolution:', executionResult.error);
            } else if (executionResult.auto_banned) {
                report.resolution = 'user_banned';
                if (!report.resolution_details || report.resolution_details === resolution_details) {
                    report.resolution_details = resolution_details || 'Bị khóa sau nhiều lần cảnh báo';
                }
            }
        }
    } else {
        report.status = status;
    }

    await report.save();
    await report.populate('reporter', 'username avatar fullname');
    await report.populate('reviewed_by', 'username avatar fullname');

    const keySet = 'reports:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);
    await redisClient.del(`report:${reportId}`);
    await redisClient.del(`reports:${report.reported_type}:${report.reported_id}`);

    return { success: true, report };
};

export const getReportsByReportedItem = async (reportedType, reportedId) => {
    const cacheKey = `reports:${reportedType}:${reportedId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const reports = await Report.find({
        reported_type: reportedType,
        reported_id: reportedId
    })
        .populate('reporter', 'username avatar fullname')
        .populate('reviewed_by', 'username avatar fullname')
        .sort({ submitted_at: -1 });

    await redisClient.setEx(cacheKey, 300, JSON.stringify(reports));

    return reports;
};

// Lấy tất cả reports về admin (cho owner)
export const getAdminReports = async (filters = {}, page = 0, limit = 20) => {
    const query = { reported_type: 'admin' };
    
    if (filters.status) query.status = filters.status;
    if (filters.admin_id) query.reported_id = filters.admin_id;

    const cacheKey = `admin_reports:${JSON.stringify(query)}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const reports = await Report.find(query)
        .populate('reporter', 'username avatar fullname')
        .populate('reviewed_by', 'username avatar fullname')
        .populate('reported_id', 'username avatar fullname email role')
        .sort({ submitted_at: -1 })
        .skip(page * limit)
        .limit(limit);

    const total = await Report.countDocuments(query);

    const result = {
        reports,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };

    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    await redisClient.sAdd('reports:keys', cacheKey);

    return result;
};

// Lấy reports về 1 admin cụ thể
export const getReportsByAdmin = async (adminId) => {
    const cacheKey = `admin_reports:${adminId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const reports = await Report.find({
        reported_type: 'admin',
        reported_id: adminId
    })
        .populate('reporter', 'username avatar fullname')
        .populate('reviewed_by', 'username avatar fullname')
        .sort({ submitted_at: -1 });

    await redisClient.setEx(cacheKey, 300, JSON.stringify(reports));

    return reports;
};

export const getGroupedReports = async (filters = {}, page = 0, limit = 20) => {
    const { status, reported_type } = filters;

    const query = {};
    if (status) query.status = status;
    if (reported_type) query.reported_type = reported_type;

    const cacheKey = `reports:grouped:${JSON.stringify(query)}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const reports = await Report.find(query)
        .populate('reporter', 'username avatar fullname')
        .sort({ submitted_at: -1 });

    const grouped = {};
    reports.forEach(report => {
        const key = `${report.reported_type}:${report.reported_id}`;
        if (!grouped[key]) {
            grouped[key] = {
                reported_type: report.reported_type,
                reported_id: report.reported_id,
                reports: [],
                count: 0,
                pending_count: 0,
                latest_report_at: report.submitted_at,
                reasons: {}
            };
        }
        grouped[key].reports.push(report);
        grouped[key].count++;
        if (report.status === 'pending') {
            grouped[key].pending_count++;
        }
        if (new Date(report.submitted_at) > new Date(grouped[key].latest_report_at)) {
            grouped[key].latest_report_at = report.submitted_at;
        }
        const reason = report.reported_reason;
        grouped[key].reasons[reason] = (grouped[key].reasons[reason] || 0) + 1;
    });

    const items = Object.values(grouped).sort((a, b) => 
        new Date(b.latest_report_at) - new Date(a.latest_report_at)
    );

    const total = items.length;
    const paginatedItems = items.slice(page * limit, (page + 1) * limit);

    const result = {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };

    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    await redisClient.sAdd('reports:keys', cacheKey);

    return result;
};

export const batchUpdateReportsByItem = async (reportedType, reportedId, adminId, updateData) => {
    const { status, resolution, resolution_details } = updateData;

    const reports = await Report.find({
        reported_type: reportedType,
        reported_id: reportedId
    });

    if (reports.length === 0) {
        return { success: false, error: 'NOT_FOUND' };
    }

    const resolvedStatuses = ['resolved', 'rejected', 'auto_resolved'];
    const shouldSetResolution = resolvedStatuses.includes(status);

    let finalResolution = resolution || (status === 'resolved' ? 'no_action' : 'no_action');
    
    if (status === 'resolved' && reportedType === 'user' && !resolution) {
        const previousWarnings = await Report.countDocuments({
            reported_type: 'user',
            reported_id: reportedId,
            status: 'resolved',
            resolution: 'user_warned'
        });

        if (previousWarnings >= 1) {
            finalResolution = 'user_banned';
        } else {
            finalResolution = 'user_warned';
        }
    }
    
    let resolutionExecuted = false;

    // Admin reports are handled manually by owner, not through executeResolution
    if (status === 'resolved' && (finalResolution === 'user_warned' || finalResolution === 'user_banned') && reports.length > 0 && reportedType !== 'admin') {
        const templateReport = reports[0];
        templateReport.resolution = finalResolution;
        templateReport.resolution_details = resolution_details || (finalResolution === 'user_banned' ? 'Bị khóa sau nhiều lần cảnh báo' : '');
        
        const executionResult = await executeResolution(templateReport, finalResolution, adminId);
        resolutionExecuted = true;
        
        if (!executionResult.success) {
            console.error('Error executing resolution:', executionResult.error);
        } else if (executionResult.auto_banned && finalResolution === 'user_warned') {
            finalResolution = 'user_banned';
        }
    }

    const updatePromises = reports.map(report => {
        if (shouldSetResolution) {
            report.status = status;
            report.reviewed_by = adminId;
            report.resolution = finalResolution;
            if (resolution_details) {
                report.resolution_details = resolution_details;
            }
            if (finalResolution === 'user_banned' && !resolution_details) {
                report.resolution_details = 'Bị khóa sau nhiều lần cảnh báo';
            }
        } else {
            report.status = status;
        }
        return report.save();
    });

    await Promise.all(updatePromises);

    // Admin reports are handled manually by owner, not through executeResolution
    if (!resolutionExecuted && status === 'resolved' && finalResolution !== 'no_action' && reports.length > 0 && reportedType !== 'admin') {
        const templateReport = reports[0];
        templateReport.resolution = finalResolution;
        templateReport.resolution_details = resolution_details || (finalResolution === 'user_banned' ? 'Bị khóa sau nhiều lần cảnh báo' : '');
        
        const executionResult = await executeResolution(templateReport, finalResolution, adminId);
        if (!executionResult.success) {
            console.error('Error executing resolution:', executionResult.error);
        } else if (executionResult.auto_banned && finalResolution === 'user_warned') {
            finalResolution = 'user_banned';
            await Promise.all(reports.map(report => {
                report.resolution = 'user_banned';
                if (!report.resolution_details) {
                    report.resolution_details = 'Bị khóa sau nhiều lần cảnh báo';
                }
                return report.save();
            }));
        }
    }

    const keySet = 'reports:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);
    await redisClient.del(`reports:${reportedType}:${reportedId}`);
    
    reports.forEach(report => {
        redisClient.del(`report:${report._id}`);
    });

    return { success: true, count: reports.length };
};


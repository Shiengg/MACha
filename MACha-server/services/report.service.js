import Report from "../models/report.js";
import Post from "../models/post.js";
import Campaign from "../models/campaign.js";
import User from "../models/user.js";
import Comment from "../models/comment.js";
import Event from "../models/event.js";
import { redisClient } from "../config/redis.js";

export const createReport = async (reporterId, reportData) => {
    const { reported_type, reported_id, reported_reason, description } = reportData;

    const hasReported = await Report.hasUserReported(reporterId, reported_type, reported_id);
    if (hasReported) {
        return { success: false, error: 'ALREADY_REPORTED' };
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
        event: Event
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

    if (status === 'reviewing') {
        report.status = 'reviewing';
        report.reviewed_by = adminId;
    } else if (shouldSetResolution) {
        report.status = status;
        report.reviewed_by = adminId;
        if (resolution) {
            report.resolution = resolution;
        }
        if (resolution_details) {
            report.resolution_details = resolution_details;
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

    const updatePromises = reports.map(report => {
        if (status === 'reviewing') {
            report.status = 'reviewing';
            report.reviewed_by = adminId;
        } else if (shouldSetResolution) {
            report.status = status;
            report.reviewed_by = adminId;
            if (resolution) {
                report.resolution = resolution;
            }
            if (resolution_details) {
                report.resolution_details = resolution_details;
            }
        } else {
            report.status = status;
        }
        return report.save();
    });

    await Promise.all(updatePromises);

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


import Report from "../models/report.js";
import Post from "../models/post.js";
import Campaign from "../models/campaign.js";
import User from "../models/user.js";
import Comment from "../models/comment.js";
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
        comment: Comment
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

    await redisClient.del(`reports:all`);
    await redisClient.del(`reports:status:pending`);
    await redisClient.del(`reports:status:reviewing`);

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
        comment: Comment
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

    await Promise.all([
        redisClient.del(`report:${reportId}`),
        redisClient.del(`reports:all`),
        redisClient.del(`reports:status:pending`),
        redisClient.del(`reports:status:reviewing`),
        redisClient.del(`reports:status:resolved`),
    ]);

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


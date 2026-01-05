import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as reportService from "../services/report.service.js";

export const createReport = async (req, res) => {
    try {
        const { reported_type, reported_id, reported_reason, description } = req.body;

        if (!reported_type || !reported_id || !reported_reason) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "reported_type, reported_id, and reported_reason are required"
            });
        }

        const result = await reportService.createReport(req.user._id, {
            reported_type,
            reported_id,
            reported_reason,
            description
        });

        if (!result.success) {
            if (result.error === 'ALREADY_REPORTED') {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    message: "You have already reported this item"
                });
            }
            if (result.error === 'INVALID_TYPE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Invalid reported_type"
                });
            }
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Reported item not found"
                });
            }
        }

        return res.status(HTTP_STATUS.CREATED).json({ report: result.report });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                message: "You have already reported this item"
            });
        }
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getReports = async (req, res) => {
    try {
        const { status, reported_type, reporter_id } = req.query;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 20;

        const filters = {};
        if (status) filters.status = status;
        if (reported_type) filters.reported_type = reported_type;
        if (reporter_id) filters.reporter_id = reporter_id;

        const result = await reportService.getReports(filters, page, limit);

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getReportById = async (req, res) => {
    try {
        const result = await reportService.getReportById(req.params.id);

        if (!result.success) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: HTTP_STATUS_TEXT.NOT_FOUND
            });
        }

        return res.status(HTTP_STATUS.OK).json({ report: result.report });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const updateReportStatus = async (req, res) => {
    try {
        const { status, resolution, resolution_details } = req.body;

        if (!status) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "status is required"
            });
        }

        const reportResult = await reportService.getReportById(req.params.id);
        if (!reportResult.success) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: HTTP_STATUS_TEXT.NOT_FOUND
            });
        }

        if (reportResult.report.reported_type === "admin" && req.user.role !== "owner") {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "Only owner can handle admin reports"
            });
        }

        const result = await reportService.updateReportStatus(
            req.params.id,
            req.user._id,
            { status, resolution, resolution_details }
        );

        if (!result.success) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: HTTP_STATUS_TEXT.NOT_FOUND
            });
        }

        return res.status(HTTP_STATUS.OK).json({ report: result.report });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getReportsByReportedItem = async (req, res) => {
    try {
        const { reported_type, reported_id } = req.params;

        if (!reported_type || !reported_id) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "reported_type and reported_id are required"
            });
        }

        const reports = await reportService.getReportsByReportedItem(reported_type, reported_id);

        const Post = (await import("../models/post.js")).default;
        const Campaign = (await import("../models/campaign.js")).default;
        const User = (await import("../models/user.js")).default;
        const Comment = (await import("../models/comment.js")).default;
        const Event = (await import("../models/event.js")).default;
        
        const reportedModelMap = {
            post: Post,
            campaign: Campaign,
            user: User,
            comment: Comment,
            event: Event,
            admin: User
        };

        const ReportedModel = reportedModelMap[reported_type];
        let reportedItem = null;
        if (ReportedModel) {
            if (reported_type === 'post') {
                reportedItem = await ReportedModel.findById(reported_id)
                    .populate('user', 'username avatar fullname')
                    .populate('hashtags', 'name')
                    .populate('campaign_id', 'title');
            } else if (reported_type === 'campaign') {
                reportedItem = await ReportedModel.findById(reported_id)
                    .populate('creator', 'username avatar fullname')
                    .populate('hashtags', 'name');
            } else if (reported_type === 'event') {
                reportedItem = await ReportedModel.findById(reported_id)
                    .populate('creator', 'username avatar fullname');
            } else if (reported_type === 'comment') {
                reportedItem = await ReportedModel.findById(reported_id)
                    .populate('user', 'username avatar fullname')
                    .populate('post', '_id');
            } else {
                reportedItem = await ReportedModel.findById(reported_id);
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            count: reports.length,
            reports,
            reported_item: reportedItem
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getGroupedReports = async (req, res) => {
    try {
        const { status, reported_type } = req.query;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 20;

        const filters = {};
        if (status) filters.status = status;
        if (reported_type) filters.reported_type = reported_type;

        const result = await reportService.getGroupedReports(filters, page, limit);

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const batchUpdateReportsByItem = async (req, res) => {
    try {
        const { reported_type, reported_id } = req.params;
        const { status, resolution, resolution_details } = req.body;

        if (!status) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "status is required"
            });
        }

        const result = await reportService.batchUpdateReportsByItem(
            reported_type,
            reported_id,
            req.user._id,
            { status, resolution, resolution_details }
        );

        if (!result.success) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: HTTP_STATUS_TEXT.NOT_FOUND
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: `Updated ${result.count} reports successfully`,
            count: result.count
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getAdminReports = async (req, res) => {
    try {
        const { status, admin_id } = req.query;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 20;

        const filters = {};
        if (status) filters.status = status;
        if (admin_id) filters.admin_id = admin_id;

        const result = await reportService.getAdminReports(filters, page, limit);

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getReportsByAdmin = async (req, res) => {
    try {
        const { adminId } = req.params;

        const reports = await reportService.getReportsByAdmin(adminId);

        return res.status(HTTP_STATUS.OK).json({ reports });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};


import * as updateRequestService from "../services/campaignUpdateRequest.service.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

/**
 * Creator gửi request chỉnh sửa campaign
 * POST /campaigns/:id/update-request
 */
export const createUpdateRequest = async (req, res) => {
    try {
        const campaignId = req.params.id;
        const userId = req.user._id;
        const { requested_changes } = req.body;

        if (!requested_changes || typeof requested_changes !== 'object') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: 'requested_changes là bắt buộc và phải là object'
            });
        }

        const result = await updateRequestService.createUpdateRequest(
            campaignId,
            userId,
            requested_changes
        );

        if (!result.success) {
            const errorStatusMap = {
                'CAMPAIGN_NOT_FOUND': HTTP_STATUS.NOT_FOUND,
                'FORBIDDEN': HTTP_STATUS.FORBIDDEN,
                'INVALID_STATUS': HTTP_STATUS.BAD_REQUEST,
                'PENDING_REQUEST_EXISTS': HTTP_STATUS.CONFLICT,
                'INVALID_FIELDS': HTTP_STATUS.BAD_REQUEST,
                'EMPTY_REQUEST': HTTP_STATUS.BAD_REQUEST,
                'INVALID_END_DATE': HTTP_STATUS.BAD_REQUEST
            };

            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;

            return res.status(statusCode).json({
                message: result.message,
                error: result.error,
                ...(result.invalidFields && { invalidFields: result.invalidFields }),
                ...(result.pendingRequestId && { pendingRequestId: result.pendingRequestId })
            });
        }

        return res.status(HTTP_STATUS.CREATED).json({
            message: 'Yêu cầu chỉnh sửa đã được gửi thành công. Vui lòng đợi admin duyệt.',
            updateRequest: result.updateRequest
        });
    } catch (error) {
        console.error('[Campaign Update Request Controller] Error creating request:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Admin xem danh sách update requests
 * GET /admin/campaign-update-requests
 */
export const getUpdateRequests = async (req, res) => {
    try {
        const status = req.query.status || 'pending'; // Mặc định là pending

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: 'status phải là: pending, approved, hoặc rejected'
            });
        }

        const requests = await updateRequestService.getUpdateRequests(status);

        return res.status(HTTP_STATUS.OK).json({
            count: requests.length,
            requests
        });
    } catch (error) {
        console.error('[Campaign Update Request Controller] Error getting requests:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Admin xem chi tiết một update request
 * GET /admin/campaign-update-requests/:id
 */
export const getUpdateRequestById = async (req, res) => {
    try {
        const requestId = req.params.id;

        const request = await updateRequestService.getUpdateRequestById(requestId);

        if (!request) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: 'Không tìm thấy update request'
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            request
        });
    } catch (error) {
        console.error('[Campaign Update Request Controller] Error getting request by id:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Admin approve update request
 * POST /admin/campaign-update-requests/:id/approve
 */
export const approveUpdateRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const adminId = req.user._id;

        const result = await updateRequestService.approveUpdateRequest(requestId, adminId);

        if (!result.success) {
            const errorStatusMap = {
                'REQUEST_NOT_FOUND': HTTP_STATUS.NOT_FOUND,
                'INVALID_STATUS': HTTP_STATUS.BAD_REQUEST,
                'CAMPAIGN_NOT_ACTIVE': HTTP_STATUS.BAD_REQUEST,
                'CONCURRENT_UPDATE': HTTP_STATUS.CONFLICT
            };

            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;

            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: 'Yêu cầu chỉnh sửa đã được duyệt và áp dụng thành công',
            updateRequest: result.updateRequest,
            campaign: result.campaign
        });
    } catch (error) {
        console.error('[Campaign Update Request Controller] Error approving request:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Admin reject update request
 * POST /admin/campaign-update-requests/:id/reject
 */
export const rejectUpdateRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const adminId = req.user._id;
        const { admin_note } = req.body;

        const result = await updateRequestService.rejectUpdateRequest(
            requestId,
            adminId,
            admin_note
        );

        if (!result.success) {
            const errorStatusMap = {
                'REQUEST_NOT_FOUND': HTTP_STATUS.NOT_FOUND,
                'INVALID_STATUS': HTTP_STATUS.BAD_REQUEST
            };

            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;

            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: 'Yêu cầu chỉnh sửa đã bị từ chối',
            updateRequest: result.updateRequest
        });
    } catch (error) {
        console.error('[Campaign Update Request Controller] Error rejecting request:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Creator xem update requests của campaign của mình
 * GET /campaigns/:id/update-requests
 */
export const getUpdateRequestsByCampaign = async (req, res) => {
    try {
        const campaignId = req.params.id;
        const userId = req.user._id;

        const requests = await updateRequestService.getUpdateRequestsByCampaign(campaignId, userId);

        return res.status(HTTP_STATUS.OK).json({
            count: requests.length,
            requests
        });
    } catch (error) {
        console.error('[Campaign Update Request Controller] Error getting requests by campaign:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || 'Internal server error'
        });
    }
};


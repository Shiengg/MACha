import { HTTP_STATUS } from "../utils/status.js";
import * as kycService from "../services/kyc.service.js";
import * as queueService from "../services/queue.service.js";

export const submitKYC = async (req, res) => {
    try {
        const userId = req.user._id;
        const kycData = req.body;

        const result = await kycService.submitKYC(userId, kycData);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
            if (result.error === 'ALREADY_VERIFIED') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Your account is already verified"
                });
            }
            if (result.error === 'PENDING_REVIEW') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Your KYC is already pending review"
                });
            }
            if (result.error === 'MISSING_REQUIRED_FIELDS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message,
                    missingFields: result.missingFields
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "KYC submitted successfully. Please wait for admin review.",
            kyc: result.kyc,
            user: result.user
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getKYCStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await kycService.getKYCStatus(userId);

        if (result.error) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "User not found"
            });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPendingKYCs = async (req, res) => {
    try {
        const kycs = await kycService.getPendingKYCs();

        return res.status(HTTP_STATUS.OK).json({
            count: kycs.length,
            kycs
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getKYCDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await kycService.getKYCDetails(userId);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
            if (result.error === 'NO_KYC_DATA') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "No KYC data found for this user"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json(result.data);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const approveKYC = async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user._id;

        const result = await kycService.approveKYC(userId, adminId);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
            if (result.error === 'NO_KYC_DATA') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "No KYC data found for this user"
                });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
        }

        try {
            await queueService.pushJob({
                type: "SEND_KYC_APPROVED",
                email: result.user.email,
                username: result.user.username,
            })
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "KYC approved successfully",
            kyc: result.kyc,
            user: result.user
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const rejectKYC = async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user._id;
        const { reason } = req.body;

        if (!reason || reason.trim().length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Rejection reason is required"
            });
        }

        const result = await kycService.rejectKYC(userId, adminId, reason);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
            if (result.error === 'NO_KYC_DATA') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "No KYC data found for this user"
                });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "KYC rejected successfully",
            kyc: result.kyc,
            user: result.user
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getKYCHistory = async (req, res) => {
    try {
        const userId = req.params.id || req.user._id;
        const history = await kycService.getKYCHistory(userId);

        return res.status(HTTP_STATUS.OK).json({
            count: history.length,
            history
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}


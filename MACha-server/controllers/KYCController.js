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

        // Check if KYC was rejected due to OCR mismatch
        if (result.kyc && result.kyc.status === 'rejected') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: result.message || "KYC đã bị từ chối do thông tin không khớp.",
                rejection_reason: result.kyc.rejection_reason,
                kyc: result.kyc,
                user: result.user,
                verification_result: result.verification_result
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: result.message || "KYC đã được gửi thành công. Vui lòng chờ admin duyệt.",
            kyc: result.kyc,
            user: result.user,
            verification_result: result.verification_result
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

export const submitKYCWithVNPT = async (req, res) => {
    try {
        const userId = req.user._id;
        const kycData = req.body;

        const result = await kycService.submitKYCWithVNPT(userId, kycData);

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
                    message: result.message
                });
            }
            if (result.error === 'VNPT_EKYC_FAILED') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message,
                    details: result.details
                });
            }
        }

        if (result.kyc && result.kyc.status === 'rejected') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: result.message,
                rejection_reason: result.kyc.rejection_reason,
                kyc: result.kyc,
                user: result.user,
                vnpt_result: result.vnpt_result
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: result.message,
            kyc: result.kyc,
            user: result.user,
            vnpt_result: result.vnpt_result
        });
    } catch (error) {
        console.error('❌ [KYC Controller] submitKYCWithVNPT error:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const verifyDocumentQuality = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('📋 [KYC Controller] Request body:', JSON.stringify(req.body));
        const { imageUrl } = req.body;

        if (!imageUrl) {
            console.error('❌ [KYC Controller] Missing imageUrl in request body');
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Image URL is required"
            });
        }

        console.log('🔵 [KYC Controller] Image URL:', typeof imageUrl, imageUrl);
        const result = await kycService.verifyDocumentQuality(userId, imageUrl);

        if (!result.success) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: result.message,
                error: result.error
            });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        console.error('❌ [KYC Controller] verifyDocumentQuality error:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const ocrDocument = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('📋 [KYC Controller OCR] Request body:', JSON.stringify(req.body));
        const { frontImageUrl, backImageUrl } = req.body;

        if (!frontImageUrl) {
            console.error('❌ [KYC Controller OCR] Missing frontImageUrl');
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Front image URL is required"
            });
        }

        console.log('🔵 [KYC Controller OCR] Front URL type:', typeof frontImageUrl);
        const result = await kycService.ocrDocument(userId, frontImageUrl, backImageUrl);

        if (!result.success) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: result.message,
                error: result.error
            });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        console.error('❌ [KYC Controller] ocrDocument error:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const compareFaces = async (req, res) => {
    try {
        const userId = req.user._id;
        const { faceImage1, faceImage2 } = req.body;

        if (!faceImage1 || !faceImage2) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Both face images are required"
            });
        }

        const result = await kycService.compareFaces(userId, faceImage1, faceImage2);

        if (!result.success) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: result.message,
                error: result.error
            });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        console.error('❌ [KYC Controller] compareFaces error:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}


import { HTTP_STATUS } from "../utils/status.js";
import * as donationService from "../services/donation.service.js";

export const createDonation = async (req, res) => {
    try {
        const campaignId = req.params.campaignId;
        const donorId = req.user._id;
        const donationData = req.body;

        const result = await donationService.createDonation(campaignId, donorId, donationData);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" });
        }

        const populatedDonation = await result.donation.populate([
            { path: "donor", select: "username fullname avatar" },
            {
                path: "companion",
                populate: {
                    path: "user",
                    select: "username fullname avatar"
                }
            }
        ]);

        res.status(HTTP_STATUS.CREATED).json({ donation: populatedDonation });
    } catch (error) {
        if (error.message.includes("Invalid companion")) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
        }
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getDonationsByCampaign = async (req, res) => {
    try {
        const donations = await donationService.getDonationsByCampaign(req.params.campaignId);
        
        res.status(HTTP_STATUS.OK).json(donations);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

/**
 * Upload proof images for a donation
 * POST /donations/:id/proof
 * Only the donor can upload proof
 */
export const uploadDonationProof = async (req, res) => {
    try {
        const donationId = req.params.id;
        const userId = req.user._id;
        const { proof_images } = req.body;

        if (!proof_images || !Array.isArray(proof_images) || proof_images.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: "proof_images là bắt buộc và phải là một mảng không rỗng" 
            });
        }

        // Validate image URLs (should be Cloudinary URLs)
        const validImageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i;
        for (const imageUrl of proof_images) {
            if (typeof imageUrl !== 'string' || !validImageUrlPattern.test(imageUrl)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "Định dạng URL ảnh không hợp lệ. Tất cả ảnh phải là URL hợp lệ" 
                });
            }
        }

        const result = await donationService.uploadDonationProof(donationId, userId, proof_images);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy donation" });
        }

        if (result.error) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: result.error });
        }

        res.status(HTTP_STATUS.OK).json({ 
            message: "Minh chứng đã được tải lên thành công",
            donation: result.donation 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

/**
 * Get proof images for a donation
 * GET /donations/:id/proof
 * Only donor, admin, or campaign owner can view proof
 */
export const getDonationProof = async (req, res) => {
    try {
        const donationId = req.params.id;
        const userId = req.user._id;
        const userRole = req.user.role;

        const result = await donationService.getDonationProof(donationId, userId, userRole);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy donation" });
        }

        if (result.error) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: result.error });
        }

        res.status(HTTP_STATUS.OK).json({ 
            has_proof: result.has_proof,
            proof_images: result.proof_images || [],
            proof_status: result.proof_status,
            proof_uploaded_at: result.proof_uploaded_at
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
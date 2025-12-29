import KYC from "../models/kyc.js";
import User from "../models/user.js";
import { redisClient } from "../config/redis.js";

// ==================== HELPER FUNCTIONS ====================

/**
 * Invalidate KYC-related caches
 */
const invalidateKYCCaches = async (userId) => {
    const keys = [
        `kyc:pending`,
        `kyc:user:${userId}`,
        `user:${userId}`,
    ];
    
    await Promise.all(keys.map(key => redisClient.del(key)));
};

/**
 * Update user's KYC status based on latest KYC
 */
const updateUserKYCStatus = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return;

    if (user.current_kyc_id) {
        const latestKYC = await KYC.findById(user.current_kyc_id);
        if (latestKYC) {
            // Map KYC status to user kyc_status
            // "pending" -> "pending", "verified" -> "verified", "rejected" -> "rejected"
            user.kyc_status = latestKYC.status === "pending" ? "pending" 
                : latestKYC.status === "verified" ? "verified" 
                : "rejected";
        } else {
            // If KYC not found, set to unverified
            user.kyc_status = "unverified";
            user.current_kyc_id = null;
        }
    } else {
        user.kyc_status = "unverified";
    }
    
    await user.save();
    await invalidateKYCCaches(userId);
};

// ==================== MAIN SERVICE FUNCTIONS ====================

/**
 * Submit KYC for verification
 */
export const submitKYC = async (userId, kycData) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    // Check if user already has verified KYC
    if (user.kyc_status === 'verified') {
        return { success: false, error: 'ALREADY_VERIFIED' };
    }
    
    // Check if user has pending KYC
    if (user.kyc_status === 'pending') {
        return { success: false, error: 'PENDING_REVIEW' };
    }
    
    // Validate required fields
    const requiredFields = ['identity_verified_name', 'identity_card_last4'];
    const missingFields = requiredFields.filter(field => {
        const extractedData = kycData.extracted_data || kycData;
        return !extractedData[field] && !kycData[field];
    });
    
    if (missingFields.length > 0) {
        return { 
            success: false, 
            error: 'MISSING_REQUIRED_FIELDS',
            message: 'Missing required fields',
            missingFields 
        };
    }
    
    // Get submission number (if user has previous submissions)
    let submissionNumber = 1;
    let previousKYCId = null;
    
    if (user.current_kyc_id) {
        const previousKYC = await KYC.findById(user.current_kyc_id);
        if (previousKYC) {
            submissionNumber = previousKYC.submission_number + 1;
            previousKYCId = previousKYC._id;
        }
    }
    
    // Prepare extracted data
    const extractedData = {
        identity_verified_name: kycData.identity_verified_name || kycData.extracted_data?.identity_verified_name,
        identity_card_last4: kycData.identity_card_last4 || kycData.extracted_data?.identity_card_last4,
        tax_code: kycData.tax_code || kycData.extracted_data?.tax_code,
        address: kycData.address || kycData.extracted_data?.address || {},
        bank_account: kycData.bank_account || kycData.extracted_data?.bank_account || {}
    };
    
    // Create new KYC submission
    const kyc = await KYC.create({
        user: userId,
        status: 'pending',
        documents: kycData.kyc_documents || kycData.documents || {},
        extracted_data: extractedData,
        submission_number: submissionNumber,
        previous_kyc_id: previousKYCId,
        submitted_at: new Date()
    });
    
    // Update user's current KYC reference and status
    user.current_kyc_id = kyc._id;
    user.kyc_status = 'pending';
    await user.save();
    
    await invalidateKYCCaches(userId);
    
    return { success: true, kyc, user };
};

/**
 * Get KYC status for current user
 */
export const getKYCStatus = async (userId) => {
    const user = await User.findById(userId).select('kyc_status current_kyc_id');
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    let kycDetails = null;
    if (user.current_kyc_id) {
        kycDetails = await KYC.findById(user.current_kyc_id)
            .select('status submitted_at verified_at rejected_at rejection_reason');
    }
    
    return {
        kyc_status: user.kyc_status,
        kyc_submitted_at: kycDetails?.submitted_at || null,
        kyc_verified_at: kycDetails?.verified_at || null,
        kyc_rejection_reason: kycDetails?.rejection_reason || null
    };
};

/**
 * Get all pending KYC submissions (Admin only)
 */
export const getPendingKYCs = async () => {
    const kycKey = 'kyc:pending';
    
    const cached = await redisClient.get(kycKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const kycs = await KYC.find({ status: 'pending' })
        .populate('user', 'username email fullname')
        .sort({ submitted_at: -1 });
    
    await redisClient.setEx(kycKey, 300, JSON.stringify(kycs));
    
    return kycs;
};

/**
 * Get KYC details for specific user (Admin only)
 */
export const getKYCDetails = async (userId) => {
    const user = await User.findById(userId)
        .select('username email fullname kyc_status current_kyc_id');
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (!user.current_kyc_id) {
        return { success: false, error: 'NO_KYC_DATA' };
    }
    
    const kyc = await KYC.findById(user.current_kyc_id)
        .populate('verified_by', 'username')
        .populate('rejected_by', 'username')
        .populate('manual_review.reviewed_by', 'username');
    
    if (!kyc) {
        return { success: false, error: 'NO_KYC_DATA' };
    }
    
    return { 
        success: true, 
        data: {
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullname: user.fullname,
                kyc_status: user.kyc_status
            },
            kyc_info: {
                status: kyc.status,
                documents: kyc.documents,
                extracted_data: kyc.extracted_data,
                ai_processing: kyc.ai_processing,
                manual_review: kyc.manual_review,
                submitted_at: kyc.submitted_at,
                processed_at: kyc.processed_at,
                verified_at: kyc.verified_at,
                rejected_at: kyc.rejected_at,
                verified_by: kyc.verified_by,
                rejected_by: kyc.rejected_by,
                rejection_reason: kyc.rejection_reason,
                submission_number: kyc.submission_number
            }
        }
    };
};

/**
 * Approve KYC (Admin only)
 */
export const approveKYC = async (userId, adminId) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (!user.current_kyc_id) {
        return { success: false, error: 'NO_KYC_DATA' };
    }
    
    const kyc = await KYC.findById(user.current_kyc_id);
    
    if (!kyc) {
        return { success: false, error: 'NO_KYC_DATA' };
    }
    
    if (kyc.status !== 'pending') {
        return { 
            success: false, 
            error: 'INVALID_STATUS',
            message: `Cannot approve KYC with status: ${kyc.status}. Only pending KYCs can be approved.`
        };
    }
    
    // Update KYC
    kyc.status = 'verified';
    kyc.verified_at = new Date();
    kyc.verified_by = adminId;
    kyc.processed_at = new Date();
    kyc.rejection_reason = null;
    await kyc.save();
    
    // Update user status
    user.kyc_status = 'verified';
    await user.save();
    
    await invalidateKYCCaches(userId);
    
    return { success: true, kyc, user };
};

/**
 * Reject KYC (Admin only)
 */
export const rejectKYC = async (userId, adminId, reason) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (!user.current_kyc_id) {
        return { success: false, error: 'NO_KYC_DATA' };
    }
    
    const kyc = await KYC.findById(user.current_kyc_id);
    
    if (!kyc) {
        return { success: false, error: 'NO_KYC_DATA' };
    }
    
    if (kyc.status !== 'pending') {
        return { 
            success: false, 
            error: 'INVALID_STATUS',
            message: `Cannot reject KYC with status: ${kyc.status}. Only pending KYCs can be rejected.`
        };
    }
    
    // Update KYC
    kyc.status = 'rejected';
    kyc.rejected_at = new Date();
    kyc.rejected_by = adminId;
    kyc.rejection_reason = reason;
    kyc.processed_at = new Date();
    await kyc.save();
    
    // Update user status
    user.kyc_status = 'rejected';
    await user.save();
    
    await invalidateKYCCaches(userId);
    
    return { success: true, kyc, user };
};

/**
 * Get KYC history for a user (all submissions)
 */
export const getKYCHistory = async (userId) => {
    const kycs = await KYC.find({ user: userId })
        .sort({ submission_number: -1 })
        .select('status submitted_at verified_at rejected_at rejection_reason submission_number');
    
    return kycs;
};


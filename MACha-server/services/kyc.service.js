import KYC from "../models/kyc.js";
import User from "../models/user.js";
import { redisClient } from "../config/redis.js";
import { verifyKYCWithOCR } from "./kyc-verification.service.js";
import * as vnptEKYC from "./vnpt-ekyc.service.js";

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse date from VNPT format (DD/MM/YYYY) to Date object
 */
const parseDateFromVNPT = (dateString) => {
    if (!dateString) return null;
    
    try {
        if (dateString.includes('/')) {
            const [day, month, year] = dateString.split('/');
            if (day && month && year) {
                const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                if (!isNaN(date.valueOf())) {
                    return date;
                }
            }
        }
        
        const date = new Date(dateString);
        if (!isNaN(date.valueOf())) {
            return date;
        }
        
        return null;
    } catch (error) {
        console.warn('⚠️ [KYC Service] Failed to parse date:', dateString, error);
        return null;
    }
};

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
export const submitKYCWithVNPT = async (userId, kycData) => {
    const startTime = Date.now();
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (user.kyc_status === 'verified') {
        return { success: false, error: 'ALREADY_VERIFIED' };
    }
    
    if (user.kyc_status === 'pending') {
        return { success: false, error: 'PENDING_REVIEW' };
    }

    const documents = kycData.kyc_documents || kycData.documents || {};
    const frontImageUrl = documents.identity_front_url;
    const backImageUrl = documents.identity_back_url;
    const selfieUrl = documents.selfie_url;

    if (!frontImageUrl) {
        return {
            success: false,
            error: 'MISSING_REQUIRED_FIELDS',
            message: 'Identity front image is required for VNPT eKYC verification'
        };
    }

    console.log('🔵 [KYC Service - VNPT] Starting VNPT eKYC verification...');
    
    const vnptResult = await vnptEKYC.verifyFullKYC(frontImageUrl, backImageUrl, selfieUrl, {
        userInput: {
            identity_card_number: kycData.identity_card_number || kycData.extracted_data?.identity_card_number,
            identity_verified_name: kycData.identity_verified_name || kycData.extracted_data?.identity_verified_name
        }
    });

    console.log('📊 [KYC Service - VNPT] VNPT eKYC result:', vnptResult.success ? 'SUCCESS' : 'FAILED');

    if (!vnptResult.success) {
        return {
            success: false,
            error: 'VNPT_EKYC_FAILED',
            message: vnptResult.message || 'VNPT eKYC verification failed',
            details: vnptResult
        };
    }

    let submissionNumber = 1;
    let previousKYCId = null;
    
    if (user.current_kyc_id) {
        const previousKYC = await KYC.findById(user.current_kyc_id);
        if (previousKYC) {
            submissionNumber = previousKYC.submission_number + 1;
            previousKYCId = previousKYC._id;
        }
    }

    const extractedData = {
        identity_verified_name: vnptResult.extracted_data.identity_verified_name || kycData.identity_verified_name,
        identity_card_number: vnptResult.extracted_data.identity_card_number || kycData.identity_card_number,
        date_of_birth: parseDateFromVNPT(vnptResult.extracted_data.date_of_birth),
        gender: vnptResult.extracted_data.gender,
        nationality: vnptResult.extracted_data.nationality,
        ethnicity: vnptResult.extracted_data.ethnicity,
        religion: vnptResult.extracted_data.religion,
        home_town: vnptResult.extracted_data.home_town,
        issue_date: parseDateFromVNPT(vnptResult.extracted_data.issue_date),
        issue_location: vnptResult.extracted_data.issue_location,
        expiry_date: parseDateFromVNPT(vnptResult.extracted_data.expiry_date),
        characteristics: vnptResult.extracted_data.characteristics,
        mrz_code: vnptResult.extracted_data.mrz_code,
        tax_code: kycData.tax_code || kycData.extracted_data?.tax_code,
        address: {
            full_address: vnptResult.extracted_data.address || kycData.address?.full_address,
            city: kycData.address?.city || '',
            district: kycData.address?.district || '',
            ward: kycData.address?.ward || '',
            address_entities: vnptResult.extracted_data.address_entities
        },
        bank_account: {
            ...(kycData.bank_account || kycData.extracted_data?.bank_account || {}),
            account_number: kycData.bank_account?.account_number || kycData.extracted_data?.bank_account?.account_number
        }
    };

    // Lấy độ tin cậy từ VNPT eKYC (0-1, cần nhân 100 để có %)
    const confidencePercent = (vnptResult.confidence || 0) * 100;
    
    let kycStatus = 'pending';
    let rejectionReason = null;
    let userKycStatus = 'pending';

    if (confidencePercent >= 85) {
        kycStatus = 'verified';
        userKycStatus = 'verified';
        console.log(`✅ [KYC Service] Độ tin cậy ${confidencePercent.toFixed(1)}% >= 85% → Tự động verified`);
    } else if (confidencePercent >= 50) {
        kycStatus = 'pending';
        userKycStatus = 'pending';
        console.log(`⏳ [KYC Service] Độ tin cậy ${confidencePercent.toFixed(1)}% (50-85%) → Pending admin duyệt`);
    } else {
        kycStatus = 'rejected';
        userKycStatus = 'unverified';
        rejectionReason = vnptResult.mismatch_reasons?.join(', ') || 
                         `Độ tin cậy quá thấp (${confidencePercent.toFixed(1)}% < 50%). ${vnptResult.warnings?.join('; ') || 'Thông tin xác thực không đạt yêu cầu'}`;
        console.log(`❌ [KYC Service] Độ tin cậy ${confidencePercent.toFixed(1)}% < 50% → Rejected`);
    }

    const processingTimeMs = Date.now() - startTime;

    const aiProcessingData = {
        provider: 'VNPT-eKYC',
        model_version: 'VNPT-eKYC-v3',
        processing_method: 'ai_auto',
        confidence_scores: {
            identity_match: vnptResult.ocr_result?.confidence || 0,
            face_match: vnptResult.face_compare_result?.similarity || 0,
            document_validity: vnptResult.ocr_result?.confidence || 0,
            overall_confidence: vnptResult.confidence || 0
        },
        face_comparison: vnptResult.face_compare_result ? {
            similarity: vnptResult.face_compare_result.similarity,
            is_match: vnptResult.face_compare_result.is_match,
            threshold: vnptResult.face_compare_result.threshold
        } : undefined,
        mismatch_reasons: vnptResult.mismatch_reasons || [],
        warnings: vnptResult.warnings || [],
        extracted_fields: vnptResult.extracted_data._raw_data,
        ai_notes: confidencePercent >= 85
            ? `VNPT eKYC xác thực thành công tự động (độ tin cậy: ${confidencePercent.toFixed(1)}%)` 
            : confidencePercent >= 50
            ? `VNPT eKYC yêu cầu xem xét thủ công (độ tin cậy: ${confidencePercent.toFixed(1)}%). ${vnptResult.warnings?.length > 0 ? 'Cảnh báo: ' + vnptResult.warnings.join('; ') : ''}`
            : `VNPT eKYC từ chối do độ tin cậy thấp (${confidencePercent.toFixed(1)}% < 50%). ${vnptResult.mismatch_reasons?.join(', ')}`,
        recommendation: vnptResult.recommendation,
        processing_time_ms: processingTimeMs
    };

    const kyc = await KYC.create({
        user: userId,
        status: kycStatus,
        documents: documents,
        extracted_data: extractedData,
        ai_processing: aiProcessingData,
        submission_number: submissionNumber,
        previous_kyc_id: previousKYCId,
        submitted_at: new Date(),
        processed_at: new Date(),
        ...(kycStatus === 'verified' ? {
            verified_at: new Date()
        } : {}),
        ...(kycStatus === 'rejected' ? {
            rejected_at: new Date(),
            rejection_reason: rejectionReason
        } : {})
    });

    user.current_kyc_id = kyc._id;
    user.kyc_status = userKycStatus;
    await user.save();
    
    await invalidateKYCCaches(userId);
    
    return { 
        success: true, 
        kyc, 
        user,
        vnpt_result: vnptResult,
        message: kycStatus === 'verified'
            ? `KYC đã được xác thực thành công tự động bởi VNPT eKYC (độ tin cậy: ${confidencePercent.toFixed(1)}%)`
            : kycStatus === 'pending' 
            ? `KYC đã được gửi thành công (độ tin cậy: ${confidencePercent.toFixed(1)}%). Vui lòng chờ admin duyệt.`
            : `KYC đã bị từ chối do độ tin cậy thấp (${confidencePercent.toFixed(1)}% < 50%).`
    };
};

export const submitKYC = async (userId, kycData) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (user.kyc_status === 'verified') {
        return { success: false, error: 'ALREADY_VERIFIED' };
    }
    
    if (user.kyc_status === 'pending') {
        return { success: false, error: 'PENDING_REVIEW' };
    }
    
    // Validate required fields
    const dataForValidation = kycData.extracted_data || kycData;
    const hasIdentityCard = dataForValidation.identity_card_number || kycData.identity_card_number || 
                           dataForValidation.identity_card_last4 || kycData.identity_card_last4;
    const hasIdentityName = dataForValidation.identity_verified_name || kycData.identity_verified_name;
    
    if (!hasIdentityName || !hasIdentityCard) {
        const missingFields = [];
        if (!hasIdentityName) missingFields.push('identity_verified_name');
        if (!hasIdentityCard) missingFields.push('identity_card_number');
        
        return { 
            success: false, 
            error: 'MISSING_REQUIRED_FIELDS',
            message: 'Missing required fields: ' + missingFields.join(', '),
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
    
    // Prepare extracted data (will be encrypted by pre-save hook)
    const extractedData = {
        identity_verified_name: kycData.identity_verified_name || kycData.extracted_data?.identity_verified_name,
        identity_card_number: kycData.identity_card_number || kycData.extracted_data?.identity_card_number,
        identity_card_last4: kycData.identity_card_last4 || kycData.extracted_data?.identity_card_last4,
        tax_code: kycData.tax_code || kycData.extracted_data?.tax_code,
        address: kycData.address || kycData.extracted_data?.address || {},
        bank_account: {
            ...(kycData.bank_account || kycData.extracted_data?.bank_account || {}),
            account_number: kycData.bank_account?.account_number || kycData.extracted_data?.bank_account?.account_number
        }
    };
    
    // Get documents
    const documents = kycData.kyc_documents || kycData.documents || {};
    const cccdImageUrl = documents.identity_front_url;
    
    // Perform OCR verification if CCCD image is available
    let verificationResult = null;
    let kycStatus = 'pending';
    let rejectionReason = null;
    let aiProcessingData = null;
    
    if (cccdImageUrl) {
        try {
            console.log('🔵 [KYC Service] Starting OCR verification...');
            console.log('📋 [KYC Service] User data:');
            console.log('  - Identity Card Number:', extractedData.identity_card_number);
            console.log('  - Name:', extractedData.identity_verified_name);
            console.log('  - CCCD Image URL:', cccdImageUrl);
            
            // Perform OCR verification
            verificationResult = await verifyKYCWithOCR(cccdImageUrl, {
                identity_card_number: extractedData.identity_card_number,
                identity_verified_name: extractedData.identity_verified_name
            });
            
            console.log('📊 [KYC Service] Verification result:', verificationResult.success ? 'SUCCESS' : 'FAILED');
            console.log('📦 [KYC Service] Full verification result:', JSON.stringify(verificationResult, null, 2));
            
            if (verificationResult.success) {
                // Update extracted data with OCR results if available
                if (verificationResult.ocr_data) {
                    // Parse date_of_birth from OCR (FPT AI returns "DD/MM/YYYY" format)
                    const ocrDob = verificationResult.ocr_data.date_of_birth;
                    if (ocrDob) {
                        try {
                            // Parse "DD/MM/YYYY" format to Date
                            const [day, month, year] = ocrDob.split('/');
                            if (day && month && year) {
                                extractedData.date_of_birth = new Date(`${year}-${month}-${day}`);
                            }
                        } catch (error) {
                            console.warn('⚠️ [KYC Service] Failed to parse date_of_birth:', ocrDob, error);
                        }
                    }
                    
                    // Parse address from OCR (FPT AI returns address as string, but model expects Object)
                    const ocrAddress = verificationResult.ocr_data.address;
                    if (ocrAddress) {
                        // FPT AI also provides address_entities with structured data
                        const addressEntities = verificationResult.ocr_data.address_entities;
                        if (addressEntities) {
                            extractedData.address = {
                                city: addressEntities.province || extractedData.address?.city || '',
                                district: addressEntities.district || extractedData.address?.district || '',
                                full_address: ocrAddress || extractedData.address?.full_address || ''
                            };
                        } else {
                            // Fallback: parse from string format "street, ward, district, province"
                            // For now, put the full address in full_address field
                            extractedData.address = {
                                ...(extractedData.address || {}),
                                full_address: ocrAddress,
                                city: extractedData.address?.city || '',
                                district: extractedData.address?.district || ''
                            };
                        }
                    }
                }
                
                // Set AI processing data
                aiProcessingData = {
                    model_version: 'FPT-AI-OCR',
                    processing_method: 'ai_auto',
                    confidence_scores: {
                        identity_match: verificationResult.comparison?.id_number?.confidence || 0,
                        face_match: 0, // Not available from OCR
                        document_validity: verificationResult.confidence || 0,
                        overall_confidence: verificationResult.confidence || 0
                    },
                    extracted_fields: verificationResult.ocr_data,
                    ai_notes: verificationResult.match 
                        ? 'Thông tin OCR khớp với thông tin người dùng nhập' 
                        : 'Thông tin OCR không khớp với thông tin người dùng nhập'
                };
                
                // Determine status based on verification result
                if (verificationResult.match) {
                    // Information matches - set to pending for admin review
                    kycStatus = 'pending';
                } else {
                    // Information doesn't match - reject automatically
                    kycStatus = 'rejected';
                    rejectionReason = verificationResult.rejection_reason || 'Thông tin OCR không khớp với thông tin đã nhập';
                }
            } else {
                // OCR failed, but still process the KYC as pending for manual review
                console.warn('OCR verification failed, setting KYC to pending for manual review:', verificationResult.error);
                kycStatus = 'pending';
                aiProcessingData = {
                    model_version: 'FPT-AI-OCR',
                    processing_method: 'ai_manual_review',
                    processing_errors: [{
                        field: 'ocr_verification',
                        error: verificationResult.message || verificationResult.error,
                        timestamp: new Date()
                    }],
                    ai_notes: 'OCR verification thất bại, cần review thủ công'
                };
            }
        } catch (error) {
            // OCR error, but still process the KYC as pending for manual review
            console.error('Error during OCR verification:', error);
            kycStatus = 'pending';
            aiProcessingData = {
                model_version: 'FPT-AI-OCR',
                processing_method: 'ai_manual_review',
                processing_errors: [{
                    field: 'ocr_verification',
                    error: error.message || 'Unknown error during OCR verification',
                    timestamp: new Date()
                }],
                ai_notes: 'Lỗi trong quá trình OCR verification, cần review thủ công'
            };
        }
    }
    
    // Create new KYC submission
    const kyc = await KYC.create({
        user: userId,
        status: kycStatus,
        documents: documents,
        extracted_data: extractedData,
        ai_processing: aiProcessingData,
        submission_number: submissionNumber,
        previous_kyc_id: previousKYCId,
        submitted_at: new Date(),
        processed_at: verificationResult ? new Date() : null,
        ...(kycStatus === 'rejected' ? {
            rejected_at: new Date(),
            rejection_reason: rejectionReason
        } : {})
    });
    
    // Update user's current KYC reference and status
    user.current_kyc_id = kyc._id;
    // If KYC is rejected (OCR mismatch), set user status to unverified (not rejected)
    // This allows user to retry KYC submission
    if (kycStatus === 'rejected') {
        user.kyc_status = 'unverified';
    } else {
        // For pending or verified, use the same status as KYC
        user.kyc_status = kycStatus;
    }
    await user.save();
    
    await invalidateKYCCaches(userId);
    
    return { 
        success: true, 
        kyc, 
        user,
        verification_result: verificationResult,
        message: kycStatus === 'pending' 
            ? 'KYC đã được gửi thành công. Vui lòng chờ admin duyệt.'
            : 'KYC đã bị từ chối do thông tin không khớp.'
    };
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
    
    user.kyc_status = 'unverified';
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

export const verifyDocumentQuality = async (userId, imageUrl) => {
    try {
        console.log('🔵 [KYC Service] Upload và kiểm tra loại giấy tờ...');
        
        const uploadResult = await vnptEKYC.uploadImage(imageUrl, 'quality-check', 'Kiểm tra chất lượng');
        
        if (!uploadResult.success) {
            return {
                success: false,
                message: uploadResult.message
            };
        }

        const classifyResult = await vnptEKYC.classifyCardType(uploadResult.hash);
        const livenessResult = await vnptEKYC.verifyCardLiveness(uploadResult.hash);
        
        // STRICT MODE: Bật để chặn cứng nếu phát hiện không phải ảnh gốc
        const STRICT_MODE = process.env.VNPT_EKYC_STRICT_MODE === 'true';
        
        if (STRICT_MODE && !livenessResult.is_real) {
            return {
                success: false,
                card_type: classifyResult.type_name,
                is_real: false,
                liveness_msg: livenessResult.liveness_msg,
                message: 'Ảnh không đạt chuẩn. VNPT phát hiện ảnh này có thể: (1) Chụp từ màn hình/thiết bị khác, (2) Là bản photocopy/scan, (3) Chụp qua lớp bảo vệ, (4) Chất lượng kém. Vui lòng chụp ảnh trực tiếp từ CCCD gốc với ánh sáng tốt.'
            };
        }
        
        // Message giải thích rõ ràng hơn
        let message = '';
        if (livenessResult.is_real) {
            message = `✅ Ảnh đạt chuẩn - ${classifyResult.type_name}`;
        } else {
            message = `⚠️ Ảnh chưa đạt chuẩn VNPT:\n` +
                     `• Có thể: chụp từ màn hình, photocopy, scan, hoặc chụp qua lớp nhựa\n` +
                     `• Chi tiết: ${livenessResult.liveness_msg}\n` +
                     `• OCR vẫn hoạt động nhưng KYC sẽ được admin xem xét thủ công`;
        }
        
        return {
            success: true,
            card_type: classifyResult.type_name,
            is_real: livenessResult.is_real,
            liveness_msg: livenessResult.liveness_msg,
            liveness_status: livenessResult.liveness,
            message: message
        };
    } catch (error) {
        console.error('❌ [KYC Service] Lỗi kiểm tra:', error);
        return {
            success: false,
            error: error.message,
            message: 'Lỗi khi kiểm tra giấy tờ'
        };
    }
};

export const ocrDocument = async (userId, frontImageUrl, backImageUrl = null) => {
    try {
        console.log('🔵 [KYC Service] Upload ảnh và thực hiện OCR...');
        
        const frontUpload = await vnptEKYC.uploadImage(frontImageUrl, 'cccd-front', 'OCR mặt trước');
        if (!frontUpload.success) {
            return {
                success: false,
                message: 'Upload ảnh mặt trước thất bại: ' + frontUpload.message
            };
        }

        let backUpload = null;
        if (backImageUrl) {
            backUpload = await vnptEKYC.uploadImage(backImageUrl, 'cccd-back', 'OCR mặt sau');
        }

        const result = await vnptEKYC.ocrDocument(
            frontUpload.hash,
            backUpload?.success ? backUpload.hash : null
        );
        
        if (!result.success) {
            return {
                success: false,
                error: result.error,
                message: result.message
            };
        }
        
        return {
            success: true,
            extracted_data: result.extracted_data,
            confidence: result.confidence,
            warnings: result.warnings,
            warning_messages: result.warning_messages,
            message: 'OCR thành công'
        };
    } catch (error) {
        console.error('❌ [KYC Service] Lỗi OCR:', error);
        return {
            success: false,
            error: error.message,
            message: 'Lỗi khi thực hiện OCR'
        };
    }
};

export const compareFaces = async (userId, cardImage, faceImage) => {
    try {
        console.log('🔵 [KYC Service] Upload ảnh và so sánh khuôn mặt...');
        
        const cardUpload = await vnptEKYC.uploadImage(cardImage, 'card-face', 'Khuôn mặt trên giấy tờ');
        if (!cardUpload.success) {
            return {
                success: false,
                message: 'Upload ảnh giấy tờ thất bại: ' + cardUpload.message
            };
        }

        const faceUpload = await vnptEKYC.uploadImage(faceImage, 'selfie', 'Ảnh chân dung');
        if (!faceUpload.success) {
            return {
                success: false,
                message: 'Upload ảnh chân dung thất bại: ' + faceUpload.message
            };
        }

        const result = await vnptEKYC.compareFace(cardUpload.hash, faceUpload.hash);
        
        if (!result.success) {
            return {
                success: false,
                error: result.error,
                message: result.message
            };
        }
        
        return {
            success: true,
            similarity: result.similarity,
            probability: result.probability,
            is_match: result.is_match,
            result_text: result.result,
            message: result.result
        };
    } catch (error) {
        console.error('❌ [KYC Service] Lỗi so sánh khuôn mặt:', error);
        return {
            success: false,
            error: error.message,
            message: 'Lỗi khi so sánh khuôn mặt'
        };
    }
};

export const submitOrganizationKYC = async (userId, kycData) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }

    if (user.role !== 'organization') {
        return { success: false, error: 'INVALID_ROLE', message: 'Only organization users can submit organization KYC' };
    }

    if (user.kyc_status === 'verified') {
        return { success: false, error: 'ALREADY_VERIFIED' };
    }

    if (user.kyc_status === 'pending') {
        return { success: false, error: 'PENDING_REVIEW' };
    }

    const { legal_representative, organization_documents } = kycData;

    if (!legal_representative || !organization_documents) {
        return {
            success: false,
            error: 'MISSING_REQUIRED_FIELDS',
            message: 'legal_representative and organization_documents are required'
        };
    }

    const requiredFields = [
        'fullname',
        'id_card_number',
        'position',
        'id_card_front_url',
        'id_card_back_url',
        'selfie_url'
    ];

    const missingFields = requiredFields.filter(field => !legal_representative[field]);
    if (missingFields.length > 0) {
        return {
            success: false,
            error: 'MISSING_REQUIRED_FIELDS',
            message: `Missing required fields in legal_representative: ${missingFields.join(', ')}`,
            missingFields
        };
    }

    const orgRequiredFields = [
        'business_license_url',
        'establishment_decision_url',
        'tax_code',
        'organization_name',
        'organization_address'
    ];

    const missingOrgFields = orgRequiredFields.filter(field => !organization_documents[field]);
    if (missingOrgFields.length > 0) {
        return {
            success: false,
            error: 'MISSING_REQUIRED_FIELDS',
            message: `Missing required fields in organization_documents: ${missingOrgFields.join(', ')}`,
            missingFields: missingOrgFields
        };
    }

    let submissionNumber = 1;
    let previousKYCId = null;
    
    if (user.current_kyc_id) {
        const previousKYC = await KYC.findById(user.current_kyc_id);
        if (previousKYC) {
            submissionNumber = previousKYC.submission_number + 1;
            previousKYCId = previousKYC._id;
        }
    }

    const idCardNumber = legal_representative.id_card_number;
    const idCardLast4 = idCardNumber && idCardNumber.length >= 4 ? idCardNumber.slice(-4) : null;

    const kyc = await KYC.create({
        user: userId,
        kyc_type: 'organization',
        status: 'pending',
        documents: {
            identity_front_url: legal_representative.id_card_front_url,
            identity_back_url: legal_representative.id_card_back_url,
            selfie_url: legal_representative.selfie_url
        },
        extracted_data: {
            identity_verified_name: legal_representative.fullname,
            identity_card_number: idCardNumber,
            identity_card_last4: idCardLast4,
            tax_code: organization_documents.tax_code
        },
        organization_data: {
            legal_representative: {
                fullname: legal_representative.fullname,
                id_card_number: idCardNumber,
                id_card_last4: idCardLast4,
                position: legal_representative.position,
                id_card_front_url: legal_representative.id_card_front_url,
                id_card_back_url: legal_representative.id_card_back_url,
                selfie_url: legal_representative.selfie_url
            },
            organization_documents: {
                business_license_url: organization_documents.business_license_url,
                establishment_decision_url: organization_documents.establishment_decision_url,
                tax_code: organization_documents.tax_code,
                organization_name: organization_documents.organization_name,
                organization_address: organization_documents.organization_address
            }
        },
        submission_number: submissionNumber,
        previous_kyc_id: previousKYCId,
        submitted_at: new Date()
    });

    user.current_kyc_id = kyc._id;
    user.kyc_status = 'pending';
    await user.save();

    if (organization_documents.organization_name && organization_documents.organization_name !== user.fullname) {
        user.fullname = organization_documents.organization_name;
        await user.save();
    }
    
    await invalidateKYCCaches(userId);
    
    return {
        success: true,
        kyc,
        user,
        message: 'KYC đã được gửi để duyệt'
    };
};


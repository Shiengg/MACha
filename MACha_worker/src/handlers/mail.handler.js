import { sendEmail, validateEmails } from "../services/mail.service.js";
import { EMAIL_CONFIG } from "../constants/index.js";
import * as emailTemplates from "../templates/email.templates.js";
import { JOB_TYPES } from "../schemas/job.schema.js";

/**
 * Handle mail job with standardized format
 * 
 * @param {Object} job - Standardized job object with { jobId, type, payload, meta }
 * @returns {Promise<Object>} Result from sendEmail
 */
export const handleMailJob = async (job) => {
    if (!job || !job.type || !job.payload) {
        throw new Error("Invalid job: must have type and payload");
    }

    const { type, payload, meta } = job;
    const requestId = meta?.requestId || "unknown";
    const userId = meta?.userId || "unknown";

    // Validate email address
    if (!payload.email || typeof payload.email !== "string") {
        throw new Error("Missing or invalid email address in payload");
    }

    const email = payload.email.trim().toLowerCase();
    if (!validateEmails([email])) {
        throw new Error("Invalid email address format");
    }

    // Generate email template based on job type
    let emailData = null;

    switch (type) {
        case JOB_TYPES.SEND_OTP:
            if (!payload.username || !payload.otp || !payload.expiresIn) {
                throw new Error("Missing required fields for SEND_OTP: username, otp, expiresIn");
            }
            emailData = emailTemplates.generateOtpEmail({
                username: payload.username,
                otp: payload.otp,
                expiresIn: payload.expiresIn
            });
            break;

        case JOB_TYPES.SEND_OTP_SIGNUP:
            if (!payload.username || !payload.otp || !payload.expiresIn) {
                throw new Error("Missing required fields for SEND_OTP_SIGNUP: username, otp, expiresIn");
            }
            emailData = emailTemplates.generateOtpSignupEmail({
                username: payload.username,
                otp: payload.otp,
                expiresIn: payload.expiresIn
            });
            break;

        case JOB_TYPES.SEND_FORGOT_PASSWORD:
            if (!payload.username || !payload.newPassword) {
                throw new Error("Missing required fields for SEND_FORGOT_PASSWORD: username, newPassword");
            }
            emailData = emailTemplates.generateForgotPasswordEmail({
                username: payload.username,
                newPassword: payload.newPassword
            });
            break;

        case JOB_TYPES.SEND_KYC_APPROVED:
            if (!payload.username) {
                throw new Error("Missing required field for SEND_KYC_APPROVED: username");
            }
            emailData = emailTemplates.generateKycApprovedEmail({
                username: payload.username
            });
            break;

        case JOB_TYPES.CAMPAIGN_APPROVED:
            if (!payload.username || !payload.campaignTitle || !payload.campaignId) {
                throw new Error("Missing required fields for CAMPAIGN_APPROVED: username, campaignTitle, campaignId");
            }
            emailData = emailTemplates.generateCampaignApprovedEmail({
                username: payload.username,
                campaignTitle: payload.campaignTitle,
                campaignId: payload.campaignId
            });
            break;

        case JOB_TYPES.CAMPAIGN_REJECTED:
            if (!payload.username || !payload.campaignTitle || !payload.campaignId) {
                throw new Error("Missing required fields for CAMPAIGN_REJECTED: username, campaignTitle, campaignId");
            }
            emailData = emailTemplates.generateCampaignRejectedEmail({
                username: payload.username,
                campaignTitle: payload.campaignTitle,
                campaignId: payload.campaignId,
                reason: payload.reason || 'Không có lý do cụ thể'
            });
            break;

        case JOB_TYPES.CAMPAIGN_REMOVED:
            if (!payload.username || !payload.campaignTitle || !payload.campaignId) {
                throw new Error("Missing required fields for CAMPAIGN_REMOVED: username, campaignTitle, campaignId");
            }
            emailData = emailTemplates.generateCampaignRemovedEmail({
                username: payload.username,
                campaignTitle: payload.campaignTitle,
                campaignId: payload.campaignId,
                resolutionDetails: payload.resolutionDetails || 'Chiến dịch của bạn đã bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha'
            });
            break;

        case JOB_TYPES.DONATION_THANK_YOU:
            if (!payload.email || !payload.amount || !payload.currency) {
                throw new Error("Missing required fields for DONATION_THANK_YOU: email, amount, currency");
            }
            emailData = emailTemplates.generateDonationThankYouEmail({
                donorName: payload.donorName || null,
                amount: payload.amount,
                currency: payload.currency,
                transactionTime: payload.transactionTime || payload.createdAt || new Date().toISOString(),
                transactionId: payload.transactionId || null
            });
            break;

        case JOB_TYPES.ESCROW_THRESHOLD_EMAIL:
            if (!payload.email || !payload.campaignTitle || !payload.campaignId) {
                throw new Error("Missing required fields for ESCROW_THRESHOLD_EMAIL: email, campaignTitle, campaignId");
            }
            emailData = emailTemplates.generateEscrowThresholdReachedEmail({
                donorName: payload.donorName || null,
                campaignTitle: payload.campaignTitle,
                campaignId: payload.campaignId,
                escrowId: payload.escrowId || null,
                milestonePercentage: payload.milestonePercentage || null
            });
            break;

        default:
            throw new Error(`Unknown email job type: ${type}`);
    }

    console.log(`[Mail Handler] Processing email job:`, {
        requestId,
        userId,
        type,
        email,
    });

    // Send via Nodemailer with Gmail
    const result = await sendEmail({
        to: email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        from: EMAIL_CONFIG.FROM_EMAIL,
        fromName: EMAIL_CONFIG.FROM_NAME
    });

    if (result.success) {
        console.log(`[Mail Handler] Email sent successfully:`, {
            requestId,
            userId,
            type,
            messageId: result.messageId,
            email,
        });
        return result;
    }

    if (result.error && result.error.isPermanent) {
        console.error(`[Mail Handler] Permanent error, not retrying:`, {
            requestId,
            userId,
            type,
            error: result.error.message,
            email,
        });
        throw result.error;
    }

    console.warn(`[Mail Handler] Temporary error, will retry:`, {
        requestId,
        userId,
        type,
        error: result.error.message,
        errorType: result.errorType,
        email,
    });

    throw result.error;
};


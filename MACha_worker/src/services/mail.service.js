import nodemailer from "nodemailer";
import { EMAIL_CONFIG, ERROR_TYPES } from "../constants/index.js";

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_CONFIG.USER,
        pass: EMAIL_CONFIG.PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

const isRetryableError = (error) => {
    // Network errors - retryable
    if (error.code === "ECONNRESET" || 
        error.code === "ETIMEDOUT" || 
        error.code === "ENOTFOUND" ||
        error.code === "ECONNREFUSED" ||
        error.message?.includes("timeout")) {
        return { retryable: true, type: ERROR_TYPES.TEMPORARY };
    }

    // Rate limiting - retryable
    if (error.code === "ETIMEDOUT" || error.message?.includes("rate limit") || error.responseCode === 421) {
        return { retryable: true, type: ERROR_TYPES.RATE_LIMIT };
    }

    // Authentication errors - permanent
    if (error.code === "EAUTH" || error.responseCode === 535) {
        return { retryable: false, type: ERROR_TYPES.PERMANENT };
    }

    // Invalid email addresses - permanent
    if (error.responseCode === 550 || error.code === "EENVELOPE") {
        return { retryable: false, type: ERROR_TYPES.PERMANENT };
    }

    // Other SMTP errors - check response code
    if (error.responseCode) {
        // 4xx - permanent client errors
        if (error.responseCode >= 400 && error.responseCode < 500) {
            return { retryable: false, type: ERROR_TYPES.PERMANENT };
        }
        // 5xx - temporary server errors
        if (error.responseCode >= 500 && error.responseCode < 600) {
            return { retryable: true, type: ERROR_TYPES.TEMPORARY };
        }
    }

    // Default to retryable for unknown errors
    return { retryable: true, type: ERROR_TYPES.TEMPORARY };
};

export const sendEmail = async (params) => {
    const {
        to,
        subject,
        html,
        text,
        from = EMAIL_CONFIG.FROM_EMAIL,
        fromName = EMAIL_CONFIG.FROM_NAME,
    } = params;

    if (!to || !subject) {
        const error = new Error("Missing required fields: to and subject are required");
        error.isPermanent = true;
        throw error;
    }

    if (!html && !text) {
        const error = new Error("Either html or text content is required");
        error.isPermanent = true;
        throw error;
    }

    // Format from field
    let fromField = from;
    if (fromName && fromName.trim()) {
        const sanitizedName = fromName.trim().replace(/[<>]/g, '');
        fromField = `${sanitizedName} <${from}>`;
    }

    // Prepare mail options for nodemailer
    const mailOptions = {
        from: fromField,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
    };

    if (html) {
        mailOptions.html = html;
    }

    if (text) {
        mailOptions.text = text;
    }

    try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
                () => reject(new Error(`Email sending timeout after ${EMAIL_CONFIG.TIMEOUT}ms`)),
                EMAIL_CONFIG.TIMEOUT
            );
        });

        // Send email with timeout
        const sendPromise = transporter.sendMail(mailOptions);
        const result = await Promise.race([sendPromise, timeoutPromise]);

        return {
            success: true,
            messageId: result.messageId || result.response?.replace(/.*<([^>]+)>.*/, '$1'),
        };
    } catch (error) {
        const { retryable, type } = isRetryableError(error);
        
        error.isPermanent = !retryable;
        error.errorType = type;

        console.error(`[Mail Service] Failed to send email (exception):`, {
            to,
            subject,
            error: error.message,
            code: error.code,
            responseCode: error.responseCode,
            retryable,
            type,
        });

        return {
            success: false,
            error,
            retryable,
            errorType: type,
        };
    }
};

export const validateEmail = (email) => {
    if (!email || typeof email !== "string") {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateEmails = (emails) => {
    if (Array.isArray(emails)) {
        return emails.every(validateEmail);
    }
    return validateEmail(emails);
};



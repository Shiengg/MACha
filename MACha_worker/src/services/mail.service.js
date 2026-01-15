import nodemailer from "nodemailer";
import { Resend } from "resend";
import { EMAIL_CONFIG, ERROR_TYPES } from "../constants/index.js";

// Initialize Resend client if API key is provided
let resendClient = null;
if (EMAIL_CONFIG.USE_RESEND && EMAIL_CONFIG.RESEND_API_KEY) {
    resendClient = new Resend(EMAIL_CONFIG.RESEND_API_KEY);
    console.log("[Mail Service] Using Resend HTTP API for email sending");
} else {
    console.log("[Mail Service] Using Nodemailer + Gmail SMTP (fallback mode)");
}

// Create reusable transporter using Gmail SMTP (fallback only)
const transporter = EMAIL_CONFIG.USE_RESEND ? null : nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_CONFIG.USER,
        pass: EMAIL_CONFIG.PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

const isRetryableError = (error, isResend = false) => {
    // Resend API errors
    if (isResend) {
        // Resend returns error objects with status codes
        const statusCode = error.status || error.statusCode || error.response?.status;
        
        // 4xx - permanent client errors (bad request, auth, validation)
        if (statusCode >= 400 && statusCode < 500) {
            // 429 (rate limit) is retryable
            if (statusCode === 429) {
                return { retryable: true, type: ERROR_TYPES.RATE_LIMIT };
            }
            return { retryable: false, type: ERROR_TYPES.PERMANENT };
        }
        
        // 5xx - temporary server errors
        if (statusCode >= 500 && statusCode < 600) {
            return { retryable: true, type: ERROR_TYPES.TEMPORARY };
        }
        
        // Network/timeout errors - retryable
        if (error.message?.includes("timeout") || 
            error.message?.includes("ECONNREFUSED") ||
            error.message?.includes("ENOTFOUND") ||
            error.code === "ETIMEDOUT" ||
            error.code === "ECONNRESET") {
            return { retryable: true, type: ERROR_TYPES.TEMPORARY };
        }
        
        // Default for unknown Resend errors
        return { retryable: true, type: ERROR_TYPES.TEMPORARY };
    }

    // Nodemailer/SMTP errors (original logic)
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

    try {
        // Use Resend if API key is available
        if (EMAIL_CONFIG.USE_RESEND && resendClient) {
            // Resend API expects array of recipients
            const recipients = Array.isArray(to) ? to : [to];
            
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(
                    () => reject(new Error(`Email sending timeout after ${EMAIL_CONFIG.TIMEOUT}ms`)),
                    EMAIL_CONFIG.TIMEOUT
                );
            });

            // Send via Resend HTTP API
            const sendPromise = resendClient.emails.send({
                from: fromField,
                to: recipients,
                subject,
                html: html || undefined,
                text: text || undefined,
            });

            const result = await Promise.race([sendPromise, timeoutPromise]);

            if (result.error) {
                throw result.error;
            }

            return {
                success: true,
                messageId: result.data?.id || result.id || `resend-${Date.now()}`,
            };
        }

        // Fallback to Nodemailer + Gmail SMTP
        if (!transporter) {
            throw new Error("No email provider configured. Please set RESEND_API_KEY or EMAIL_USER/EMAIL_PASSWORD");
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
        const isResend = EMAIL_CONFIG.USE_RESEND && resendClient;
        const { retryable, type } = isRetryableError(error, isResend);
        
        error.isPermanent = !retryable;
        error.errorType = type;

        console.error(`[Mail Service] Failed to send email (exception):`, {
            to,
            subject,
            error: error.message,
            code: error.code,
            statusCode: error.status || error.statusCode || error.responseCode,
            responseCode: error.responseCode,
            retryable,
            type,
            provider: isResend ? 'Resend' : 'Nodemailer/Gmail',
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



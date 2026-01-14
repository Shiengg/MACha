import { Resend } from "resend";
import { RESEND_CONFIG, ERROR_TYPES } from "../constants/index.js";

const resend = new Resend(RESEND_CONFIG.API_KEY);

const isRetryableError = (error) => {
    if (error.code === "ECONNRESET" || 
        error.code === "ETIMEDOUT" || 
        error.code === "ENOTFOUND" ||
        error.message?.includes("timeout")) {
        return { retryable: true, type: ERROR_TYPES.TEMPORARY };
    }

    if (error.status === 429 || error.message?.includes("rate limit")) {
        return { retryable: true, type: ERROR_TYPES.RATE_LIMIT };
    }

    if (error.status >= 500 && error.status < 600) {
        return { retryable: true, type: ERROR_TYPES.TEMPORARY };
    }

    if (error.status >= 400 && error.status < 500) {
        return { retryable: false, type: ERROR_TYPES.PERMANENT };
    }

    return { retryable: true, type: ERROR_TYPES.TEMPORARY };
};

export const sendEmail = async (params) => {
    const {
        to,
        subject,
        html,
        text,
        from = RESEND_CONFIG.FROM_EMAIL,
        fromName = RESEND_CONFIG.FROM_NAME,
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

    let fromField = from;
    if (fromName && fromName.trim()) {
        const sanitizedName = fromName.trim().replace(/[<>]/g, '');
        fromField = `${sanitizedName} <${from}>`;
    }

    const emailPayload = {
        from: fromField,
        to: Array.isArray(to) ? to : [to],
        subject,
    };

    if (html) {
        emailPayload.html = html;
    }

    if (text) {
        emailPayload.text = text;
    }

    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
                () => reject(new Error(`Resend API timeout after ${RESEND_CONFIG.TIMEOUT}ms`)),
                RESEND_CONFIG.TIMEOUT
            );
        });

        const sendPromise = resend.emails.send(emailPayload);

        const result = await Promise.race([sendPromise, timeoutPromise]);

        if (result.error) {
            const error = new Error(result.error.message || "Resend API error");
            error.status = result.error.status || result.error.statusCode;
            error.code = result.error.code;
            
            const { retryable, type } = isRetryableError(error);
            error.isPermanent = !retryable;
            error.errorType = type;

            console.error(`[Mail Service] Resend API returned error:`, {
                to,
                subject,
                error: error.message,
                status: error.status,
                code: error.code,
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

        return {
            success: true,
            messageId: result.data?.id,
        };
    } catch (error) {
        const { retryable, type } = isRetryableError(error);
        
        error.isPermanent = !retryable;
        error.errorType = type;

        console.error(`[Mail Service] Failed to send email (exception):`, {
            to,
            subject,
            error: error.message,
            status: error.status,
            code: error.code,
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


import { sendEmail, validateEmails } from "../services/mail.service.js";
import { RESEND_CONFIG } from "../constants/index.js";

const normalizeRecipients = (to) => {
    if (!to) {
        throw new Error("Recipient 'to' is required");
    }

    const recipients = Array.isArray(to) ? to : [to];
    
    const normalized = recipients
        .filter(email => email && typeof email === "string")
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0);

    if (normalized.length === 0) {
        throw new Error("No valid recipients provided");
    }

    return normalized;
};

const validatePayload = (payload) => {
    if (!payload || typeof payload !== "object") {
        throw new Error("Invalid payload: must be an object");
    }

    if (!payload.to) {
        throw new Error("Missing required field: 'to'");
    }

    const recipients = normalizeRecipients(payload.to);
    
    if (!validateEmails(recipients)) {
        throw new Error("Invalid email address format");
    }

    if (!payload.subject || typeof payload.subject !== "string" || payload.subject.trim().length === 0) {
        throw new Error("Missing or invalid 'subject'");
    }

    if (!payload.html && !payload.text && !payload.template) {
        throw new Error("Missing content: provide 'html', 'text', or 'template'");
    }

    if (payload.template && !payload.html && !payload.text) {
        throw new Error("Template rendering not implemented yet. Please provide 'html' or 'text'");
    }
};

export const handleMailJob = async (payload) => {
    validatePayload(payload);

    const recipients = normalizeRecipients(payload.to);

    const emailParams = {
        to: recipients.length === 1 ? recipients[0] : recipients,
        subject: payload.subject.trim(),
        html: payload.html,
        text: payload.text,
        from: payload.from || RESEND_CONFIG.FROM_EMAIL,
        fromName: payload.fromName || RESEND_CONFIG.FROM_NAME,
    };

    const requestId = payload.meta?.requestId || "unknown";
    const userId = payload.meta?.userId || "unknown";
    console.log(`[Mail Handler] Processing email job:`, {
        requestId,
        userId,
        to: recipients,
        subject: emailParams.subject,
    });

    const result = await sendEmail(emailParams);

    if (result.success) {
        console.log(`[Mail Handler] Email sent successfully:`, {
            requestId,
            userId,
            messageId: result.messageId,
            to: recipients,
        });
        return result;
    }

    if (result.error && result.error.isPermanent) {
        console.error(`[Mail Handler] Permanent error, not retrying:`, {
            requestId,
            userId,
            error: result.error.message,
            to: recipients,
        });
        throw result.error;
    }

    console.warn(`[Mail Handler] Temporary error, will retry:`, {
        requestId,
        userId,
        error: result.error.message,
        errorType: result.errorType,
        to: recipients,
    });
    
    throw result.error;
};


export const QUEUE_NAMES = {
    MAIL_SEND: process.env.MAIL_QUEUE_NAME || "mail.send",
    MAIL_DLQ: process.env.MAIL_DLQ_NAME || "mail.send.dlq", // Dead Letter Queue
};

export const RETRY_CONFIG = {
    MAX_RETRIES: Number(process.env.MAIL_MAX_RETRIES) || 3,
    RETRY_DELAY: Number(process.env.MAIL_RETRY_DELAY) || 5000,
};

export const RESEND_CONFIG = {
    API_KEY: process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL || "noreply@example.com",
    FROM_NAME: process.env.FROM_NAME || "MACha",
    TIMEOUT: Number(process.env.RESEND_TIMEOUT) || 10000,
};

export const ERROR_TYPES = {
    PERMANENT: "PERMANENT",
    TEMPORARY: "TEMPORARY",
    RATE_LIMIT: "RATE_LIMIT",
};


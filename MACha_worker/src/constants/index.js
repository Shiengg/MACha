export const QUEUE_NAMES = {
    MAIL_SEND: process.env.MAIL_QUEUE_NAME || "mail.send",
    MAIL_DLQ: process.env.MAIL_DLQ_NAME || "mail.send.dlq", // Dead Letter Queue
    NOTIFICATION_CREATE: process.env.NOTIFICATION_QUEUE_NAME || "notification.create",
};

export const RETRY_CONFIG = {
    MAX_RETRIES: Number(process.env.MAIL_MAX_RETRIES) || 3,
    RETRY_DELAY: Number(process.env.MAIL_RETRY_DELAY) || 5000,
};

export const EMAIL_CONFIG = {
    USER: process.env.EMAIL_USER,
    PASSWORD: process.env.EMAIL_PASSWORD,
    FROM_EMAIL: process.env.FROM_EMAIL || process.env.EMAIL_USER,
    FROM_NAME: process.env.FROM_NAME || "MACha",
    TIMEOUT: Number(process.env.EMAIL_TIMEOUT) || 10000,
};

export const ERROR_TYPES = {
    PERMANENT: "PERMANENT",
    TEMPORARY: "TEMPORARY",
    RATE_LIMIT: "RATE_LIMIT",
};


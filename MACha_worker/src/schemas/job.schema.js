/**
 * Job Schema - Single Source of Truth
 * 
 * All jobs MUST follow this schema. No backward compatibility.
 * Fail fast if job doesn't match this schema.
 */

/**
 * Job Types Enum (must match server schema)
 */
export const JOB_TYPES = {
    // Email jobs
    SEND_OTP: 'SEND_OTP',
    SEND_OTP_SIGNUP: 'SEND_OTP_SIGNUP',
    SEND_FORGOT_PASSWORD: 'SEND_FORGOT_PASSWORD',
    SEND_KYC_APPROVED: 'SEND_KYC_APPROVED',
    CAMPAIGN_APPROVED: 'CAMPAIGN_APPROVED',
    CAMPAIGN_REJECTED: 'CAMPAIGN_REJECTED',
    CAMPAIGN_REMOVED: 'CAMPAIGN_REMOVED',
    DONATION_THANK_YOU: 'DONATION_THANK_YOU',
    
    // Notification jobs
    POST_LIKED: 'POST_LIKED',
    COMMENT_ADDED: 'COMMENT_ADDED',
    USER_FOLLOWED: 'USER_FOLLOWED',
    POST_REMOVED: 'POST_REMOVED',
    USER_WARNED: 'USER_WARNED',
    EVENT_UPDATE_CREATED: 'EVENT_UPDATE_CREATED',
    EVENT_REMOVED: 'EVENT_REMOVED',
    EVENT_STARTED: 'EVENT_STARTED',
    CAMPAIGN_CREATED: 'CAMPAIGN_CREATED',
    ESCROW_THRESHOLD_REACHED: 'ESCROW_THRESHOLD_REACHED',
    ESCROW_APPROVED_BY_ADMIN: 'ESCROW_APPROVED_BY_ADMIN',
};

/**
 * Job Source Enum
 */
export const JOB_SOURCE = {
    API: 'api',
    SYSTEM: 'system',
    ADMIN: 'admin',
};

/**
 * Validate job object matches schema (fail fast)
 * 
 * @param {Object} job - Job object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If job is invalid
 */
export const validateJob = (job) => {
    if (!job || typeof job !== 'object' || Array.isArray(job)) {
        throw new Error('Job must be a non-null object');
    }

    // Required fields
    if (!job.jobId || typeof job.jobId !== 'string') {
        throw new Error('Job must have a valid jobId (UUID string)');
    }

    if (!job.type || !Object.values(JOB_TYPES).includes(job.type)) {
        throw new Error(`Job must have a valid type. Got: ${job.type}`);
    }

    if (!job.payload || typeof job.payload !== 'object' || Array.isArray(job.payload)) {
        throw new Error('Job must have a valid payload object');
    }

    if (!job.meta || typeof job.meta !== 'object' || Array.isArray(job.meta)) {
        throw new Error('Job must have a valid meta object');
    }

    // Required meta fields
    if (!job.meta.requestId || typeof job.meta.requestId !== 'string') {
        throw new Error('Job meta must have a valid requestId (string)');
    }

    if (!job.meta.createdAt || typeof job.meta.createdAt !== 'string') {
        throw new Error('Job meta must have a valid createdAt (ISO string)');
    }

    if (!job.meta.source || !Object.values(JOB_SOURCE).includes(job.meta.source)) {
        throw new Error(`Job meta must have a valid source. Got: ${job.meta.source}`);
    }

    // Optional but typed fields
    if (job.meta.userId !== null && job.meta.userId !== undefined && typeof job.meta.userId !== 'string') {
        throw new Error('Job meta userId must be a string or null');
    }

    if (job.meta.retryCount !== undefined && (typeof job.meta.retryCount !== 'number' || job.meta.retryCount < 0)) {
        throw new Error('Job meta retryCount must be a non-negative number');
    }

    return true;
};

/**
 * Assert job is valid (fail fast)
 * 
 * @param {Object} job - Job object to validate
 * @throws {Error} If job is invalid
 */
export const assertJob = (job) => {
    validateJob(job);
};


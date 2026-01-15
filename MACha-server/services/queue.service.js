/**
 * Queue Service - RabbitMQ Implementation
 * 
 * Migrated from Redis LPUSH/RPOP to RabbitMQ
 * 
 * Job Types:
 * - Email jobs → mail.send queue
 * - Notification jobs → notification.create queue
 * 
 * All jobs MUST follow the standardized job schema.
 * Jobs are validated before queuing - fail fast if invalid.
 */

import { sendToQueue } from "../config/rabbitmq.js";
import { validateJob, JOB_TYPES } from "../schemas/job.schema.js";

// Queue names (matching worker constants)
const QUEUE_NAMES = {
    MAIL_SEND: process.env.MAIL_QUEUE_NAME || "mail.send",
    NOTIFICATION_CREATE: process.env.NOTIFICATION_QUEUE_NAME || "notification.create",
};

/**
 * Push job to appropriate queue based on job type
 * 
 * @param {Object} job - Standardized job object (must match job schema)
 * @returns {Promise<boolean>} - True if job was queued successfully
 * @throws {Error} If job doesn't match schema
 */
export const pushJob = async (job) => {
    // Validate job against schema (fail fast)
    try {
        validateJob(job);
    } catch (error) {
        console.error(`[Queue Service] Invalid job format:`, error.message);
        throw new Error(`Job validation failed: ${error.message}`);
    }

    const jobType = job.type;
    let targetQueue = null;

    // Map job types to queues
    switch (jobType) {
        // Email jobs → mail.send queue
        case JOB_TYPES.SEND_OTP:
        case JOB_TYPES.SEND_OTP_SIGNUP:
        case JOB_TYPES.SEND_FORGOT_PASSWORD:
        case JOB_TYPES.SEND_KYC_APPROVED:
        case JOB_TYPES.CAMPAIGN_APPROVED:
        case JOB_TYPES.CAMPAIGN_REJECTED:
        case JOB_TYPES.CAMPAIGN_REMOVED:
            targetQueue = QUEUE_NAMES.MAIL_SEND;
            break;

        // Notification jobs → notification.create queue
        case JOB_TYPES.POST_LIKED:
        case JOB_TYPES.COMMENT_ADDED:
        case JOB_TYPES.USER_FOLLOWED:
        case JOB_TYPES.POST_REMOVED:
        case JOB_TYPES.USER_WARNED:
        case JOB_TYPES.EVENT_UPDATE_CREATED:
        case JOB_TYPES.EVENT_REMOVED:
        case JOB_TYPES.CAMPAIGN_CREATED:
            targetQueue = QUEUE_NAMES.NOTIFICATION_CREATE;
            break;

        // Empty/unused jobs - log warning but don't queue
        case "SIGNUP":
            console.warn(`[Queue Service] Job type '${jobType}' is not implemented, skipping`);
            return true;

        default:
            console.warn(`[Queue Service] Unknown job type '${jobType}', defaulting to notification queue`);
            targetQueue = QUEUE_NAMES.NOTIFICATION_CREATE;
    }

    try {
        // Add queue metadata (preserving existing meta)
        const jobWithMeta = {
            ...job,
            meta: {
                ...job.meta,
                queuedAt: new Date().toISOString(),
                queue: targetQueue,
            },
        };

        await sendToQueue(targetQueue, jobWithMeta);
        return true;
    } catch (error) {
        console.error(`[Queue Service] Failed to queue job type '${jobType}' to '${targetQueue}':`, error);
        throw error;
    }
};

// Export queue names for reference
export { QUEUE_NAMES };

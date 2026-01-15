/**
 * Notification Consumer for Worker
 * 
 * Consumes messages from notification.create queue and processes them
 */

import { consumeMessages, ackMessage, nackMessage, republishMessage } from "../config/rabbitmq.js";
import { handleNotificationJob } from "../handlers/notification.handler.js";
import { assertJob } from "../schemas/job.schema.js";
import { QUEUE_NAMES, RETRY_CONFIG } from "../constants/index.js";

const getRetryCount = (msg) => {
    if (!msg.properties.headers) return 0;
    return Number(msg.properties.headers["x-retry-count"]) || 0;
};

const incrementRetryCount = (msg) => {
    const headers = msg.properties.headers || {};
    const currentRetry = getRetryCount(msg);
    return {
        ...headers,
        "x-retry-count": currentRetry + 1,
    };
};

const shouldRetry = (msg, error) => {
    const retryCount = getRetryCount(msg);
    if (retryCount >= RETRY_CONFIG.MAX_RETRIES) return false;
    if (error && error.isPermanent) return false;
    return true;
};

const processNotificationMessage = async (content, msg, channel) => {
    const requestId = content.meta?.requestId || msg.properties.messageId || "unknown";
    const userId = content.meta?.userId || "unknown";
    const retryCount = getRetryCount(msg);

    console.log(`[Notification Consumer] Received message:`, {
        requestId,
        userId,
        retryCount,
        jobType: content.type,
        queue: QUEUE_NAMES.NOTIFICATION_CREATE,
    });

    try {
        if (!content || typeof content !== "object") {
            throw new Error("Invalid message: content must be an object");
        }

        // Validate job format (fail fast)
        assertJob(content);

        const result = await handleNotificationJob(content);

        await ackMessage(msg);
        
        console.log(`[Notification Consumer] Message processed successfully:`, {
            requestId,
            userId,
            jobType: content.type,
            skipped: result.skipped || false,
            count: result.count || 1,
        });
    } catch (error) {
        const canRetry = shouldRetry(msg, error);

        if (canRetry) {
            // Increment retry count
            const newRetryCount = getRetryCount(msg) + 1;
            
            console.warn(`[Notification Consumer] Retrying message:`, {
                requestId,
                userId,
                retryCount: newRetryCount,
                maxRetries: RETRY_CONFIG.MAX_RETRIES,
                error: error.message,
                isPermanent: error.isPermanent || false
            });
            
            // CRITICAL FIX: Republish message with updated headers instead of nack with requeue
            // This ensures headers (retry count) are preserved correctly
            try {
                await republishMessage(msg, QUEUE_NAMES.NOTIFICATION_CREATE, {
                    "x-retry-count": newRetryCount
                });
            } catch (republishError) {
                // If republish fails, discard message to prevent infinite loop
                console.error(`[Notification Consumer] Failed to republish message, discarding:`, {
                    requestId,
                    userId,
                    error: republishError.message
                });
                await nackMessage(msg, false);
            }
        } else {
            const retryCount = getRetryCount(msg);
            const reason = retryCount >= RETRY_CONFIG.MAX_RETRIES 
                ? `Max retries exceeded (${retryCount}/${RETRY_CONFIG.MAX_RETRIES})` 
                : "Permanent error";

            console.error(`[Notification Consumer] Message failed permanently:`, {
                requestId,
                userId,
                retryCount,
                reason,
                error: error.message,
                errorName: error.name,
                isPermanent: error.isPermanent || false
            });

            // Discard message permanently (don't requeue)
            await nackMessage(msg, false);
        }
    }
};

export const startNotificationConsumer = async () => {
    try {
        console.log(`[Notification Consumer] Starting consumer for queue: ${QUEUE_NAMES.NOTIFICATION_CREATE}`);
        
        const consumerTag = await consumeMessages(
            QUEUE_NAMES.NOTIFICATION_CREATE,
            processNotificationMessage,
            {
                requeueOnError: true,
            }
        );

        const tag = consumerTag?.consumerTag || consumerTag || "unknown";
        console.log(`[Notification Consumer] Consumer started successfully (tag: ${tag})`);
        return consumerTag;
    } catch (error) {
        console.error(`[Notification Consumer] Failed to start consumer:`, error);
        throw error;
    }
};


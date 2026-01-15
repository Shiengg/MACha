import { consumeMessages, ackMessage, nackMessage } from "../config/rabbitmq.js";
import { handleMailJob } from "../handlers/mail.handler.js";
import { assertJob } from "../schemas/job.schema.js";
import { QUEUE_NAMES, RETRY_CONFIG } from "../constants/index.js";

const getRetryCount = (msg) => {
    if (!msg.properties.headers) {
        return 0;
    }
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
    
    if (retryCount >= RETRY_CONFIG.MAX_RETRIES) {
        return false;
    }

    if (error && error.isPermanent) {
        return false;
    }

    return true;
};

const processMailMessage = async (content, msg, channel) => {
    const requestId = content.meta?.requestId || msg.properties.messageId || "unknown";
    const userId = content.meta?.userId || "unknown";
    const retryCount = getRetryCount(msg);

    console.log(`[Mail Consumer] Received message:`, {
        requestId,
        userId,
        retryCount,
        queue: QUEUE_NAMES.MAIL_SEND,
    });

    try {
        if (!content || typeof content !== "object") {
            throw new Error("Invalid message: content must be an object");
        }

        // Validate job format (fail fast)
        assertJob(content);

        const result = await handleMailJob(content);

        await ackMessage(msg);
        
        console.log(`[Mail Consumer] Message processed successfully:`, {
            requestId,
            userId,
            messageId: result.messageId,
        });
    } catch (error) {
        const canRetry = shouldRetry(msg, error);

        if (canRetry) {
            const newHeaders = incrementRetryCount(msg);
            
            console.warn(`[Mail Consumer] Retrying message:`, {
                requestId,
                userId,
                retryCount: getRetryCount(msg) + 1,
                maxRetries: RETRY_CONFIG.MAX_RETRIES,
                error: error.message,
            });
            
            await nackMessage(msg, true);
        } else {
            const reason = getRetryCount(msg) >= RETRY_CONFIG.MAX_RETRIES 
                ? "Max retries exceeded" 
                : "Permanent error";

            console.error(`[Mail Consumer] Message failed permanently:`, {
                requestId,
                userId,
                retryCount: getRetryCount(msg),
                reason,
                error: error.message,
            });

            await nackMessage(msg, false);
        }
    }
};

export const startMailConsumer = async () => {
    try {
        console.log(`[Mail Consumer] Starting consumer for queue: ${QUEUE_NAMES.MAIL_SEND}`);
        
        const consumerTag = await consumeMessages(
            QUEUE_NAMES.MAIL_SEND,
            processMailMessage,
            {
                requeueOnError: true,
            }
        );

        const tag = consumerTag?.consumerTag || consumerTag || "unknown";
        console.log(`[Mail Consumer] Consumer started successfully (tag: ${tag})`);
        return consumerTag;
    } catch (error) {
        console.error(`[Mail Consumer] Failed to start consumer:`, error);
        throw error;
    }
};


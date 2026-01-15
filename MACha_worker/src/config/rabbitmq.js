/**
 * RabbitMQ Configuration for Worker
 * 
 * Singleton connection pattern:
 * - 1 connection cho toàn bộ worker
 * - 1 channel cho consumer với prefetch hợp lý
 * - Auto-reconnect khi broker restart
 * - Graceful shutdown
 */

import amqplib from "amqplib";
import dotenv from "dotenv";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const PREFETCH_COUNT = Number(process.env.RABBITMQ_PREFETCH_COUNT) || 5;
const MAX_RETRIES = Number(process.env.RABBITMQ_MAX_RETRIES) || 10;
const RETRY_DELAY_BASE = Number(process.env.RABBITMQ_RETRY_DELAY_BASE) || 1000;
const RETRY_DELAY_MAX = Number(process.env.RABBITMQ_RETRY_DELAY_MAX) || 30000;
const CONNECTION_TIMEOUT = Number(process.env.RABBITMQ_CONNECTION_TIMEOUT) || 10000;
const HEARTBEAT = Number(process.env.RABBITMQ_HEARTBEAT) || 60;

// Singleton state
let connection = null;
let consumerChannel = null;
let isConnecting = false;
let connectionPromise = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let isShuttingDown = false;

/**
 * Calculate exponential backoff delay với jitter
 */
const calculateBackoffDelay = (attempt) => {
    const delay = Math.min(
        RETRY_DELAY_BASE * Math.pow(2, attempt),
        RETRY_DELAY_MAX
    );
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
};

/**
 * Log RabbitMQ events
 */
const logEvent = (event, data = {}) => {
    const timestamp = new Date().toISOString();
    const prefix = isShuttingDown ? "🛑" : "🐰";
    
    switch (event) {
        case "connecting":
            console.log(`${prefix} [RabbitMQ] Connecting... (attempt ${data.attempt || 1})`);
            break;
        case "connected":
            console.log(`✅ [RabbitMQ] Connected successfully`);
            break;
        case "disconnected":
            console.log(`❌ [RabbitMQ] Disconnected: ${data.reason || "Unknown reason"}`);
            break;
        case "error":
            console.error(`❌ [RabbitMQ] Error:`, data.error?.message || data.message);
            if (data.error?.stack && process.env.NODE_ENV === "development") {
                console.error(data.error.stack);
            }
            break;
        case "reconnecting":
            console.log(`🔄 [RabbitMQ] Reconnecting in ${data.delay}ms (attempt ${data.attempt}/${MAX_RETRIES})`);
            break;
        case "reconnect_failed":
            console.error(`❌ [RabbitMQ] Max reconnection attempts (${MAX_RETRIES}) reached. Exiting.`);
            process.exit(1);
            break;
        case "channel_created":
            console.log(`✅ [RabbitMQ] Consumer channel created (prefetch: ${data.prefetch})`);
            break;
        default:
            console.log(`[RabbitMQ] ${event}:`, data);
    }
};

/**
 * Cleanup connections và channels
 */
const cleanup = async () => {
    try {
        if (consumerChannel) {
            await consumerChannel.close().catch(() => {});
            consumerChannel = null;
        }
        
        if (connection) {
            await connection.close().catch(() => {});
            connection = null;
        }
    } catch (error) {
        logEvent("error", { error, message: "Error during cleanup" });
    }
};

/**
 * Setup connection event handlers
 */
const setupConnectionHandlers = (conn) => {
    conn.on("close", () => {
        logEvent("disconnected", { reason: "Connection closed by broker" });
        connection = null;
        consumerChannel = null;
        
        if (!isShuttingDown) {
            scheduleReconnect();
        }
    });

    conn.on("error", (err) => {
        logEvent("error", { error: err, message: "Connection error" });
    });

    conn.on("blocked", (reason) => {
        logEvent("error", { message: `Connection blocked: ${reason}` });
    });

    conn.on("unblocked", () => {
        logEvent("connected", { message: "Connection unblocked" });
    });
};

/**
 * Schedule reconnection với exponential backoff
 */
const scheduleReconnect = () => {
    if (isShuttingDown || reconnectTimer) {
        return;
    }

    if (reconnectAttempts >= MAX_RETRIES) {
        logEvent("reconnect_failed");
        return;
    }

    const delay = calculateBackoffDelay(reconnectAttempts);
    reconnectAttempts++;

    logEvent("reconnecting", { delay, attempt: reconnectAttempts });

    reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        try {
            await connectRabbitMQ();
        } catch (error) {
            scheduleReconnect();
        }
    }, delay);
};

/**
 * Connect to RabbitMQ (singleton)
 */
export const connectRabbitMQ = async () => {
    // Check if connection is still alive
    if (connection && connection.connection && connection.connection.stream && !connection.connection.stream.destroyed) {
        return connection;
    }

    // If already connecting, wait for that promise
    if (isConnecting && connectionPromise) {
        return await connectionPromise;
    }

    if (isShuttingDown) {
        throw new Error("Cannot connect: Application is shutting down");
    }

    isConnecting = true;
    reconnectAttempts = 0;

    connectionPromise = (async () => {
        try {
            logEvent("connecting", { attempt: reconnectAttempts + 1 });

            const connectPromise = amqplib.connect(RABBITMQ_URL, {
                heartbeat: HEARTBEAT,
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Connection timeout after ${CONNECTION_TIMEOUT}ms`)),
                    CONNECTION_TIMEOUT
                )
            );

            connection = await Promise.race([connectPromise, timeoutPromise]);
            
            setupConnectionHandlers(connection);

            logEvent("connected");
            reconnectAttempts = 0;

            return connection;
        } catch (error) {
            logEvent("error", { error, message: "Failed to connect" });
            connection = null;
            
            if (!isShuttingDown) {
                scheduleReconnect();
            }
            
            throw error;
        } finally {
            isConnecting = false;
            connectionPromise = null;
        }
    })();

    return await connectionPromise;
};

/**
 * Get consumer channel (singleton, với prefetch)
 */
export const getConsumerChannel = async () => {
    // Check if channel is still alive
    if (consumerChannel && !consumerChannel.connection.destroyed) {
        return consumerChannel;
    }

    const conn = await connectRabbitMQ();
    
    try {
        consumerChannel = await conn.createChannel();
        
        // Set prefetch để không nhận quá nhiều message cùng lúc
        await consumerChannel.prefetch(PREFETCH_COUNT);

        consumerChannel.on("error", (err) => {
            logEvent("error", { error: err, message: "Consumer channel error" });
            consumerChannel = null;
        });

        consumerChannel.on("close", () => {
            logEvent("disconnected", { reason: "Consumer channel closed" });
            consumerChannel = null;
        });

        logEvent("channel_created", { prefetch: PREFETCH_COUNT });
        return consumerChannel;
    } catch (error) {
        logEvent("error", { error, message: "Failed to create consumer channel" });
        consumerChannel = null;
        throw error;
    }
};

/**
 * Assert queue exists
 */
export const assertQueue = async (queueName, options = {}) => {
    const channel = await getConsumerChannel();
    
    const defaultOptions = {
        durable: true, // Queue survives broker restart
        ...options,
    };

    const queueInfo = await channel.assertQueue(queueName, defaultOptions);
    logEvent("connected", { message: `Queue '${queueName}' asserted` });
    return queueInfo;
};

/**
 * Consume messages from queue
 * 
 * @param {string} queueName - Queue name
 * @param {Function} handler - Handler function: async (content, msg, channel) => {}
 * @param {Object} options - Consumer options
 */
export const consumeMessages = async (queueName, handler, options = {}) => {
    const channel = await getConsumerChannel();
    
    // Ensure queue exists
    await assertQueue(queueName);

    const defaultOptions = {
        noAck: false, // Manual acknowledgment
        ...options,
    };

    const consumerTag = await channel.consume(queueName, async (msg) => {
        if (!msg) {
            logEvent("disconnected", { reason: `Consumer cancelled for queue '${queueName}'` });
            return;
        }

        try {
            // Parse message content
            let content = msg.content.toString();
            try {
                content = JSON.parse(content);
            } catch (parseError) {
                // JSON parse error - permanent error, don't requeue
                logEvent("error", { 
                    error: parseError, 
                    message: `Invalid JSON in message from queue '${queueName}' - discarding message` 
                });
                channel.nack(msg, false, false); // Don't requeue - permanent error
                return;
            }

            // Call handler (handler is responsible for ack/nack with retry logic)
            await handler(content, msg, channel);
        } catch (error) {
            // Error at consumeMessages level (should not happen if handler handles errors correctly)
            // Check retry count from headers to prevent infinite retry
            const headers = msg.properties.headers || {};
            const retryCount = Number(headers["x-retry-count"]) || 0;
            const MAX_CONSUME_ERROR_RETRIES = 5; // Hard limit for errors at consumeMessages level
            
            logEvent("error", { 
                error, 
                message: `Error at consumeMessages level for queue '${queueName}' (retry count: ${retryCount})`,
                retryCount
            });
            
            // Don't requeue if:
            // 1. Error is permanent
            // 2. Retry count exceeded MAX_CONSUME_ERROR_RETRIES (hard limit)
            // 3. requeueOnError is explicitly false
            const shouldRequeue = options.requeueOnError !== false && 
                                 !error.isPermanent && 
                                 retryCount < MAX_CONSUME_ERROR_RETRIES;
            
            if (!shouldRequeue) {
                const reason = error.isPermanent 
                    ? "Permanent error" 
                    : retryCount >= MAX_CONSUME_ERROR_RETRIES 
                        ? `Max consume error retries (${MAX_CONSUME_ERROR_RETRIES}) exceeded`
                        : "requeueOnError is false";
                
                logEvent("error", {
                    message: `Message discarded from queue '${queueName}': ${reason}`,
                    reason,
                    retryCount
                });
            }
            
            channel.nack(msg, false, shouldRequeue);
        }
    }, defaultOptions);

    logEvent("connected", { message: `Started consuming queue '${queueName}' (tag: ${consumerTag})` });
    return consumerTag;
};

/**
 * Acknowledge message
 */
export const ackMessage = async (msg, allUpTo = false) => {
    if (!msg) return;
    const channel = await getConsumerChannel();
    channel.ack(msg, allUpTo);
};

/**
 * Negative acknowledge message
 */
export const nackMessage = async (msg, requeue = false) => {
    if (!msg) return;
    const channel = await getConsumerChannel();
    channel.nack(msg, false, requeue);
};

/**
 * Republish message to queue with updated headers (for retry)
 * This ensures headers are preserved when retrying
 * 
 * @param {Object} msg - Original message
 * @param {string} queueName - Queue name to republish to
 * @param {Object} updatedHeaders - Updated headers (e.g. retry count)
 * @returns {Promise<boolean>} True if republished successfully
 */
export const republishMessage = async (msg, queueName, updatedHeaders = {}) => {
    if (!msg) return false;
    
    try {
        const channel = await getConsumerChannel();
        
        // Get original content
        const content = msg.content.toString();
        
        // Merge headers
        const originalHeaders = msg.properties?.headers || {};
        const mergedHeaders = {
            ...originalHeaders,
            ...updatedHeaders
        };
        
        // Create new message properties with updated headers
        const properties = {
            ...msg.properties,
            headers: mergedHeaders,
            timestamp: Date.now() // Update timestamp
        };
        
        // Republish message with updated headers
        const sent = channel.sendToQueue(queueName, Buffer.from(content), {
            persistent: true,
            ...properties
        });
        
        // ACK original message (we've republished it)
        channel.ack(msg, false);
        
        return sent;
    } catch (error) {
        logEvent("error", { 
            error, 
            message: `Failed to republish message to queue '${queueName}'` 
        });
        // If republish fails, nack without requeue to prevent infinite loop
        await nackMessage(msg, false);
        throw error;
    }
};

/**
 * Get RabbitMQ health status
 */
export const getRabbitMQHealth = () => {
    const isConnected = connection && 
                       connection.connection && 
                       connection.connection.stream && 
                       !connection.connection.stream.destroyed;

    return {
        connected: isConnected,
        hasConsumerChannel: consumerChannel !== null && 
                           consumerChannel.connection && 
                           !consumerChannel.connection.destroyed,
        reconnectAttempts: reconnectAttempts,
        isConnecting: isConnecting,
    };
};

/**
 * Graceful shutdown
 */
export const disconnectRabbitMQ = async () => {
    isShuttingDown = true;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    logEvent("disconnected", { reason: "Graceful shutdown initiated" });
    await cleanup();
    logEvent("disconnected", { reason: "Graceful shutdown completed" });
};


import amqplib from "amqplib";
import dotenv from "dotenv";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const MAX_RETRIES = Number(process.env.RABBITMQ_MAX_RETRIES) || 10;
const RETRY_DELAY_BASE = Number(process.env.RABBITMQ_RETRY_DELAY_BASE) || 1000;
const RETRY_DELAY_MAX = Number(process.env.RABBITMQ_RETRY_DELAY_MAX) || 30000;
const CONNECTION_TIMEOUT = Number(process.env.RABBITMQ_CONNECTION_TIMEOUT) || 10000;
const HEARTBEAT = Number(process.env.RABBITMQ_HEARTBEAT) || 60;
const PREFETCH_COUNT = Number(process.env.RABBITMQ_PREFETCH_COUNT) || 10;

let connection = null;
let publisherChannel = null;
let consumerChannel = null;
let isConnecting = false;
let connectionPromise = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let isShuttingDown = false;

const calculateBackoffDelay = (attempt) => {
    const delay = Math.min(
        RETRY_DELAY_BASE * Math.pow(2, attempt),
        RETRY_DELAY_MAX
    );
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
};

const logRabbitMQEvent = (event, data = {}) => {
    const timestamp = new Date().toISOString();
    const prefix = isShuttingDown ? "🛑" : "🐰";
    
    switch (event) {
        case "connecting":
            console.log(`${prefix} [RabbitMQ] Connecting... (attempt ${data.attempt || 1})`);
            break;
        case "connected":
            console.log(`[RabbitMQ] Connected successfully`);
            break;
        case "disconnected":
            console.log(`[RabbitMQ] Disconnected: ${data.reason || "Unknown reason"}`);
            break;
        case "error":
            console.error(`[RabbitMQ] Error:`, data.error?.message || data.message);
            if (data.error?.stack && process.env.NODE_ENV === "development") {
                console.error(data.error.stack);
            }
            break;
        case "reconnecting":
            console.log(`[RabbitMQ] Reconnecting in ${data.delay}ms (attempt ${data.attempt}/${MAX_RETRIES})`);
            break;
        case "reconnect_failed":
            console.error(`[RabbitMQ] Max reconnection attempts (${MAX_RETRIES}) reached. Giving up.`);
            break;
        case "channel_created":
            console.log(`[RabbitMQ] ${data.type} channel created`);
            break;
        case "channel_error":
            console.error(`[RabbitMQ] ${data.type} channel error:`, data.error?.message);
            break;
        default:
            console.log(`[RabbitMQ] ${event}:`, data);
    }
};

const cleanup = async () => {
    try {
        if (consumerChannel) {
            await consumerChannel.close().catch(() => {});
            consumerChannel = null;
        }
        
        if (publisherChannel) {
            await publisherChannel.close().catch(() => {});
            publisherChannel = null;
        }
        
        if (connection) {
            await connection.close().catch(() => {});
            connection = null;
        }
    } catch (error) {
        logRabbitMQEvent("error", { error, message: "Error during cleanup" });
    }
};

const setupConnectionHandlers = (conn) => {
    conn.on("close", () => {
        logRabbitMQEvent("disconnected", { reason: "Connection closed by broker" });
        connection = null;
        publisherChannel = null;
        consumerChannel = null;
        
        if (!isShuttingDown) {
            scheduleReconnect();
        }
    });

    conn.on("error", (err) => {
        logRabbitMQEvent("error", { error: err, message: "Connection error" });
    });

    conn.on("blocked", (reason) => {
        logRabbitMQEvent("error", { message: `Connection blocked: ${reason}` });
    });

    conn.on("unblocked", () => {
        logRabbitMQEvent("connected", { message: "Connection unblocked" });
    });
};

const scheduleReconnect = () => {
    if (isShuttingDown || reconnectTimer) {
        return;
    }

    if (reconnectAttempts >= MAX_RETRIES) {
        logRabbitMQEvent("reconnect_failed");
        return;
    }

    const delay = calculateBackoffDelay(reconnectAttempts);
    reconnectAttempts++;

    logRabbitMQEvent("reconnecting", { delay, attempt: reconnectAttempts });

    reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        try {
            await connectRabbitMQ();
        } catch (error) {
            scheduleReconnect();
        }
    }, delay);
};

export const connectRabbitMQ = async () => {
    if (connection && connection.connection && connection.connection.stream && !connection.connection.stream.destroyed) {
        return connection;
    }

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
            logRabbitMQEvent("connecting", { attempt: reconnectAttempts + 1 });

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

            logRabbitMQEvent("connected");
            reconnectAttempts = 0;

            return connection;
        } catch (error) {
            logRabbitMQEvent("error", { error, message: "Failed to connect" });
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

export const getPublisherChannel = async () => {
    if (publisherChannel && !publisherChannel.connection.destroyed) {
        return publisherChannel;
    }

    const conn = await connectRabbitMQ();
    
    try {
        publisherChannel = await conn.createConfirmChannel();
        
        publisherChannel.on("error", (err) => {
            logRabbitMQEvent("channel_error", { type: "Publisher", error: err });
            publisherChannel = null;
        });

        publisherChannel.on("close", () => {
            logRabbitMQEvent("disconnected", { reason: "Publisher channel closed" });
            publisherChannel = null;
        });

        logRabbitMQEvent("channel_created", { type: "Publisher (Confirm)" });
        return publisherChannel;
    } catch (error) {
        logRabbitMQEvent("error", { error, message: "Failed to create publisher channel" });
        publisherChannel = null;
        throw error;
    }
};

export const getConsumerChannel = async () => {
    if (consumerChannel && !consumerChannel.connection.destroyed) {
        return consumerChannel;
    }

    const conn = await connectRabbitMQ();
    
    try {
        consumerChannel = await conn.createChannel();
        
        await consumerChannel.prefetch(PREFETCH_COUNT);

        consumerChannel.on("error", (err) => {
            logRabbitMQEvent("channel_error", { type: "Consumer", error: err });
            consumerChannel = null;
        });

        consumerChannel.on("close", () => {
            logRabbitMQEvent("disconnected", { reason: "Consumer channel closed" });
            consumerChannel = null;
        });

        logRabbitMQEvent("channel_created", { type: "Consumer", prefetch: PREFETCH_COUNT });
        return consumerChannel;
    } catch (error) {
        logRabbitMQEvent("error", { error, message: "Failed to create consumer channel" });
        consumerChannel = null;
        throw error;
    }
};

export const publishMessage = async (exchange, routingKey, content, options = {}) => {
    const channel = await getPublisherChannel();
    
    const message = Buffer.isBuffer(content) 
        ? content 
        : Buffer.from(typeof content === "string" ? content : JSON.stringify(content));

    const defaultOptions = {
        persistent: true,
        timestamp: Date.now(),
        ...options,
    };

    return new Promise((resolve, reject) => {
        try {
            channel.publish(
                exchange,
                routingKey,
                message,
                defaultOptions,
                (err, ok) => {
                    if (err) {
                        logRabbitMQEvent("error", { 
                            error: err, 
                            message: `Failed to publish to ${exchange}/${routingKey}` 
                        });
                        reject(err);
                    } else {
                        resolve(ok);
                    }
                }
            );
        } catch (error) {
            logRabbitMQEvent("error", { error, message: "Publish error" });
            reject(error);
        }
    });
};

/**
 * Send message directly to a queue (without exchange)
 * @param {string} queueName - Queue name
 * @param {Object|string|Buffer} content - Message content
 * @param {Object} options - Message options
 * @returns {Promise<boolean>} - True if message was sent successfully
 */
export const sendToQueue = async (queueName, content, options = {}) => {
    const channel = await getPublisherChannel();
    
    // Ensure queue exists
    try {
        await channel.assertQueue(queueName, { durable: true });
    } catch (error) {
        logRabbitMQEvent("error", { error, message: `Failed to assert queue '${queueName}'` });
        throw error;
    }
    
    const message = Buffer.isBuffer(content) 
        ? content 
        : Buffer.from(typeof content === "string" ? content : JSON.stringify(content));

    const defaultOptions = {
        persistent: true,
        timestamp: Date.now(),
        ...options,
    };

    try {
        const sent = channel.sendToQueue(queueName, message, defaultOptions);
        if (!sent) {
            // Channel buffer is full, wait for drain
            await new Promise((resolve) => channel.once('drain', resolve));
        }
        // For confirm channels, sendToQueue returns boolean immediately
        // The channel handles confirmations internally
        return sent;
    } catch (error) {
        logRabbitMQEvent("error", { error, message: `Error sending to queue '${queueName}'` });
        throw error;
    }
};

export const assertExchange = async (name, type = "direct", options = {}) => {
    const channel = await getPublisherChannel();
    
    const defaultOptions = {
        durable: true,
        ...options,
    };

    await channel.assertExchange(name, type, defaultOptions);
    logRabbitMQEvent("connected", { message: `Exchange '${name}' asserted (type: ${type})` });
};

export const assertQueue = async (name, options = {}) => {
    const channel = await getConsumerChannel();
    
    const defaultOptions = {
        durable: true,
        ...options,
    };

    const queueInfo = await channel.assertQueue(name, defaultOptions);
    logRabbitMQEvent("connected", { message: `Queue '${name}' asserted` });
    return queueInfo;
};

export const bindQueue = async (queue, exchange, pattern = "") => {
    const channel = await getConsumerChannel();
    await channel.bindQueue(queue, exchange, pattern);
    logRabbitMQEvent("connected", { message: `Queue '${queue}' bound to exchange '${exchange}'` });
};

export const consumeMessages = async (queue, handler, options = {}) => {
    const channel = await getConsumerChannel();
    
    const defaultOptions = {
        noAck: false,
        ...options,
    };

    await assertQueue(queue);

    const consumerTag = await channel.consume(queue, async (msg) => {
        if (!msg) {
            logRabbitMQEvent("disconnected", { reason: `Consumer cancelled for queue '${queue}'` });
            return;
        }

        try {
            let content = msg.content.toString();
            try {
                content = JSON.parse(content);
            } catch (parseError) {
                // JSON parse error - permanent error, don't requeue
                logRabbitMQEvent("error", { 
                    error: parseError, 
                    message: `Invalid JSON in message from queue '${queue}' - discarding message` 
                });
                if (!defaultOptions.noAck) {
                    channel.nack(msg, false, false); // Don't requeue - permanent error
                }
                return;
            }

            // Call handler (handler is responsible for ack/nack with retry logic)
            await handler(content, msg, channel);
        } catch (error) {
            // Error at consumeMessages level (should not happen if handler handles errors correctly)
            // Check retry count from headers to prevent infinite retry
            const headers = msg.properties?.headers || {};
            const retryCount = Number(headers["x-retry-count"]) || 0;
            const MAX_CONSUME_ERROR_RETRIES = 5; // Hard limit for errors at consumeMessages level
            
            logRabbitMQEvent("error", { 
                error, 
                message: `Error at consumeMessages level for queue '${queue}' (retry count: ${retryCount})`,
                retryCount
            });
            
            if (!defaultOptions.noAck) {
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
                    
                    logRabbitMQEvent("error", {
                        message: `Message discarded from queue '${queue}': ${reason}`,
                        reason,
                        retryCount
                    });
                }
                
                channel.nack(msg, false, shouldRequeue);
            }
        }
    }, defaultOptions);

    logRabbitMQEvent("connected", { message: `Started consuming queue '${queue}'` });
    return consumerTag;
};

export const ackMessage = async (msg, allUpTo = false) => {
    if (!msg) return;
    const channel = await getConsumerChannel();
    channel.ack(msg, allUpTo);
};

export const nackMessage = async (msg, requeue = false) => {
    if (!msg) return;
    const channel = await getConsumerChannel();
    channel.nack(msg, false, requeue);
};

export const getRabbitMQHealth = () => {
    const isConnected = connection && 
                       connection.connection && 
                       connection.connection.stream && 
                       !connection.connection.stream.destroyed;

    return {
        connected: isConnected,
        hasPublisherChannel: publisherChannel !== null && 
                            publisherChannel.connection && 
                            !publisherChannel.connection.destroyed,
        hasConsumerChannel: consumerChannel !== null && 
                           consumerChannel.connection && 
                           !consumerChannel.connection.destroyed,
        reconnectAttempts: reconnectAttempts,
        isConnecting: isConnecting,
    };
};

export const getConnectionInfo = () => {
    return {
        url: RABBITMQ_URL.replace(/:[^:@]+@/, ":****@"),
        heartbeat: HEARTBEAT,
        prefetch: PREFETCH_COUNT,
        maxRetries: MAX_RETRIES,
        health: getRabbitMQHealth(),
    };
};

export const disconnectRabbitMQ = async () => {
    isShuttingDown = true;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    logRabbitMQEvent("disconnected", { reason: "Graceful shutdown initiated" });

    await cleanup();

    logRabbitMQEvent("disconnected", { reason: "Graceful shutdown completed" });
};

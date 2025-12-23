import Message from "../models/message.js";
import { redisClient } from "../config/redis.js";

export const sendMessage = async (payload) => {
    const message = new Message(payload);
    await message.save();

    const keySet = `messages:${payload.conversationId}:keys`;
    const key = await redisClient.sMembers(keySet);

    if (key.length > 0) {
        await redisClient.del(...key);
    }

    await redisClient.del(keySet);

    return message;
}

export const getMessagesByConversationId = async (conversationId, page = 0, limit = 20) => {
    const messageKey = `messages:${conversationId}:page:${page}:limit:${limit}`;
    const cached = await redisClient.get(messageKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const messages = await Message.find({ conversationId })
        .populate("senderId", "username avatar fullname")
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit);
    await redisClient.setEx(messageKey, 300, JSON.stringify(messages));

    await redisClient.sAdd(`messages:${conversationId}:keys`, messageKey);

    return messages;
}
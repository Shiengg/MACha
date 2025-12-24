import Conversation from "../models/conversation.js";
import { redisClient } from "../config/redis.js";

export const createConversationPrivate = async (payload) => {
    const { userId1, userId2 } = payload;
    const conversation = await Conversation.findOne({
        members: { $all: [userId1, userId2], $size: 2 }
    });
    if (conversation) {
        return conversation;
    }

    const newConversation = await Conversation.create({
        members: [userId1, userId2],
        createdBy: userId1,
    });
    await redisClient.del(`conversations:${userId1}`);
    return newConversation;
}

export const getConversationsByUserId = async (userId) => {
    const conversationKey = `conversations:${userId}`;
    const cached = await redisClient.get(conversationKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const conversations = await Conversation.find({
        members: { $in: [userId] }
    })
        .populate("members", "username avatar fullname email")
        .populate({
            path: "lastMessage",
            select: "content senderId createdAt",
            populate: {
                path: "senderId",
                select: "username avatar"
            }
        })
        .sort({ updatedAt: -1 });
    await redisClient.setEx(conversationKey, 300, JSON.stringify(conversations));
    return conversations;
}
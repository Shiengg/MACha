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
    return newConversation;
}
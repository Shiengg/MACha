import { HTTP_STATUS } from "../utils/status.js";
import * as messageService from "../services/message.service.js";

export const sendMessage = async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const senderId = req.user._id;
        const { content, type } = req.body;
        if (!conversationId || !senderId || !content || !type) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Tất cả các trường là bắt buộc" });
        };
        const message = await messageService.sendMessage({ conversationId, senderId, content, type });
        return res.status(HTTP_STATUS.CREATED).json({ message });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getMessagesByConversationId = async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const page = req.query.page || 0;
        const limit = req.query.limit || 20;
        const messages = await messageService.getMessagesByConversationId(conversationId, page, limit);
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            messages
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}
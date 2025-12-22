import { HTTP_STATUS } from "../utils/status.js";
import * as conversationService from "../services/conversation.service.js";

export const createConversationPrivate = async (req, res) => {
    try {
        const userId1 = req.user._id;
        const userId2 = req.params.userId2;

        const conversation = await conversationService.createConversationPrivate({ userId1, userId2 });

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            conversation
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}
import { Router } from "express";
import * as MessageController from "../controllers/MessageController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const messageRoutes = Router();

messageRoutes.post('/:conversationId', authMiddleware, MessageController.sendMessage);
messageRoutes.get('/:conversationId', authMiddleware, MessageController.getMessagesByConversationId);

export default messageRoutes;
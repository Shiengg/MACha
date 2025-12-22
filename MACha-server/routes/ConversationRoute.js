import { Router } from "express";
import * as ConversationController from "../controllers/ConversationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const conversationRoutes = Router();

conversationRoutes.post('/private/:userId2', authMiddleware, ConversationController.createConversationPrivate);

export default conversationRoutes;
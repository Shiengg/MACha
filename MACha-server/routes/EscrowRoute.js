import { Router } from "express";
import { submitVote } from "../controllers/EscrowController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const escrowRoutes = Router();

escrowRoutes.post('/:escrowId/vote', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), submitVote);

export default escrowRoutes;


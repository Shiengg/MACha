import { Router } from "express";
import * as EscrowController from "../controllers/EscrowController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const escrowRoutes = Router();
const adminEscrowRoutes = Router();

escrowRoutes.post('/:escrowId/vote', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.submitVote);

adminEscrowRoutes.get('/withdrawal-requests', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.getWithdrawalRequestsForReview);
adminEscrowRoutes.post('/withdrawal-requests/:escrowId/approve', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.approveWithdrawalRequest);
adminEscrowRoutes.post('/withdrawal-requests/:escrowId/reject', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.rejectWithdrawalRequest);

export { escrowRoutes, adminEscrowRoutes };
export default escrowRoutes;


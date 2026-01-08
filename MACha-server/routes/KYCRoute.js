import { Router } from "express";
import { 
    submitKYC,
    getKYCStatus,
    getPendingKYCs,
    getKYCDetails,
    approveKYC,
    rejectKYC,
    getKYCHistory
} from "../controllers/KYCController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const kycRoutes = Router();

// User routes
// Rate limit: 10 submissions per hour per user (more lenient for testing/retrying with image rotation)
kycRoutes.post('/submit', authMiddleware, RateLimitMiddleware.rateLimitByUserId(10, 3600), submitKYC);
kycRoutes.get('/status', authMiddleware, getKYCStatus);
kycRoutes.get('/history', authMiddleware, getKYCHistory);
kycRoutes.get('/history/:id', authMiddleware, getKYCHistory); // Admin can view any user's history

// Admin routes
kycRoutes.get('/pending', authMiddleware, checkRole('admin'), getPendingKYCs);
kycRoutes.get('/:id/details', authMiddleware, checkRole('admin'), getKYCDetails);
kycRoutes.post('/:id/approve', authMiddleware, checkRole('admin'), approveKYC);
kycRoutes.post('/:id/reject', authMiddleware, checkRole('admin'), rejectKYC);

export default kycRoutes;


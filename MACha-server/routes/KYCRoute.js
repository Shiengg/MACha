import { Router } from "express";
import { 
    submitKYC,
    submitKYCWithVNPT,
    getKYCStatus,
    getPendingKYCs,
    getKYCDetails,
    approveKYC,
    rejectKYC,
    getKYCHistory,
    verifyDocumentQuality,
    ocrDocument,
    compareFaces,
    submitOrganizationKYC,
    getOrganizationKYCStatus
} from "../controllers/KYCController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const kycRoutes = Router();

// User routes
kycRoutes.post('/submit', authMiddleware, RateLimitMiddleware.rateLimitByUserId(1000, 3600), submitKYC);
kycRoutes.post('/submit-vnpt', authMiddleware, RateLimitMiddleware.rateLimitByUserId(1000, 3600), submitKYCWithVNPT);
kycRoutes.get('/status', authMiddleware, getKYCStatus);
kycRoutes.get('/history', authMiddleware, getKYCHistory);
kycRoutes.get('/history/:id', authMiddleware, getKYCHistory);

// Organization routes
kycRoutes.post('/organization/submit', authMiddleware, RateLimitMiddleware.rateLimitByUserId(1000, 3600), submitOrganizationKYC);
kycRoutes.get('/organization/status', authMiddleware, getOrganizationKYCStatus);

// VNPT eKYC utility routes
kycRoutes.post('/vnpt/verify-quality', authMiddleware, verifyDocumentQuality);
kycRoutes.post('/vnpt/ocr', authMiddleware, ocrDocument);
kycRoutes.post('/vnpt/compare-faces', authMiddleware, compareFaces);

// Admin routes
kycRoutes.get('/pending', authMiddleware, checkRole('admin'), getPendingKYCs);
kycRoutes.get('/:id/details', authMiddleware, checkRole('admin'), getKYCDetails);
kycRoutes.post('/:id/approve', authMiddleware, checkRole('admin'), approveKYC);
kycRoutes.post('/:id/reject', authMiddleware, checkRole('admin'), rejectKYC);

export default kycRoutes;


import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { rateLimitByUserId } from "../middlewares/rateLimitMiddleware.js";
import * as adminController from "../controllers/AdminController.js";
import {
    getUpdateRequests,
    getUpdateRequestById,
    approveUpdateRequest,
    rejectUpdateRequest
} from "../controllers/CampaignUpdateRequestController.js";

const AdminRoutes = express.Router();

AdminRoutes.get(
    "/dashboard",
    authMiddleware,
    checkRole('admin'),
    adminController.getDashboard
);

// Campaign Update Request routes (Admin)
AdminRoutes.get(
    "/campaign-update-requests",
    authMiddleware,
    checkRole('admin'),
    rateLimitByUserId(150, 60),
    getUpdateRequests
);

AdminRoutes.get(
    "/campaign-update-requests/:id",
    authMiddleware,
    checkRole('admin'),
    rateLimitByUserId(150, 60),
    getUpdateRequestById
);

AdminRoutes.post(
    "/campaign-update-requests/:id/approve",
    authMiddleware,
    checkRole('admin'),
    rateLimitByUserId(60, 60),
    approveUpdateRequest
);

AdminRoutes.post(
    "/campaign-update-requests/:id/reject",
    authMiddleware,
    checkRole('admin'),
    rateLimitByUserId(60, 60),
    rejectUpdateRequest
);

export default AdminRoutes;



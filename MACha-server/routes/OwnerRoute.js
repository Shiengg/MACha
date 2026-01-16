import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkOwner } from "../middlewares/checkOwner.js";
import * as ownerController from "../controllers/OwnerController.js";

const OwnerRoutes = express.Router();

OwnerRoutes.get(
    "/dashboard",
    authMiddleware,
    checkOwner,
    ownerController.getDashboard
);

OwnerRoutes.get(
    "/users/for-admin-creation",
    authMiddleware,
    checkOwner,
    ownerController.getUsersForAdminCreation
);

OwnerRoutes.get(
    "/admins",
    authMiddleware,
    checkOwner,
    ownerController.getAdmins
);

OwnerRoutes.post(
    "/admins",
    authMiddleware,
    checkOwner,
    ownerController.createAdmin
);

OwnerRoutes.put(
    "/admins/:id",
    authMiddleware,
    checkOwner,
    ownerController.updateAdmin
);

OwnerRoutes.delete(
    "/admins/:id",
    authMiddleware,
    checkOwner,
    ownerController.deleteAdmin
);

OwnerRoutes.post(
    "/admins/:id/ban",
    authMiddleware,
    checkOwner,
    ownerController.banAdmin
);

OwnerRoutes.post(
    "/admins/:id/unban",
    authMiddleware,
    checkOwner,
    ownerController.unbanAdmin
);

OwnerRoutes.get(
    "/financial-overview",
    authMiddleware,
    checkOwner,
    ownerController.getFinancialOverview
);

OwnerRoutes.get(
    "/financial/campaigns",
    authMiddleware,
    checkOwner,
    ownerController.getCampaignFinancials
);

OwnerRoutes.get(
    "/admin-activities",
    authMiddleware,
    checkOwner,
    ownerController.getAdminActivities
);

OwnerRoutes.get(
    "/donations",
    authMiddleware,
    checkOwner,
    ownerController.getOwnerDonations
);

OwnerRoutes.get(
    "/approval-history",
    authMiddleware,
    checkOwner,
    ownerController.getApprovalHistory
);

// User Management Routes
OwnerRoutes.get(
    "/users",
    authMiddleware,
    checkOwner,
    ownerController.getAllUsers
);

OwnerRoutes.post(
    "/users/:id/ban",
    authMiddleware,
    checkOwner,
    ownerController.banUser
);

OwnerRoutes.post(
    "/users/:id/unban",
    authMiddleware,
    checkOwner,
    ownerController.unbanUser
);

OwnerRoutes.post(
    "/users/:id/reset-kyc",
    authMiddleware,
    checkOwner,
    ownerController.resetUserKYC
);

OwnerRoutes.get(
    "/users/:id/history",
    authMiddleware,
    checkOwner,
    ownerController.getUserHistory
);

OwnerRoutes.get(
    "/withdrawal-requests",
    authMiddleware,
    checkOwner,
    ownerController.getAdminApprovedWithdrawalRequests
);

OwnerRoutes.post(
    "/escrow/:escrowId/sepay/init",
    authMiddleware,
    checkOwner,
    ownerController.initSepayWithdrawalPayment
);

OwnerRoutes.post(
    "/escrow/sepay/callback",
    ownerController.sepayWithdrawalCallback
);

OwnerRoutes.get(
    "/escrow/sepay/success",
    ownerController.sepayWithdrawalSuccess
);

OwnerRoutes.get(
    "/escrow/sepay/error",
    ownerController.sepayWithdrawalError
);

OwnerRoutes.get(
    "/escrow/sepay/cancel",
    ownerController.sepayWithdrawalCancel
);

OwnerRoutes.get(
    "/refunds",
    authMiddleware,
    checkOwner,
    ownerController.getPendingRefunds
);

OwnerRoutes.post(
    "/refund/:refundId/sepay/init",
    authMiddleware,
    checkOwner,
    ownerController.initSepayRefundPayment
);

OwnerRoutes.post(
    "/refund/sepay/callback",
    ownerController.sepayRefundCallback
);

OwnerRoutes.get(
    "/refund/sepay/success",
    ownerController.sepayRefundSuccess
);

OwnerRoutes.get(
    "/refund/sepay/error",
    ownerController.sepayRefundError
);

OwnerRoutes.get(
    "/refund/sepay/cancel",
    ownerController.sepayRefundCancel
);

export default OwnerRoutes;


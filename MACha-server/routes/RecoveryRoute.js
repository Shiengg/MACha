import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import * as recoveryController from "../controllers/RecoveryController.js";

const RecoveryRoutes = express.Router();

RecoveryRoutes.get(
    "/creator",
    authMiddleware,
    recoveryController.getRecoveryCasesByCreator
);

RecoveryRoutes.get(
    "/:recoveryCaseId",
    authMiddleware,
    recoveryController.getRecoveryCaseById
);

RecoveryRoutes.post(
    "/:recoveryCaseId/sepay/init",
    authMiddleware,
    recoveryController.initSepayRecoveryPayment
);

RecoveryRoutes.post(
    "/sepay/callback",
    recoveryController.sepayRecoveryCallback
);

RecoveryRoutes.get(
    "/sepay/success",
    recoveryController.sepayRecoverySuccess
);

RecoveryRoutes.get(
    "/sepay/error",
    recoveryController.sepayRecoveryError
);

RecoveryRoutes.get(
    "/sepay/cancel",
    recoveryController.sepayRecoveryCancel
);

export default RecoveryRoutes;


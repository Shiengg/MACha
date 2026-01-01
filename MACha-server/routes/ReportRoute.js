import { Router } from "express";
import {
    createReport,
    getReports,
    getReportById,
    updateReportStatus,
    getReportsByReportedItem
} from "../controllers/ReportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";

const reportRoutes = Router();

reportRoutes.post('/', authMiddleware, createReport);
reportRoutes.get('/item/:reported_type/:reported_id', authMiddleware, getReportsByReportedItem);
reportRoutes.get('/:id', authMiddleware, checkRole('admin'), getReportById);
reportRoutes.get('/', authMiddleware, checkRole('admin'), getReports);
reportRoutes.put('/:id/status', authMiddleware, checkRole('admin'), updateReportStatus);

export default reportRoutes;


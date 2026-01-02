import { Router } from "express";
import {
    createReport,
    getReports,
    getReportById,
    updateReportStatus,
    getReportsByReportedItem,
    getGroupedReports,
    batchUpdateReportsByItem
} from "../controllers/ReportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";

const reportRoutes = Router();

reportRoutes.post('/', authMiddleware, createReport);
reportRoutes.get('/grouped', authMiddleware, checkRole('admin'), getGroupedReports);
reportRoutes.get('/item/:reported_type/:reported_id', authMiddleware, getReportsByReportedItem);
reportRoutes.put('/item/:reported_type/:reported_id/batch', authMiddleware, checkRole('admin'), batchUpdateReportsByItem);
reportRoutes.get('/:id', authMiddleware, checkRole('admin'), getReportById);
reportRoutes.get('/', authMiddleware, checkRole('admin'), getReports);
reportRoutes.put('/:id/status', authMiddleware, checkRole('admin'), updateReportStatus);

export default reportRoutes;


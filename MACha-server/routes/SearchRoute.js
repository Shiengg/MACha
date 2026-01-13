import { Router } from "express";
import {
    saveSearchHistory,
    getSearchHistory,
    getAllSearchHistory,
    deleteSearchHistory,
    deleteAllSearchHistory
} from "../controllers/SearchController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { rateLimitByUserId } from "../middlewares/rateLimitMiddleware.js";

const searchRoutes = Router();

searchRoutes.post('/history', authMiddleware, rateLimitByUserId(300, 60), saveSearchHistory);
searchRoutes.get('/history', authMiddleware, rateLimitByUserId(300, 60), getSearchHistory);
searchRoutes.get('/history/all', authMiddleware, rateLimitByUserId(300, 60), getAllSearchHistory);
searchRoutes.delete('/history', authMiddleware, rateLimitByUserId(120, 60), deleteSearchHistory);
searchRoutes.delete('/history/all', authMiddleware, rateLimitByUserId(120, 60), deleteAllSearchHistory);

export default searchRoutes;


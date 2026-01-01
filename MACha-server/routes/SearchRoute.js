import { Router } from "express";
import {
    saveSearchHistory,
    getSearchHistory,
    getAllSearchHistory,
    deleteSearchHistory,
    deleteAllSearchHistory
} from "../controllers/SearchController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const searchRoutes = Router();

searchRoutes.post('/history', authMiddleware, saveSearchHistory);
searchRoutes.get('/history', authMiddleware, getSearchHistory);
searchRoutes.get('/history/all', authMiddleware, getAllSearchHistory);
searchRoutes.delete('/history', authMiddleware, deleteSearchHistory);
searchRoutes.delete('/history/all', authMiddleware, deleteAllSearchHistory);

export default searchRoutes;


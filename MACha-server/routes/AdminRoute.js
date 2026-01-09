import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import * as adminController from "../controllers/AdminController.js";

const AdminRoutes = express.Router();

AdminRoutes.get(
    "/dashboard",
    authMiddleware,
    checkRole('admin'),
    adminController.getDashboard
);

export default AdminRoutes;


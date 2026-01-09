import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as adminService from "../services/admin.service.js";

export const getDashboard = async (req, res) => {
    try {
        const adminId = req.user._id; // Get admin ID from authenticated user
        const dashboard = await adminService.getDashboard(adminId);
        return res.status(HTTP_STATUS.OK).json(dashboard);
    } catch (error) {
        console.error('Error in getDashboard:', error);
        console.error('Error stack:', error.stack);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};


import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const authMiddleware = async (req, res, next) => {
    try {
        let token = null;

        // Try to get token from Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        // If no token in header, try to get from cookie
        if (!token && req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json({ message: HTTP_STATUS_TEXT.UNAUTHORIZED });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json({ message: "User not found or token invalid" });
        }

        req.user = user;

        next();
    } catch (error) {
        return res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json({ message: "Invalid or expired token" });
    }
};

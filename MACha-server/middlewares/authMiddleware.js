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

        // Debug logging for production
        if (process.env.NODE_ENV === 'production' && !token) {
            console.log('🔐 Auth failed - no token found:', {
                hasAuthHeader: !!authHeader,
                hasCookies: !!req.cookies,
                cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
                path: req.path,
                origin: req.headers.origin,
            });
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

        // Check if user is banned
        if (user.is_banned) {
            return res
                .status(HTTP_STATUS.FORBIDDEN)
                .json({ 
                    message: "Your account has been banned",
                    ban_reason: user.ban_reason || "Account banned by administrator"
                });
        }

        req.user = user;

        next();
    } catch (error) {
        return res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json({ message: "Invalid or expired token" });
    }
};

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't fail if token is missing
 */
export const optionalAuthMiddleware = async (req, res, next) => {
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

        // If no token, just continue without setting req.user
        if (!token) {
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");
            
            if (user && !user.is_banned) {
                req.user = user;
            }
        } catch (error) {
            // Invalid token, but don't fail the request
            // Just continue without setting req.user
        }

        next();
    } catch (error) {
        // Any other error, just continue without authentication
        next();
    }
};

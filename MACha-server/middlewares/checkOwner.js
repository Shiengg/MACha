import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const checkOwner = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: HTTP_STATUS_TEXT.UNAUTHORIZED })
        }

        if (req.user.role !== "owner") {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN })
        }

        next();
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}


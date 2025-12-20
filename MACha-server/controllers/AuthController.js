import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as authService from "../services/auth.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import { sendOtpEmail } from "../utils/mailer.js";

const maxAge = 3 * 24 * 60 * 60;
const maxAgeMili = maxAge * 1000;

const { sign } = jwt;

const createToken = (id, username, role, fullname) => {
    return sign({ id, username, role, fullname }, process.env.JWT_SECRET, { expiresIn: maxAge })
}

export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !password || !email) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Username or email or password is not blank!"
            });
        }

        if (password.length < 6) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Password must be at least 6 characters long."
            });
        }

        // Kiểm tra user đã tồn tại
        const userExists = await authService.checkUserExists(username, email);
        if (userExists) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                message: "User is existed"
            });
        }

        // Tạo user mới
        const user = await authService.createUser({ username, email, password });

        // Tạo token và set cookie
        res.cookie("jwt", createToken(user.id, user.username, user.role, user.fullname), {
            maxAge: maxAgeMili,
            secure: true,
            httpOnly: true,
            sameSite: "None"
        });

        await trackingService.publishSignUpEvent(user.id, { type: "SIGNUP", userId: user.id, timestamp: Date.now() });

        await queueService.pushJob({ type: "SIGNUP", userId: user.id, timestamp: Date.now() });

        return res.status(HTTP_STATUS.CREATED).json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Email and password are required."
            });
        }
        // Kiểm tra xem tài khoản có bị khóa tạm thời không
        const isLocked = await authService.isAccountLocked(email);
        if (isLocked) {
            return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                message: "Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 2 phút."
            });
        }

        // Tìm user theo email
        const user = await authService.findUserByEmail(email);
        if (!user) {
            const attempts = await authService.incrementFailedLoginAttempts(email);
            const remainingAttempts = 5 - attempts;

            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                message: HTTP_STATUS_TEXT.LOGIN_FAILED,
                remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
            });
        }

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
            const attempts = await authService.incrementFailedLoginAttempts(email);
            const remainingAttempts = 5 - attempts;

            if (attempts >= 5) {
                return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                    message: "Bạn đã đăng nhập sai 5 lần. Tài khoản tạm thời bị khóa.",
                    remainingAttempts: 0
                });
            }

            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                message: HTTP_STATUS_TEXT.LOGIN_FAILED,
                remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
            });
        }

        // Reset failed login attempts khi đăng nhập thành công
        await authService.resetFailedLoginAttempts(email);

        res.cookie("jwt", createToken(user._id, user.username, user.role, user.fullname), {
            maxAge: maxAgeMili,
            secure: true,
            httpOnly: true,
            sameSite: "None"
        });

        return res.status(HTTP_STATUS.OK).json({
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
        })
        return res.status(HTTP_STATUS.OK).json({
            message: "Logout successful.",
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        return res.status(HTTP_STATUS.OK).json({ user })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getUserById = async (req, res) => {
    try {
        const user = await authService.getUserById(req.params.id);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json({ user })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Authorization: Chỉ cho phép user tự update hoặc admin
        if (req.user._id.toString() !== id && req.user.role !== "admin") {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: HTTP_STATUS_TEXT.FORBIDDEN
            });
        }

        // Validate fields được phép update
        const allowedFields = ["avatar", "bio", "fullname", "email"];
        const validation = authService.validateUpdateFields(req.body, allowedFields);

        if (!validation.isValid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: `Invalid fields: ${validation.invalidFields.join(', ')}. Allowed fields are: ${validation.allowedFields.join(', ')}`
            });
        }

        // Kiểm tra có data để update không
        if (Object.keys(validation.updates).length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "No valid fields to update"
            });
        }

        // Update user và invalidate cache
        const updatedUser = await authService.updateUserById(id, validation.updates);

        if (!updatedUser) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: HTTP_STATUS_TEXT.NOT_FOUND
            });
        }

        return res.status(HTTP_STATUS.OK).json({ user: updatedUser });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}

export const sendOtp = async (req, res) => {
    try {
        const userId = req.user._id;
        const {otp, expiresIn} = await authService.createOtp(userId);
        await sendOtpEmail(req.user.email, {
            username: req.user.username,
            otp,
            expiresIn
        });
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            otp,
            expiresIn
        })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}

export const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const {otp, newPassword} = req.body;
        await authService.changePassword(userId, otp, newPassword);
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Mật khẩu đã được thay đổi thành công"
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}
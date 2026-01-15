import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as authService from "../services/auth.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import { createJob, JOB_TYPES, JOB_SOURCE } from "../schemas/job.schema.js";
import User, { ONBOARDING_CATEGORIES } from "../models/user.js";
import { redisClient } from "../config/redis.js";

const maxAge = 3 * 24 * 60 * 60;
const maxAgeMili = maxAge * 1000;

const { sign } = jwt;

const createToken = (id, username, role, fullname) => {
    return sign({ id, username, role, fullname }, process.env.JWT_SECRET, { expiresIn: maxAge })
}

// Helper function để tạo cookie options dựa trên môi trường
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = process.env.SECURE_COOKIE === 'true' || isProduction;
    
    return {
        maxAge: maxAgeMili,
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "None" : "Lax",
        path: '/', 
    };
}

export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

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

        const userExists = await authService.checkUserExists(username, email);
        if (userExists) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                message: "User is existed"
            });
        }

        const user = await authService.createUser({ username, email, password });

        const { otp, expiresIn } = await authService.createOtp(user.id);

        try {
            const job = createJob(
                JOB_TYPES.SEND_OTP_SIGNUP,
                {
                    email: user.email,
                    username: user.username,
                    otp: otp,
                    expiresIn: expiresIn
                },
                {
                    userId: user.id.toString(),
                    source: JOB_SOURCE.API
                }
            );
            await queueService.pushJob(job);
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: " Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                is_verified: user.is_verified,
                onboarding_completed: user.onboarding_completed,
                interests: user.interests,
            }
        })

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}

export const verifyUserAccount = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "userId là bắt buộc",
            });
        }

        if (!otp) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "OTP là bắt buộc",
            });
        }

        await authService.verifyOtpForUserAccount(userId, otp);

        const user = await authService.getUserById(userId);
        if (!user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                message: "User không tồn tại hoặc token không hợp lệ",
            });
        }

        if (!user.is_verified) {
            await User.findByIdAndUpdate(userId, { is_verified: true });
            const cacheKey = `user:${userId.toString()}`;
            await redisClient.del(cacheKey);
            user.is_verified = true;
        }

        const token = createToken(user._id, user.username, user.role, user.fullname);
        res.cookie("jwt", token, getCookieOptions());

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Tài khoản đã được xác thực thành công.",
            token: token, // Return token for cross-site cookie issues
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                is_verified: user.is_verified,
                onboarding_completed: user.onboarding_completed,
                interests: user.interests,
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

        if (!user.is_verified) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.",
            })
        }

        if (user.is_banned) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "Tài khoản của bạn đã bị khóa (ban).",
                ban_reason: user.ban_reason || "Tài khoản bị khóa bởi quản trị viên",
                is_banned: true
            });
        }

        // Reset failed login attempts khi đăng nhập thành công
        await authService.resetFailedLoginAttempts(email);

        const token = createToken(user._id, user.username, user.role, user.fullname);
        const cookieOptions = getCookieOptions();
        
        // Log cookie options in production for debugging
        if (process.env.NODE_ENV === 'production') {
            console.log('🍪 Setting cookie with options:', {
                secure: cookieOptions.secure,
                sameSite: cookieOptions.sameSite,
                httpOnly: cookieOptions.httpOnly,
                path: cookieOptions.path,
                maxAge: cookieOptions.maxAge,
            });
        }
        
        res.cookie("jwt", token, cookieOptions);

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            token: token, // Return token in response for cross-site cookie issues
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                onboarding_completed: user.onboarding_completed,
                interests: user.interests,
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
        const cookieOptions = getCookieOptions();
        res.clearCookie("jwt", {
            httpOnly: cookieOptions.httpOnly,
            secure: cookieOptions.secure,
            sameSite: cookieOptions.sameSite,
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

export const completeOnboarding = async (req, res) => {
    try {
        const { id } = req.params;
        const { selected_categories } = req.body || {};

        // Authorization: user tự update hoặc admin
        if (req.user._id.toString() !== id && req.user.role !== "admin") {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: HTTP_STATUS_TEXT.FORBIDDEN
            });
        }

        if (!Array.isArray(selected_categories) || selected_categories.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "selected_categories phải là mảng và không được rỗng"
            });
        }

        const invalid = selected_categories.filter(c => !ONBOARDING_CATEGORIES.includes(c));
        if (invalid.length > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: `Danh mục không hợp lệ: ${invalid.join(", ")}`
            });
        }

        const updatedUser = await authService.completeOnboarding(id, selected_categories);

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
};

export const sendOtp = async (req, res) => {
    try {
        const userId = req.user._id;
        const { otp, expiresIn } = await authService.createOtp(userId);
        try {
            const job = createJob(
                JOB_TYPES.SEND_OTP,
                {
                    email: req.user.email,
                    username: req.user.username,
                    otp: otp,
                    expiresIn: expiresIn
                },
                {
                    userId: userId.toString(),
                    source: JOB_SOURCE.API
                }
            );
            await queueService.pushJob(job);
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }
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

export const verifyOtpChangePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { otp } = req.body;

        if (!otp) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "OTP là bắt buộc",
            });
        }

        await authService.verifyOtpForChangePassword(userId, otp);

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "OTP hợp lệ. Bạn có thể đặt mật khẩu mới.",
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message,
        });
    }
}

export const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Mật khẩu mới phải có ít nhất 6 ký tự",
            });
        }

        await authService.changePassword(userId, newPassword);
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Mật khẩu đã được thay đổi thành công"
        });
    } catch (error) {
        const businessErrors = [
            "OTP chưa được xác thực hoặc đã hết hạn",
            "Mật khẩu mới không được trùng với mật khẩu cũ",
        ];
        const status =
            businessErrors.includes(error?.message)
                ? HTTP_STATUS.BAD_REQUEST
                : HTTP_STATUS.INTERNAL_SERVER_ERROR;

        return res.status(status).json({
            message: error.message
        });
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await authService.findUserByEmail(email);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "User not found"
            });
        }
        const newPassword = await authService.forgotPassword(email);
        try {
            const job = createJob(
                JOB_TYPES.SEND_FORGOT_PASSWORD,
                {
                    email: email,
                    username: user.username,
                    newPassword: newPassword
                },
                {
                    userId: user._id.toString(),
                    source: JOB_SOURCE.API
                }
            );
            await queueService.pushJob(job);
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Mật khẩu mới đã được gửi đến email của bạn"
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}

export const signupOrganization = async (req, res) => {
    try {
        const { organization_name, username, password, confirm_password, email } = req.body;

        if (!organization_name || !username || !password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Organization name, username, and password are required"
            });
        }

        if (password !== confirm_password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Password and confirm password do not match"
            });
        }

        if (password.length < 6) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Password must be at least 6 characters long."
            });
        }

        const user = await authService.createOrganizationUser({
            organization_name,
            username,
            password,
            email
        });

        const token = createToken(user.id, user.username, user.role, user.fullname);
        res.cookie("jwt", token, getCookieOptions());

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: "Đăng ký tổ chức thành công",
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                is_verified: user.is_verified,
                fullname: user.fullname
            },
            token: token
        });
    } catch (error) {
        if (error.message.includes("already exists")) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                message: error.message
            });
        }
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
}
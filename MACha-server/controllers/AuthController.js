import User from "../models/user.js";
import jwt from "jsonwebtoken"
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import { compare } from "bcryptjs";

const maxAge = 3 * 24 * 60 * 60;
const maxAgeMili = maxAge * 1000;

const { sign } = jwt;

const createToken = (id, username, role, fullname) => {
    return sign({ id, username, role, fullname }, process.env.JWT_SECRET, { expiresIn: maxAge })
}

export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !password || !email) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Username or email or password is not blank!"
            })
        }

        if (password.length < 6) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Password must be at least 6 characters long." });
        }

        const existingUser = await User.findOne({
            $or: [{ username: username.trim() }, { email: email.trim() }],
        });

        if (existingUser) {
            return res.status(HTTP_STATUS.CONFLICT).json({ message: "User is existed" });
        }


        const user = await User.create({ username, email, password });
        res.cookie("jwt", createToken(user.id, user.username, user.role, user.fullname), {
            maxAge: maxAgeMili,
            secure: true,
            httpOnly: true,
            sameSite: "None"
        })
        return res.status(HTTP_STATUS.CREATED).json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        })

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email and password are required." })
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail })
        if (!user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: HTTP_STATUS_TEXT.LOGIN_FAILED })
        }
        const auth = await compare(password, user.password);
        if (!auth) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: HTTP_STATUS_TEXT.LOGIN_FAILED })
        }
        res.cookie("jwt", createToken(user.id, user.username, user.role, user.fullname), {
            maxAge: maxAgeMili,
            secure: true,
            httpOnly: true,
            sameSite: "None"
        })
        return res.status(HTTP_STATUS.OK).json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        })

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
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
        const user = await User.findById(req.params.id);
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

        if (req.user._id.toString() !== id && req.user.role !== "admin") {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN })
        }

        const allowedFields = ["avatar", "bio", "fullname", "email"];
        const updates = {};

        // Kiểm tra các field không được phép
        const requestFields = Object.keys(req.body);
        const invalidFields = requestFields.filter(field => !allowedFields.includes(field));

        if (invalidFields.length > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields are: ${allowedFields.join(', ')}`
            });
        }

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const updatedUser = await User.findByIdAndUpdate(id, updates, {
            new: true,
        }).select("-password");

        if (!updatedUser) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json({ user: updatedUser });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}
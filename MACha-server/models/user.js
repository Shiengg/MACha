import mongoose from "mongoose";
import { genSalt, hash } from "bcryptjs";

export const ONBOARDING_CATEGORIES = [
    "children",           // Trẻ em
    "elderly",            // Người già
    "poverty",            // Người nghèo
    "disaster",           // Thiên tai (lũ lụt, bão, hạn hán)
    "medical",            // Y tế, bệnh hiểm nghèo
    "education",          // Giáo dục
    "disability",         // Người khuyết tật
    "animal",             // Động vật
    "environment",        // Môi trường
    "hardship",           // Hoàn cảnh khó khăn
    "other",              // Khác
];

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required."],
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
    },
    email: {
        type: String,
        required: [true, "Email is required."],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Password is required."],
        minlength: 6
    },
    fullname: {
        type: String,
    },
    avatar: {
        type: String,
    },
    bio: {
        type: String,
        default: "",
    },
    date_of_birth: {
        type: Date
    },
    role: {
        type: String,
        enum: ["user", "admin", "owner"],
        default: "user",
    },
    is_verified: {
        type: Boolean,
        default: false,
    },

    // KYC Status (derived from latest KYC submission)
    kyc_status: {
        type: String,
        enum: ["unverified", "pending", "verified", "rejected"],
        default: "unverified",
        index: true
    },
    // Reference to latest KYC submission
    current_kyc_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KYC",
        default: null
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers_count: {
        type: Number,
        default: 0,
    },
    following_count: {
        type: Number,
        default: 0,
    },
    is_banned: {
        type: Boolean,
        default: false,
        index: true
    },
    banned_at: {
        type: Date,
        default: null
    },
    banned_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    ban_reason: {
        type: String,
        default: null
    },
    onboarding_data: {
        selected_categories: [{
            type: String,
            enum: ONBOARDING_CATEGORIES,
        }]
    },
    onboarding_completed: {
        type: Boolean,
        default: false,
        index: true
    }
},
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();

    const salt = await genSalt(10);
    this.password = await hash(this.password, salt);
    next();
})

const User = mongoose.model("User", userSchema);
export default User;
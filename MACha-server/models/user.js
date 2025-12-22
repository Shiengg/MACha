import mongoose from "mongoose";
import { genSalt, hash } from "bcryptjs";

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
        enum: ["user", "admin", "org"],
        default: "user",
    },
    is_verified: {
        type: Boolean,
        default: false,
    },

    kyc_status: {
        type: String,
        enum: ["unverified", "pending", "verified", "rejected"],
        default: "unverified",
    },
    kyc_documents: {
        identity_front_url: String,
        identity_back_url: String,
        selfie_url: String,
        tax_document_url: String,
        bank_statement_url: String
    },
    identity_verified_name: String,
    identity_card_last4: String,
    tax_code: String,
    address: {
        city: String,
        district: String
    },
    bank_account: {
        bank_name: String,
        account_number_last4: String,
        account_holder_name: String,
        bank_document_url: String
    },
    kyc_submitted_at: {
        type: Date,
        default: null
    },
    kyc_verified_at: {
        type: Date,
        default: null
    },
    kyc_verified_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    kyc_rejection_reason: {
        type: String,
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
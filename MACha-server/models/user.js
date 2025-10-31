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
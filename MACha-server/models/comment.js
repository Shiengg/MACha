import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content_text: {
        type: String,
        required: true
    },
    is_hidden: {
        type: Boolean,
        default: false,
        index: true
    },
    },
    {
        timestamps: true
    }
)

// Indexes for common queries
commentSchema.index({ post: 1, createdAt: -1 }); // Comments by post, sorted by date
commentSchema.index({ user: 1, createdAt: -1 }); // User comments
commentSchema.index({ post: 1, is_hidden: 1 }); // Filter hidden comments

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
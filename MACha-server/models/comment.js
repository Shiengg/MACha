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

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
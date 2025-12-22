import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],

    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
    },
    groupAvatar: {
        type: String,
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
},
    {
        timestamps: true
    }
)

conversationSchema.index({ members: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: [
            "follow",
            "like",
            "comment",
            "mention",
            "donation",
            "campaign_update",
            "system"
        ],
        required: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign"
    },
    message: {
        type: String,
        required: true
    },
    is_read: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
)

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
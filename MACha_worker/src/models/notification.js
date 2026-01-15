/**
 * Notification Model for Worker
 * 
 * Simplified version - only schema definition needed
 */

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
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
            "campaign_approved",
            "campaign_rejected",
            "event_invite",
            "event_update",
            "event_started",
            "event_reminder",
            "event_rsvp_change",
            "post_removed",
            "campaign_removed",
            "event_removed",
            "user_warned",
            "user_banned",
            "admin_reported",
            "system",
            "withdrawal_released",
            "refund_processed"
        ],
        required: true,
        index: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign"
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event"
    },
    message: {
        type: String
    },
    content: {
        type: String
    },
    is_read: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

notificationSchema.index({ receiver: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ receiver: 1, type: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;


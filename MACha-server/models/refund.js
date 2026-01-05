import mongoose from "mongoose";

const refundSchema = new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true,
        index: true
    },
    donation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Donation",
        required: true,
        index: true
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    original_amount: {
        type: Number,
        required: true,
        min: 0
    },
    refunded_amount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    refund_ratio: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    remaining_refund: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    refund_status: {
        type: String,
        enum: ["partial", "completed", "failed", "pending"],
        default: "pending",
        index: true
    },
    refund_method: {
        type: String,
        enum: ["escrow", "recovery"],
        required: true
    },
    refund_transaction_id: {
        type: String,
        default: null,
        index: true
    },
    refund_response_data: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    refunded_at: {
        type: Date,
        default: null
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    notes: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

refundSchema.index({ campaign: 1, refund_status: 1 });
refundSchema.index({ donation: 1 });
refundSchema.index({ donor: 1, refund_status: 1 });
refundSchema.index({ createdAt: -1 });

const Refund = mongoose.model("Refund", refundSchema);
export default Refund;


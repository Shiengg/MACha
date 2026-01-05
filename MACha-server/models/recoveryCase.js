import mongoose from "mongoose";

const recoveryCaseSchema = new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true,
        index: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    total_amount: {
        type: Number,
        required: true,
        min: 0
    },
    recovered_amount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "failed", "legal_action"],
        default: "pending",
        index: true
    },
    deadline: {
        type: Date,
        required: true,
        index: true
    },
    recovery_method: {
        type: String,
        enum: ["voluntary", "legal", "insurance"],
        default: "voluntary"
    },
    legal_case_id: {
        type: String,
        default: null,
        index: true
    },
    notes: {
        type: String,
        default: null
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    timeline: [{
        date: {
            type: Date,
            default: Date.now
        },
        action: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            default: 0
        },
        notes: {
            type: String,
            default: null
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }]
}, {
    timestamps: true
});

recoveryCaseSchema.index({ campaign: 1 });
recoveryCaseSchema.index({ creator: 1, status: 1 });
recoveryCaseSchema.index({ status: 1, deadline: 1 });
recoveryCaseSchema.index({ createdAt: -1 });

const RecoveryCase = mongoose.model("RecoveryCase", recoveryCaseSchema);
export default RecoveryCase;


import mongoose from "mongoose";

const escrowSchema = new mongoose.Schema({
    // Reference to Campaign
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true,
        index: true
    },
    total_amount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    remaining_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    withdrawal_request_amount: {
        type: Number,
        required: true,
        min: 0
    },
    requested_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    request_reason: {
        type: String,
        default: null
    },
    request_status: {
        type: String,
        enum: [
            "pending_voting",      // Đang chờ donors vote
            "voting_in_progress",  // Đang trong quá trình vote
            "voting_completed",    // Vote xong, chờ admin quyết định
            "admin_approved",      // Admin đã duyệt, chờ chuyển tiền
            "admin_rejected",      // Admin từ chối
            "released",            // Đã chuyển tiền
            "cancelled"            // Creator hủy request
        ],
        default: "pending_voting",
        index: true
    },
    voting_start_date: {
        type: Date,
        default: null
    },
    voting_end_date: {
        type: Date,
        default: null,
        index: true
    },
    admin_reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    admin_reviewed_at: {
        type: Date,
        default: null
    },
    admin_rejection_reason: {
        type: String,
        default: null
    },
    auto_created: {
        type: Boolean,
        default: false,
        index: true
    },
    milestone_percentage: {
        type: Number,
        default: null,
        min: 0,
        max: 100
    },
    approved_at: {
        type: Date,
        default: null
    },
    released_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: true
    }
)

escrowSchema.index({ campaign: 1, request_status: 1, createdAt: -1 });
escrowSchema.index({ requested_by: 1, request_status: 1 });
escrowSchema.index({ voting_end_date: 1, request_status: 1 });
escrowSchema.index({ request_status: 1, createdAt: -1 });

const Escrow = mongoose.model("Escrow", escrowSchema);
export default Escrow;
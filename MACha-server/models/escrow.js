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
    },
    order_invoice_number: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    sepay_transaction_id: {
        type: String,
        index: true
    },
    sepay_payment_method: {
        type: String,
        enum: ["CARD", "BANK_TRANSFER", "NAPAS_BANK_TRANSFER"],
        default: null
    },
    sepay_response_data: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    // Idempotency fields để tránh gửi notification trùng
    threshold_notified_at: {
        type: Date,
        default: null,
        index: true
    },
    admin_approved_notified_at: {
        type: Date,
        default: null,
        index: true
    },
    // Idempotency field để tránh gửi email trùng khi escrow đạt threshold
    vote_email_sent_at: {
        type: Date,
        default: null,
        index: true
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

escrowSchema.index(
    { campaign: 1, milestone_percentage: 1, auto_created: 1 },
    { 
        unique: true,
        partialFilterExpression: {
            auto_created: true,
            request_status: { 
                $in: [
                    'pending_voting', 
                    'voting_in_progress', 
                    'voting_completed', 
                    'admin_approved'
                ] 
            }
        },
        name: 'unique_milestone_withdrawal_request'
    }
);

const Escrow = mongoose.model("Escrow", escrowSchema);
export default Escrow;
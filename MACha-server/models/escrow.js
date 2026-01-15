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
            "pending_voting",          // Đang chờ donors vote
            "voting_in_progress",      // Đang trong quá trình vote (WAITING_FOR_VOTE)
            "voting_extended",         // Đã gia hạn thời gian vote (VOTING_EXTENDED)
            "voting_completed",        // Vote xong, chờ admin quyết định
            "rejected_by_community",   // Bị từ chối bởi cộng đồng (>50% reject) (REJECTED_BY_COMMUNITY)
            "admin_approved",          // Admin đã duyệt, chờ chuyển tiền (APPROVED_BY_ADMIN)
            "admin_rejected",          // Admin từ chối
            "released",                // Đã chuyển tiền
            "cancelled"                // Creator hủy request
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
    },
    // Audit fields cho community rejection
    community_rejected_at: {
        type: Date,
        default: null,
        index: true
    },
    // Field để track số lần gia hạn vote
    voting_extended_count: {
        type: Number,
        default: 0,
        min: 0
    },
    // Field để track lần gia hạn cuối
    last_extended_at: {
        type: Date,
        default: null
    },
    // Field để track admin đã gia hạn vote
    voting_extended_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    // ==================== DISBURSEMENT PROOF FIELDS ====================
    // Bill giải ngân - bằng chứng tài chính bắt buộc khi release escrow
    // Được hiển thị CÔNG KHAI trong campaign để đảm bảo minh bạch
    disbursement_proof_images: {
        type: [String],
        default: [],
        validate: {
            validator: function(v) {
                // Nếu request_status = "released", phải có ít nhất 1 ảnh
                if (this.request_status === "released" && (!v || v.length === 0)) {
                    return false;
                }
                return true;
            },
            message: "Bill giải ngân là bắt buộc khi release escrow"
        }
    },
    // Ghi chú giải ngân (optional)
    disbursement_note: {
        type: String,
        default: null,
        maxlength: 1000
    },
    // Owner đã giải ngân (User - owner của campaign)
    disbursed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },
    // Admin verify bill (nếu có)
    disbursement_verified_at: {
        type: Date,
        default: null
    },
    // ==================== POST-RELEASE UPDATE TRACKING FIELDS ====================
    // Các fields này CHỈ áp dụng khi request_status = "released"
    // Track nghĩa vụ creator phải cập nhật tiến độ sau khi được giải ngân
    // Deadline phải update (dựa trên milestone.commitment_days)
    update_required_by: {
        type: Date,
        default: null,
        index: true
    },
    // Thời điểm creator đã update hợp lệ (fulfilled requirement)
    update_fulfilled_at: {
        type: Date,
        default: null,
        index: true
    },
    // Thời điểm đã gửi email cảnh báo (idempotency - tránh gửi mail trùng)
    update_warning_email_sent_at: {
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

// Index for checking overdue updates (used in background job)
escrowSchema.index(
    { 
        request_status: 1, 
        update_fulfilled_at: 1, 
        update_required_by: 1, 
        update_warning_email_sent_at: 1 
    },
    { 
        name: 'overdue_update_check_index',
        // Partial index: chỉ index các escrow released và chưa fulfilled
        partialFilterExpression: {
            request_status: 'released',
            update_fulfilled_at: null
        }
    }
);

const Escrow = mongoose.model("Escrow", escrowSchema);
export default Escrow;
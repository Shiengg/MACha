import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true,
        index: true
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: "VND",
        enum: ["VND", "USD", "EUR"],
        index: true
    },
    donation_method: {
        type: String,
        enum: ["bank_transfer", "cash", "sepay"],
        required: true,
        index: true
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
    payment_status: {
        type: String,
        enum: ["pending", "completed", "failed", "cancelled", "refunded", "partially_refunded"],
        default: "pending",
        index: true
    },
    paid_at: {
        type: Date,
        default: null
    },
    failed_at: {
        type: Date,
        default: null
    },
    cancelled_at: {
        type: Date,
        default: null
    },
    refunded_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    refund_ratio: {
        type: Number,
        default: null,
        min: 0,
        max: 1
    },
    remaining_refund_pending: {
        type: Number,
        default: 0,
        min: 0
    },
    refunded_at: {
        type: Date,
        default: null
    },
    is_anonymous: {
        type: Boolean,
        default: false,
        index: true
    },
    companion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CampaignCompanion",
        default: null,
        index: true
    },
    notes: {
        type: String,
        default: null
    }
},
    {
        timestamps: true
    }
)

donationSchema.index({ campaign: 1, payment_status: 1, createdAt: -1 });
donationSchema.index({ payment_status: 1, createdAt: -1 });
donationSchema.index({ donation_method: 1, payment_status: 1 });
donationSchema.index({ createdAt: -1 });

const Donation = mongoose.model("Donation", donationSchema);
export default Donation;
import mongoose from "mongoose";

const kycSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    
    status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
        required: true,
        index: true
    },
    
    documents: {
        identity_front_url: String,
        identity_back_url: String,
        selfie_url: String,
        tax_document_url: String,
        bank_statement_url: String
    },
    
    extracted_data: {
        identity_verified_name: String,
        identity_card_number: String,
        identity_card_last4: String,
        tax_code: String,
        date_of_birth: Date,
        address: {
            city: String,
            district: String,
            full_address: String
        },
        bank_account: {
            bank_name: String,
            account_number: String,
            account_number_last4: String,
            account_holder_name: String,
            bank_document_url: String
        }
    },
    
    ai_processing: {
        model_version: String,
        processing_method: {
            type: String,
            enum: ["manual", "ai_auto", "ai_manual_review"],
            default: "manual"
        },
        confidence_scores: {
            identity_match: Number,
            face_match: Number,
            document_validity: Number,
            overall_confidence: Number
        },
        extracted_fields: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        processing_errors: [{
            field: String,
            error: String,
            timestamp: Date
        }],
        ai_notes: String,
        processing_time_ms: Number
    },
    
    manual_review: {
        reviewed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewed_at: {
            type: Date,
            default: null
        },
        review_notes: String,
        override_ai_decision: {
            type: Boolean,
            default: false
        }
    },
    
    submitted_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    processed_at: {
        type: Date,
        default: null
    },
    verified_at: {
        type: Date,
        default: null
    },
    rejected_at: {
        type: Date,
        default: null
    },
    verified_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    rejected_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    rejection_reason: {
        type: String,
        default: null
    },
    
    submission_number: {
        type: Number,
        default: 1,
        min: 1
    },
    previous_kyc_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KYC",
        default: null
    }
}, {
    timestamps: true
});

kycSchema.index({ user: 1, status: 1 });
kycSchema.index({ status: 1, submitted_at: -1 });
kycSchema.index({ user: 1, submission_number: -1 });

const KYC = mongoose.model("KYC", kycSchema);
export default KYC;


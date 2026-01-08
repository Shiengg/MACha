import mongoose from "mongoose";
import { encrypt, decrypt, isEncrypted } from "../utils/encryption.js";

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
        gender: String,
        nationality: String,
        ethnicity: String,
        religion: String,
        home_town: String,
        issue_date: Date,
        issue_location: String,
        expiry_date: Date,
        characteristics: String,
        mrz_code: String,
        address: {
            city: String,
            district: String,
            ward: String,
            full_address: String,
            address_entities: mongoose.Schema.Types.Mixed
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
        provider: {
            type: String,
            enum: ["FPT-AI", "VNPT-eKYC", "Manual"],
            default: "Manual"
        },
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
        face_comparison: {
            similarity: Number,
            is_match: Boolean,
            threshold: Number
        },
        liveness_check: {
            is_live: Boolean,
            confidence: Number
        },
        document_quality: {
            is_valid: Boolean,
            quality_score: Number,
            issues: [String]
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
        mismatch_reasons: [String],
        ai_notes: String,
        recommendation: {
            type: String,
            enum: ["APPROVE", "REJECT", "MANUAL_REVIEW"],
            default: "MANUAL_REVIEW"
        },
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

kycSchema.pre('save', function(next) {
    if (this.extracted_data?.identity_card_number) {
        const cardNumber = this.extracted_data.identity_card_number;
        if (!isEncrypted(cardNumber)) {
            this.extracted_data.identity_card_number = encrypt(cardNumber);
            if (cardNumber.length >= 4) {
                this.extracted_data.identity_card_last4 = cardNumber.slice(-4);
            }
        }
    }
    
    if (this.extracted_data?.bank_account?.account_number) {
        const accountNumber = this.extracted_data.bank_account.account_number;
        if (!isEncrypted(accountNumber)) {
            this.extracted_data.bank_account.account_number = encrypt(accountNumber);
            if (accountNumber.length >= 4) {
                this.extracted_data.bank_account.account_number_last4 = accountNumber.slice(-4);
            }
        }
    }
    
    next();
});

kycSchema.methods.getDecryptedData = function() {
    const decrypted = this.toObject();
    
    // Decrypt identity_card_number
    if (decrypted.extracted_data?.identity_card_number) {
        const decryptedNumber = decrypt(decrypted.extracted_data.identity_card_number);
        if (decryptedNumber) {
            decrypted.extracted_data.identity_card_number = decryptedNumber;
        }
    }
    
    // Decrypt account_number
    if (decrypted.extracted_data?.bank_account?.account_number) {
        const decryptedAccount = decrypt(decrypted.extracted_data.bank_account.account_number);
        if (decryptedAccount) {
            decrypted.extracted_data.bank_account.account_number = decryptedAccount;
        }
    }
    
    return decrypted;
};

kycSchema.index({ user: 1, status: 1 });
kycSchema.index({ status: 1, submitted_at: -1 });
kycSchema.index({ user: 1, submission_number: -1 });

const KYC = mongoose.model("KYC", kycSchema);
export default KYC;


import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    goal_amount: {
        type: Number,
        required: true
    },
    current_amount: {
        type: Number,
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ["pending", "active", "rejected", "completed", "cancelled"],
        default: "pending"
    },
    category: {
        type: String,
        enum: [
            "children",           // Trẻ em
            "elderly",            // Người già
            "poverty",            // Người nghèo
            "disaster",           // Thiên tai (lũ lụt, bão, hạn hán)
            "medical",            // Y tế, bệnh hiểm nghèo
            "education",          // Giáo dục
            "disability",         // Người khuyết tật
            "animal",             // Động vật
            "environment",        // Môi trường
            "community",          // Cộng đồng
            "other"              // Khác
        ],
        required: true,
        index: true  
    },
    proof_documents_url: {
        type: String
    },
    media_url: [{
        type: String
    }],
    cancellation_reason: {
        type: String,
        default: null
    },
    cancelled_at: {
        type: Date,
        default: null
    },
    rejection_reason: {
        type: String,
        default: null
    },
    approved_at: {
        type: Date,
        default: null
    },
    rejected_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: true
    }
)

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;
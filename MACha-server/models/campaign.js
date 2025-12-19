import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Contact Information
    contact_info: {
        fullname: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        social_links: {
            facebook: String,
            instagram: String,
            twitter: String,
            website: String
        },
        address: {
            type: String,
            required: true
        }
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
        required: true,
        default: 0
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
    banner_image: {
        type: String,
        required: [true, 'Banner image is required'],
    },
    gallery_images: [{
        type: String,
    }],
    proof_documents_url: {
        type: String,
        //required: [true, 'Proof documents are required for verification']
    },
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
    },
    total_donations_count: {
        type: Number,
        default: 0,
        min: 0
    },
    completed_donations_count: {
        type: Number,
        default: 0,
        min: 0
    }
},
    {
        timestamps: true
    }
)

// Indexes for common queries
campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ category: 1, status: 1 });
campaignSchema.index({ creator: 1, status: 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;
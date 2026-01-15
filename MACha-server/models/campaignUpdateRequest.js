import mongoose from "mongoose";

const campaignUpdateRequestSchema = new mongoose.Schema({
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
    requested_changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        // Chỉ cho phép các field: banner_image, gallery_images, description, end_date
        validate: {
            validator: function(changes) {
                const allowedFields = ['banner_image', 'gallery_images', 'description', 'end_date'];
                const changeFields = Object.keys(changes);
                return changeFields.every(field => allowedFields.includes(field));
            },
            message: 'Chỉ được chỉnh sửa: banner_image, gallery_images, description, end_date'
        }
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    admin_note: {
        type: String,
        default: null
    },
    reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    reviewed_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for common queries
campaignUpdateRequestSchema.index({ campaign: 1, status: 1 });
campaignUpdateRequestSchema.index({ creator: 1, status: 1 });
campaignUpdateRequestSchema.index({ status: 1, createdAt: -1 });

// Compound unique index to ensure only one pending request per campaign
// Note: This index will prevent multiple pending requests for the same campaign
campaignUpdateRequestSchema.index(
    { campaign: 1, status: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { status: 'pending' },
        name: 'campaign_pending_unique_idx'
    }
);

const CampaignUpdateRequest = mongoose.model("CampaignUpdateRequest", campaignUpdateRequestSchema);
export default CampaignUpdateRequest;


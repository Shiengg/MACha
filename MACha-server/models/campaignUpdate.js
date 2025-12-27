import mongoose from "mongoose";

const campaignUpdateSchema = new mongoose.Schema({
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
    content: {
        type: String,
        default: null
    },
    image_url: {
        type: String,
        default: null
    }
},
{
    timestamps: true
});

campaignUpdateSchema.index({ campaign: 1, createdAt: -1 });
campaignUpdateSchema.index({ creator: 1, createdAt: -1 });

// Validation: at least one of content or image_url must be provided
campaignUpdateSchema.pre('validate', function(next) {
    if (!this.content && !this.image_url) {
        return next(new Error('Either content or image_url must be provided'));
    }
    next();
});

const CampaignUpdate = mongoose.model("CampaignUpdate", campaignUpdateSchema);
export default CampaignUpdate;


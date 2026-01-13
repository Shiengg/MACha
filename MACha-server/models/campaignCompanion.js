import mongoose from "mongoose";

const campaignCompanionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true,
        index: true
    },
    joined_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    is_active: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

campaignCompanionSchema.index({ user: 1, campaign: 1 }, { unique: true });
campaignCompanionSchema.index({ campaign: 1, is_active: 1 });
campaignCompanionSchema.index({ user: 1, is_active: 1 });

const CampaignCompanion = mongoose.model("CampaignCompanion", campaignCompanionSchema);
export default CampaignCompanion;


import mongoose from 'mongoose';

const hashtagSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        lowercase: true, 
        trim: true 
    },
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true
    },
    created_at: { type: Date, default: Date.now },
});

// Compound unique index: name + campaign to ensure no duplicate hashtags per campaign
hashtagSchema.index({ name: 1, campaign: 1 }, { unique: true });

export default mongoose.model('Hashtag', hashtagSchema);

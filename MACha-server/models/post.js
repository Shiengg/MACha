import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content_text: {
        type: String,
        required: true
    },
    media_url: [{
        type: String,
        default: null
    }],
    hashtags: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Hashtag'
    }],

    campaign_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        default: null,
        index: true
    },
    event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        default: null,
        index: true
    },
    is_hidden: {
        type: Boolean,
        default: false,
        index: true
    },
},
    {
        timestamps: true
    }
);

postSchema.index({ event_id: 1, createdAt: -1 });
// Indexes for common queries
postSchema.index({ user: 1, createdAt: -1 }); // User posts feed
postSchema.index({ is_hidden: 1, createdAt: -1 }); // Filter hidden posts
postSchema.index({ createdAt: -1 }); // Default sort by newest
postSchema.index({ hashtags: 1, createdAt: -1 }); // Hashtag queries
postSchema.index({ campaign_id: 1, createdAt: -1 }); // Campaign posts

const Post = mongoose.model("Post", postSchema)
export default Post;
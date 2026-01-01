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
},
    {
        timestamps: true
    }
);

postSchema.index({ event_id: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema)
export default Post;
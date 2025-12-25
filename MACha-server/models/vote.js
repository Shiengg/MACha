import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    value: {
        type: String,
        enum: [
            "approve",
            "reject",
        ],
        required: true
    }
},
    {
        timestamps: true
    }
)

const Vote = mongoose.model("Vote", voteSchema);
voteSchema.index({ campaign: 1, donor: 1 }, { unique: true });
export default Vote;
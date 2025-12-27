import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
    escrow: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Escrow",
        required: true,
        index: true
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    value: {
        type: String,
        enum: ["approve", "reject"],
        required: true
    },
    donated_amount: {
        type: Number,
        required: true,
        min: 0
    },
    vote_weight: {
        type: Number,
        required: true,
        min: 0
    }
},
    {
        timestamps: true
    }
)

// Unique index: mỗi donor chỉ có thể vote 1 lần cho 1 withdrawal request
voteSchema.index({ escrow: 1, donor: 1 }, { unique: true });

// Indexes for querying
voteSchema.index({ escrow: 1, value: 1 });
voteSchema.index({ escrow: 1, createdAt: -1 });

const Vote = mongoose.model("Vote", voteSchema);
export default Vote;
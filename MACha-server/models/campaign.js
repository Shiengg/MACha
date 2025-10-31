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
        enum: ["active", "completed", "cancelled"],
        default: "active"
    },
    proof_documents_url: {
        type: String
    }
},
    {
        timestamps: true
    }
)

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;
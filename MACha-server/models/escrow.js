import mongoose from "mongoose";

const escrowSchema = new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
        required: true
    },
    total_amount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: [
            "locked",
            "approved",
            "released",
            "refunded"
        ],
        default: "locked"
    },
    approved_at: {
        type: Date,
    },
    released_at: {
        type: Date
    }
},
    {
        timestamps: true
    }
)

const Escrow = mongoose.model("Escrow", escrowSchema);
export default Escrow;
import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
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
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "VND"
    },
    donation_method: {
        type: String,
        enum: ["bank_transfer", "crypto", "cash"],
        required: true
    },
    blockchain_tx_hash: {
        type: String
    },
    is_anonymous: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
)

const Donation = mongoose.model("Donation", donationSchema);
export default Donation;
import mongoose from "mongoose";

const blockchainTxSchema = new mongoose.Schema({
    donation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Donation",
        required: true
    },
    blockchain_network: {
        type: String
    },
    tx_hash: {
        type: String
    },
    tx_status: {
        type: String,
        enum: ["pending", "confirmed", "failed"],
        default: "pending"
    },
    block_number: {
        type: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
});

const BlockchainTransaction = mongoose.model("BlockchainTransaction", blockchainTxSchema);
export default BlockchainTransaction;

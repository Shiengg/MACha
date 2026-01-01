import mongoose from "mongoose";

const searchHistoriesSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    keyword: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SearchKeywords",
        required: true,
        index: true
    },
    searchedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
})

searchHistoriesSchema.index({ user: 1, searchedAt: -1 });
searchHistoriesSchema.index({ keyword: 1, searchedAt: -1 });

const SearchHistories = mongoose.model("SearchHistories", searchHistoriesSchema);
export default SearchHistories;
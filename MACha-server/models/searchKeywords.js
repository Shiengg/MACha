import mongoose from "mongoose";

const searchKeywordsSchema = new mongoose.Schema({
    keyword: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    type: {
        type: String,
        enum: ["hashtag", "keyword"],
        required: true,
    },
    search_count: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
})

searchKeywordsSchema.index({ keyword: 1, type: 1 }, { unique: true });
searchKeywordsSchema.index({ search_count: -1 });

const SearchKeywords = mongoose.model("SearchKeywords", searchKeywordsSchema);
export default SearchKeywords;
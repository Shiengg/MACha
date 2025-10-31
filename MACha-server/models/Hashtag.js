import mongoose from 'mongoose';

const hashtagSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Hashtag', hashtagSchema);

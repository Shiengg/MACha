import mongoose from 'mongoose';

const eventUpdateSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    media_urls: [{
        type: String,
    }]
},
    {
        timestamps: true
    }
)

eventUpdateSchema.index({ event: 1, createdAt: -1 });
eventUpdateSchema.index({ author: 1, createdAt: -1 });

const EventUpdate = mongoose.model("EventUpdate", eventUpdateSchema)
export default EventUpdate;
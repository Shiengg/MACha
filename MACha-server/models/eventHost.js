import mongoose from 'mongoose';

const eventHostSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ["creator", "co_host"],
        default: "co_host",
        required: true,
    },
    added_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
},
    {
        timestamps: true
    }
)

eventHostSchema.index({ event: 1, user: 1 }, { unique: true });
eventHostSchema.index({ user: 1, role: 1 });

const EventHost = mongoose.model("EventHost", eventHostSchema)
export default EventHost;
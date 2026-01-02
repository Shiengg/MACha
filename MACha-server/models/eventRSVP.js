import mongoose from 'mongoose';

const eventRSVPSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: [
            "going",
            "interested",
            "maybe",
            "not_going",
        ],
        default: "interested",
        required: true,
        index: true
    },
    guests_count: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String,
        default: null,
        maxlength: 500
    }
},
    {
        timestamps: true
    }
)

// Unique index: mỗi user chỉ có thể có 1 RSVP cho 1 event
eventRSVPSchema.index({ event: 1, user: 1 }, { unique: true });

// Index để đếm số người theo status
eventRSVPSchema.index({ event: 1, status: 1 });

// Index để lấy events của user
eventRSVPSchema.index({ user: 1, status: 1, createdAt: -1 });

const EventRSVP = mongoose.model("EventRSVP", eventRSVPSchema)
export default EventRSVP;
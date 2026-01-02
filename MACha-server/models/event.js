import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: null,
    },
    banner_image: {
        type: String,
        required: [true, 'Banner image is required'],
    },
    gallery_images: [{
        type: String,
    }],
    start_date: {
        type: Date,
        required: true,
        index: true
    },
    end_date: {
        type: Date,
        default: null
    },
    timezone: {
        type: String,
        default: "Asia/Ho_Chi_Minh"
    },
    location: {
        venue_name: {
            type: String,
            default: null
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true,
            index: true
        },
        district: {
            type: String,
            default: null
        },
        country: {
            type: String,
            default: "Vietnam"
        },
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        }
    },
    category: {
        type: String,
        enum: [
            "volunteering",      // Tình nguyện
            "fundraising",       // Gây quỹ
            "charity_event",     // Sự kiện từ thiện
            "donation_drive",    // Tập hợp đóng góp (ví dụ: mì gói, quần áo)
        ],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: [
            "draft",        // Nháp
            "pending",      // Chờ duyệt
            "published",    // Đã duyệt và công khai
            "rejected",     // Bị từ chối
            "cancelled",    // Đã hủy
            "completed"     // Đã hoàn thành
        ],
        default: "draft",
        index: true
    },
    capacity: {
        type: Number,
        default: null,
        min: 1
    },
    approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    approved_at: {
        type: Date,
        default: null,
    },
    rejected_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    rejected_at: {
        type: Date,
        default: null,
    },
    rejected_reason: {
        type: String,
        default: null,
    },
    cancelled_at: {
        type: Date,
        default: null,
    },
    cancelled_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    cancellation_reason: {
        type: String,
        default: null,
    }
},
    {
        timestamps: true
    }
);

// Indexes for common queries
eventSchema.index({ creator: 1, status: 1 });
eventSchema.index({ status: 1, start_date: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ "location.city": 1, status: 1 });

const Event = mongoose.model("Event", eventSchema)
export default Event;
import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    reported_type: {
        type: String,
        enum: ["post", "campaign", "user", "comment", "event"],
        required: true,
        index: true
    },
    reported_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    reported_reason: {
        type: String,
        enum: [
            "spam",
            "inappropriate_content",
            "scam",
            "fake",
            "harassment",
            "violence",
            "copyright",
            "misinformation",
            "other"
        ],
        required: true,
        index: true
    },
    description: {
        type: String,
        maxlength: 1000,
        default: null,
        trim: true
    },
    status: {
        type: String,
        enum: ["pending", "reviewing", "resolved", "rejected", "auto_resolved"],
        default: "pending",
        index: true
    },
    reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    reviewed_at: {
        type: Date,
        default: null
    },
    resolution: {
        type: String,
        enum: [
            "removed",
            "user_warned",
            "user_banned",
            "no_action",
        ],
        default: null,
        validate: {
            validator: function(value) {
                // resolution chỉ có giá trị khi status là resolved hoặc rejected
                if (value !== null) {
                    return ['resolved', 'rejected', 'auto_resolved'].includes(this.status);
                }
                return true;
            },
            message: 'Resolution can only be set when status is resolved, rejected, or auto_resolved'
        }
    },
    resolution_details: {
        type: String,
        default: null,
        trim: true
    },
    submitted_at: {
        type: Date,
        default: Date.now,
    },
    resolved_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Thêm createdAt và updatedAt tự động
});

// Index để tránh duplicate reports từ cùng một user cho cùng một đối tượng
reportSchema.index({ reporter: 1, reported_type: 1, reported_id: 1 }, { unique: true });

// Index để query reports theo loại và ID của đối tượng được report
reportSchema.index({ reported_type: 1, reported_id: 1 });

// Index để query reports theo status (thường dùng cho admin dashboard)
reportSchema.index({ status: 1, submitted_at: -1 });

// Index để query reports theo reporter
reportSchema.index({ reporter: 1, submitted_at: -1 });

// Pre-save middleware để tự động set dates
reportSchema.pre('save', function(next) {
    // Tự động set reviewed_at khi có reviewed_by
    if (this.reviewed_by && !this.reviewed_at && !this.isNew) {
        this.reviewed_at = new Date();
    }
    
    // Tự động set resolved_at khi status chuyển sang resolved/rejected/auto_resolved
    if (!this.isNew) {
        const resolvedStatuses = ['resolved', 'rejected', 'auto_resolved'];
        if (resolvedStatuses.includes(this.status) && !this.resolved_at) {
            this.resolved_at = new Date();
        }
    }
    
    next();
});

// Method để check xem user đã report đối tượng này chưa
reportSchema.statics.hasUserReported = async function(reporterId, reportedType, reportedId) {
    const report = await this.findOne({
        reporter: reporterId,
        reported_type: reportedType,
        reported_id: reportedId
    });
    return !!report;
};

const Report = mongoose.model("Report", reportSchema);
export default Report;
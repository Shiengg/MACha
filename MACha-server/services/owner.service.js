import mongoose from "mongoose";
import User from "../models/user.js";
import Donation from "../models/donation.js";
import Escrow from "../models/escrow.js";
import Campaign from "../models/campaign.js";
import Event from "../models/event.js";
import KYC from "../models/kyc.js";
import Report from "../models/report.js";
import Post from "../models/post.js";

export const getDashboard = async () => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setMonth(now.getMonth() - 1));
    
    const [
        totalUsers,
        totalAdmins,
        totalCampaigns,
        totalEvents,
        totalDonations,
        totalEscrows,
        totalReports,
        totalKYC
    ] = await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "admin" }),
        Campaign.countDocuments(),
        Event.countDocuments(),
        Donation.countDocuments(),
        Escrow.countDocuments(),
        Report.countDocuments(),
        KYC.countDocuments()
    ]);

    const activeCampaigns = await Campaign.countDocuments({ status: "active" });
    const pendingCampaigns = await Campaign.countDocuments({ status: "pending" });
    const pendingEvents = await Event.countDocuments({ status: "pending" });
    const pendingReports = await Report.countDocuments({ status: "pending" });
    const pendingKYC = await KYC.countDocuments({ status: "pending" });

    const [totalDonated, totalReleased, totalPending] = await Promise.all([
        Donation.aggregate([
            { $match: { payment_status: "completed" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Escrow.aggregate([
            { $match: { request_status: "released" } },
            { $group: { _id: null, total: { $sum: "$withdrawal_request_amount" } } }
        ]),
        Escrow.aggregate([
            { $match: { request_status: { $in: ["admin_approved", "voting_completed"] } } },
            { $group: { _id: null, total: { $sum: "$withdrawal_request_amount" } } }
        ])
    ]);

    const [
        todayCampaignApprovals, todayCampaignRejections,
        todayEventApprovals, todayEventRejections,
        todayKYCApprovals, todayKYCRejections,
        todayEscrowApprovals, todayEscrowRejections,
        weekCampaignApprovals, weekCampaignRejections,
        weekEventApprovals, weekEventRejections,
        weekKYCApprovals, weekKYCRejections,
        weekEscrowApprovals, weekEscrowRejections,
        monthCampaignApprovals, monthCampaignRejections,
        monthEventApprovals, monthEventRejections,
        monthKYCApprovals, monthKYCRejections,
        monthEscrowApprovals, monthEscrowRejections
    ] = await Promise.all([
        Campaign.countDocuments({ approved_at: { $gte: todayStart } }),
        Campaign.countDocuments({ rejected_at: { $gte: todayStart } }),
        Event.countDocuments({ approved_at: { $gte: todayStart } }),
        Event.countDocuments({ rejected_at: { $gte: todayStart } }),
        KYC.countDocuments({ verified_at: { $gte: todayStart } }),
        KYC.countDocuments({ rejected_at: { $gte: todayStart } }),
        Escrow.countDocuments({ admin_reviewed_at: { $gte: todayStart }, request_status: "admin_approved" }),
        Escrow.countDocuments({ admin_reviewed_at: { $gte: todayStart }, request_status: "admin_rejected" }),
        Campaign.countDocuments({ approved_at: { $gte: weekStart } }),
        Campaign.countDocuments({ rejected_at: { $gte: weekStart } }),
        Event.countDocuments({ approved_at: { $gte: weekStart } }),
        Event.countDocuments({ rejected_at: { $gte: weekStart } }),
        KYC.countDocuments({ verified_at: { $gte: weekStart } }),
        KYC.countDocuments({ rejected_at: { $gte: weekStart } }),
        Escrow.countDocuments({ admin_reviewed_at: { $gte: weekStart }, request_status: "admin_approved" }),
        Escrow.countDocuments({ admin_reviewed_at: { $gte: weekStart }, request_status: "admin_rejected" }),
        Campaign.countDocuments({ approved_at: { $gte: monthStart } }),
        Campaign.countDocuments({ rejected_at: { $gte: monthStart } }),
        Event.countDocuments({ approved_at: { $gte: monthStart } }),
        Event.countDocuments({ rejected_at: { $gte: monthStart } }),
        KYC.countDocuments({ verified_at: { $gte: monthStart } }),
        KYC.countDocuments({ rejected_at: { $gte: monthStart } }),
        Escrow.countDocuments({ admin_reviewed_at: { $gte: monthStart }, request_status: "admin_approved" }),
        Escrow.countDocuments({ admin_reviewed_at: { $gte: monthStart }, request_status: "admin_rejected" })
    ]);

    const todayApprovals = todayCampaignApprovals + todayEventApprovals + todayKYCApprovals + todayEscrowApprovals;
    const todayRejections = todayCampaignRejections + todayEventRejections + todayKYCRejections + todayEscrowRejections;
    const weekApprovals = weekCampaignApprovals + weekEventApprovals + weekKYCApprovals + weekEscrowApprovals;
    const weekRejections = weekCampaignRejections + weekEventRejections + weekKYCRejections + weekEscrowRejections;
    const monthApprovals = monthCampaignApprovals + monthEventApprovals + monthKYCApprovals + monthEscrowApprovals;
    const monthRejections = monthCampaignRejections + monthEventRejections + monthKYCRejections + monthEscrowRejections;

    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        last12Months.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1
        });
    }

    const financialByTime = await Promise.all(
        last12Months.map(async ({ year, month }) => {
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0, 23, 59, 59);
            
            const [donated, released] = await Promise.all([
                Donation.aggregate([
                    { 
                        $match: { 
                            payment_status: "completed",
                            createdAt: { $gte: monthStart, $lte: monthEnd }
                        } 
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),
                Escrow.aggregate([
                    { 
                        $match: { 
                            request_status: "released",
                            released_at: { $gte: monthStart, $lte: monthEnd }
                        } 
                    },
                    { $group: { _id: null, total: { $sum: "$withdrawal_request_amount" } } }
                ])
            ]);
            
            return {
                month: `${month}/${year}`,
                donated: donated[0]?.total || 0,
                released: released[0]?.total || 0
            };
        })
    );

    const topCampaigns = await Donation.aggregate([
        { $match: { payment_status: "completed" } },
        { $group: { _id: "$campaign", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "campaigns",
                localField: "_id",
                foreignField: "_id",
                as: "campaign"
            }
        },
        { $unwind: "$campaign" },
        {
            $project: {
                campaignId: "$_id",
                title: "$campaign.title",
                total: 1
            }
        }
    ]);

    const topAdmins = await Promise.all([
        Campaign.aggregate([
            { $match: { approved_by: { $ne: null } } },
            { $group: { _id: "$approved_by", count: { $sum: 1 } } }
        ]),
        Campaign.aggregate([
            { $match: { rejected_by: { $ne: null } } },
            { $group: { _id: "$rejected_by", count: { $sum: 1 } } }
        ]),
        Event.aggregate([
            { $match: { approved_by: { $ne: null } } },
            { $group: { _id: "$approved_by", count: { $sum: 1 } } }
        ]),
        Event.aggregate([
            { $match: { rejected_by: { $ne: null } } },
            { $group: { _id: "$rejected_by", count: { $sum: 1 } } }
        ]),
        KYC.aggregate([
            { $match: { verified_by: { $ne: null } } },
            { $group: { _id: "$verified_by", count: { $sum: 1 } } }
        ]),
        KYC.aggregate([
            { $match: { rejected_by: { $ne: null } } },
            { $group: { _id: "$rejected_by", count: { $sum: 1 } } }
        ]),
        Report.aggregate([
            { $match: { reviewed_by: { $ne: null } } },
            { $group: { _id: "$reviewed_by", count: { $sum: 1 } } }
        ]),
        Escrow.aggregate([
            { $match: { admin_reviewed_by: { $ne: null } } },
            { $group: { _id: "$admin_reviewed_by", count: { $sum: 1 } } }
        ])
    ]).then(results => {
        const adminMap = new Map();
        results.flat().forEach(item => {
            const adminId = item._id.toString();
            adminMap.set(adminId, (adminMap.get(adminId) || 0) + item.count);
        });
        
        return Array.from(adminMap.entries())
            .map(([adminId, total]) => ({ adminId, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    });

    const topAdminsWithDetails = await Promise.all(
        topAdmins.map(async ({ adminId, total }) => {
            const admin = await User.findById(adminId).select("username");
            return {
                adminId,
                username: admin?.username || "Unknown",
                total
            };
        })
    );

    return {
        overview: {
            users: totalUsers,
            admins: totalAdmins,
            campaigns: totalCampaigns,
            events: totalEvents,
            donations: totalDonations,
            escrows: totalEscrows,
            reports: totalReports,
            kyc_submissions: totalKYC
        },
        pending: {
            campaigns: pendingCampaigns,
            events: pendingEvents,
            reports: pendingReports,
            kyc: pendingKYC
        },
        active: {
            campaigns: activeCampaigns
        },
        financial: {
            total_donated: totalDonated[0]?.total || 0,
            total_released: totalReleased[0]?.total || 0,
            total_pending: totalPending[0]?.total || 0
        },
        approvals_rejections: {
            today: {
                approvals: todayApprovals,
                rejections: todayRejections
            },
            week: {
                approvals: weekApprovals,
                rejections: weekRejections
            },
            month: {
                approvals: monthApprovals,
                rejections: monthRejections
            }
        },
        financial_by_time: financialByTime,
        top_campaigns: topCampaigns,
        top_admins: topAdminsWithDetails
    };
};

export const getUsersForAdminCreation = async () => {
    const users = await User.find({ role: "user" })
        .select("_id username email fullname avatar")
        .sort({ username: 1 });
    
    return users;
};

export const getAdmins = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
        User.find({ role: "admin" })
            .select("username email fullname avatar createdAt is_verified is_banned")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments({ role: "admin" })
    ]);

    const adminsWithStats = await Promise.all(
        admins.map(async (admin) => {
            const [
                campaignApprovals,
                campaignRejections,
                eventApprovals,
                eventRejections,
                kycApprovals,
                kycRejections,
                reportResolutions,
                withdrawalApprovals,
                withdrawalRejections
            ] = await Promise.all([
                Campaign.countDocuments({ approved_by: admin._id }),
                Campaign.countDocuments({ rejected_by: admin._id }),
                Event.countDocuments({ approved_by: admin._id }),
                Event.countDocuments({ rejected_by: admin._id }),
                KYC.countDocuments({ verified_by: admin._id }),
                KYC.countDocuments({ rejected_by: admin._id }),
                Report.countDocuments({ reviewed_by: admin._id }),
                Escrow.countDocuments({ admin_reviewed_by: admin._id, request_status: "admin_approved" }),
                Escrow.countDocuments({ admin_reviewed_by: admin._id, request_status: "admin_rejected" })
            ]);

            const totalApprovals = campaignApprovals + eventApprovals + kycApprovals + withdrawalApprovals;
            const totalRejections = campaignRejections + eventRejections + kycRejections + withdrawalRejections;

            return {
                ...admin.toObject(),
                stats: {
                    approvals: totalApprovals,
                    rejections: totalRejections,
                    total: totalApprovals + totalRejections + reportResolutions
                }
            };
        })
    );

    return {
        admins: adminsWithStats,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

export const createAdmin = async (adminData) => {
    const { username, email, password, fullname, avatar } = adminData;

    // Validate required fields
    if (!username || !email || !password) {
        return { success: false, error: "MISSING_REQUIRED_FIELDS" };
    }

    // Validate password length
    if (password.length < 6) {
        return { success: false, error: "PASSWORD_TOO_SHORT" };
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
        $or: [
            { username: username.trim() },
            { email: email.trim().toLowerCase() }
        ]
    });

    if (existingUser) {
        if (existingUser.username === username.trim()) {
            return { success: false, error: "USERNAME_EXISTS" };
        }
        if (existingUser.email === email.trim().toLowerCase()) {
            return { success: false, error: "EMAIL_EXISTS" };
        }
    }

    // Create new admin user
    const newAdmin = new User({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password, // Will be hashed by pre-save hook
        fullname: fullname?.trim() || "",
        avatar: avatar || "",
        role: "admin",
        is_verified: true // Auto-verify admin accounts created by owner
    });

    await newAdmin.save();

    // Return admin without password
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    return { success: true, admin: adminResponse };
};

export const updateAdmin = async (adminId, updates) => {
    const admin = await User.findById(adminId);

    if (!admin) {
        return { success: false, error: "ADMIN_NOT_FOUND" };
    }

    if (admin.role !== "admin") {
        return { success: false, error: "NOT_AN_ADMIN" };
    }

    const allowedFields = ["fullname", "avatar", "bio"];
    const updateData = {};
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    }

    const updatedAdmin = await User.findByIdAndUpdate(
        adminId,
        updateData,
        { new: true }
    ).select("-password");

    return { success: true, admin: updatedAdmin };
};

export const deleteAdmin = async (adminId, ownerId) => {
    const admin = await User.findById(adminId);

    if (!admin) {
        return { success: false, error: "ADMIN_NOT_FOUND" };
    }

    if (admin.role !== "admin") {
        return { success: false, error: "NOT_AN_ADMIN" };
    }

    // Additional check: prevent owner from deleting themselves (double check)
    if (ownerId && adminId.toString() === ownerId.toString()) {
        return { success: false, error: "CANNOT_DELETE_SELF" };
    }

    admin.role = "user";
    await admin.save();

    return { success: true };
};

export const banAdmin = async (adminId, reason, ownerId) => {
    const admin = await User.findById(adminId);

    if (!admin) {
        return { success: false, error: "ADMIN_NOT_FOUND" };
    }

    if (admin.role !== "admin") {
        return { success: false, error: "NOT_AN_ADMIN" };
    }

    if (admin.role === "owner") {
        return { success: false, error: "CANNOT_BAN_OWNER" };
    }

    admin.is_banned = true;
    admin.banned_at = new Date();
    admin.banned_by = ownerId;
    admin.ban_reason = reason || "Banned by owner";
    await admin.save();

    return { success: true, admin };
};

export const unbanAdmin = async (adminId) => {
    const admin = await User.findById(adminId);

    if (!admin) {
        return { success: false, error: "ADMIN_NOT_FOUND" };
    }

    if (admin.role !== "admin") {
        return { success: false, error: "NOT_AN_ADMIN" };
    }

    admin.is_banned = false;
    admin.banned_at = null;
    admin.banned_by = null;
    admin.ban_reason = null;
    await admin.save();

    return { success: true, admin };
};

export const getFinancialOverview = async (startDate, endDate) => {
    const donationMatch = { payment_status: "completed" };
    const escrowReleasedMatch = { request_status: "released" };
    const escrowPendingMatch = { request_status: { $in: ["admin_approved", "voting_completed"] } };
    
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        
        donationMatch.createdAt = dateFilter;
        escrowReleasedMatch.released_at = dateFilter;
        escrowPendingMatch.createdAt = dateFilter;
    } else {
        escrowReleasedMatch.released_at = { $ne: null };
    }

    const [
        totalDonated,
        donationsByMethod,
        donationsByMonth,
        donationsByDay,
        totalReleased,
        releasedByMonth,
        pendingEscrows
    ] = await Promise.all([
        Donation.aggregate([
            { $match: donationMatch },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]),
        Donation.aggregate([
            { $match: donationMatch },
            { $group: { _id: "$donation_method", total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]),
        Donation.aggregate([
            { $match: donationMatch },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]),
        Donation.aggregate([
            { $match: donationMatch },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]),
        Escrow.aggregate([
            { $match: escrowReleasedMatch },
            { $group: { _id: null, total: { $sum: "$withdrawal_request_amount" }, count: { $sum: 1 } } }
        ]),
        Escrow.aggregate([
            { $match: escrowReleasedMatch },
            {
                $group: {
                    _id: {
                        year: { $year: "$released_at" },
                        month: { $month: "$released_at" }
                    },
                    total: { $sum: "$withdrawal_request_amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]),
        Escrow.aggregate([
            { $match: escrowPendingMatch },
            { $group: { _id: null, total: { $sum: "$withdrawal_request_amount" }, count: { $sum: 1 } } }
        ])
    ]);

    return {
        donations: {
            total: totalDonated[0]?.total || 0,
            count: totalDonated[0]?.count || 0,
            by_method: donationsByMethod,
            by_month: donationsByMonth,
            by_day: donationsByDay
        },
        escrow: {
            total_released: totalReleased[0]?.total || 0,
            released_count: totalReleased[0]?.count || 0,
            by_month: releasedByMonth,
            pending_amount: pendingEscrows[0]?.total || 0,
            pending_count: pendingEscrows[0]?.count || 0
        },
        net_flow: (totalDonated[0]?.total || 0) - (totalReleased[0]?.total || 0)
    };
};

export const getCampaignFinancials = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const campaigns = await Campaign.find()
        .select("title creator current_amount goal_amount status createdAt")
        .populate({
            path: "creator",
            select: "username fullname",
            options: { lean: true }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const campaignFinancials = await Promise.all(
        campaigns.map(async (campaign) => {
            const [donations, releasedEscrows, pendingEscrows] = await Promise.all([
                Donation.aggregate([
                    { $match: { campaign: campaign._id, payment_status: "completed" } },
                    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
                ]),
                Escrow.aggregate([
                    { $match: { campaign: campaign._id, request_status: "released" } },
                    { $group: { _id: null, total: { $sum: "$withdrawal_request_amount" }, count: { $sum: 1 } } }
                ]),
                Escrow.aggregate([
                    { $match: { campaign: campaign._id, request_status: { $in: ["admin_approved", "voting_completed"] } } },
                    { $group: { _id: null, total: { $sum: "$withdrawal_request_amount" }, count: { $sum: 1 } } }
                ])
            ]);

            const totalDonated = donations[0]?.total || 0;
            const totalReleased = releasedEscrows[0]?.total || 0;
            const pendingReleases = pendingEscrows[0]?.total || 0;

            return {
                campaign: {
                    id: campaign._id,
                    title: campaign.title,
                    creator: campaign.creator,
                    goal_amount: campaign.goal_amount,
                    current_amount: campaign.current_amount,
                    status: campaign.status,
                    createdAt: campaign.createdAt
                },
                financials: {
                    current_amount: campaign.current_amount,
                    total_donated: totalDonated,
                    donation_count: donations[0]?.count || 0,
                    total_released: totalReleased,
                    release_count: releasedEscrows[0]?.count || 0,
                    pending_releases: pendingReleases,
                    pending_release_count: pendingEscrows[0]?.count || 0,
                    remaining: totalDonated - totalReleased - pendingReleases
                }
            };
        })
    );

    const total = await Campaign.countDocuments();

    return {
        campaigns: campaignFinancials,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

export const getAdminActivities = async (adminId = null, page = 1, limit = 20) => {
    let adminIds;
    let adminInfo = null;

    if (adminId) {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return {
                statistics: {
                    campaign_approvals: 0,
                    campaign_rejections: 0,
                    event_approvals: 0,
                    event_rejections: 0,
                    kyc_approvals: 0,
                    kyc_rejections: 0,
                    report_resolutions: 0,
                    withdrawal_approvals: 0,
                    withdrawal_rejections: 0,
                    total_actions: 0
                },
                admin: null,
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0
                }
            };
        }

        const admin = await User.findById(adminId).select("_id username role");
        if (!admin || admin.role !== "admin") {
            return {
                statistics: {
                    campaign_approvals: 0,
                    campaign_rejections: 0,
                    event_approvals: 0,
                    event_rejections: 0,
                    kyc_approvals: 0,
                    kyc_rejections: 0,
                    report_resolutions: 0,
                    withdrawal_approvals: 0,
                    withdrawal_rejections: 0,
                    total_actions: 0
                },
                admin: null,
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0
                }
            };
        }
        // Use admin._id (ObjectId) instead of adminId (string) for proper MongoDB matching
        adminIds = [admin._id];
        adminInfo = {
            _id: admin._id,
            username: admin.username
        };
    } else {
        const admins = await User.find({ role: "admin" }).select("_id username");
        adminIds = admins.map(a => a._id);
    }

    // If no admins found, return empty statistics
    if (!adminIds || adminIds.length === 0) {
        return {
            statistics: {
                campaign_approvals: 0,
                campaign_rejections: 0,
                event_approvals: 0,
                event_rejections: 0,
                kyc_approvals: 0,
                kyc_rejections: 0,
                report_resolutions: 0,
                withdrawal_approvals: 0,
                withdrawal_rejections: 0,
                total_actions: 0
            },
            admin: adminInfo,
            pagination: {
                page,
                limit,
                total: adminId ? 1 : 0,
                pages: 0
            }
        };
    }

    // Ensure adminIds are ObjectIds for proper matching
    const adminIdsAsObjectIds = adminIds.map(id => {
        if (id instanceof mongoose.Types.ObjectId) {
            return id;
        }
        return new mongoose.Types.ObjectId(id);
    });
    
    const [
        campaignApprovalsCount,
        campaignRejectionsCount,
        eventApprovalsCount,
        eventRejectionsCount,
        kycVerificationsCount,
        kycRejectionsCount,
        reportResolutionsCount,
        withdrawalApprovalsCount,
        withdrawalRejectionsCount
    ] = await Promise.all([
        Campaign.countDocuments({ approved_by: { $in: adminIdsAsObjectIds } }),
        Campaign.countDocuments({ rejected_by: { $in: adminIdsAsObjectIds } }),
        Event.countDocuments({ approved_by: { $in: adminIdsAsObjectIds } }),
        Event.countDocuments({ rejected_by: { $in: adminIdsAsObjectIds } }),
        KYC.countDocuments({ verified_by: { $in: adminIdsAsObjectIds } }),
        KYC.countDocuments({ rejected_by: { $in: adminIdsAsObjectIds } }),
        Report.countDocuments({ reviewed_by: { $in: adminIdsAsObjectIds } }),
        Escrow.countDocuments({ 
            admin_reviewed_by: { $in: adminIdsAsObjectIds },
            request_status: "admin_approved"
        }),
        Escrow.countDocuments({ 
            admin_reviewed_by: { $in: adminIdsAsObjectIds },
            request_status: "admin_rejected"
        })
    ]);

    const statistics = {
        campaign_approvals: campaignApprovalsCount,
        campaign_rejections: campaignRejectionsCount,
        event_approvals: eventApprovalsCount,
        event_rejections: eventRejectionsCount,
        kyc_approvals: kycVerificationsCount,
        kyc_rejections: kycRejectionsCount,
        report_resolutions: reportResolutionsCount,
        withdrawal_approvals: withdrawalApprovalsCount,
        withdrawal_rejections: withdrawalRejectionsCount,
        total_actions: campaignApprovalsCount + campaignRejectionsCount + 
                       eventApprovalsCount + eventRejectionsCount + 
                       kycVerificationsCount + kycRejectionsCount + 
                       reportResolutionsCount + withdrawalApprovalsCount + 
                       withdrawalRejectionsCount
    };

    const total = adminId ? 1 : adminIds.length;

    return {
        statistics,
        admin: adminInfo,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

export const getApprovalHistory = async (filters = {}, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const { type, adminId, startDate, endDate } = filters;

    let activities = [];

    if (!type || type === "campaign") {
        const campaignQuery = {
            $or: [
                { approved_by: { $ne: null } },
                { rejected_by: { $ne: null } },
                { approved_at: { $ne: null } },
                { rejected_at: { $ne: null } }
            ]
        };
        if (adminId) {
            campaignQuery.$and = [
                {
                    $or: [
                        { approved_by: adminId },
                        { rejected_by: adminId }
                    ]
                }
            ];
        }
        if (startDate || endDate) {
            const dateQuery = {};
            if (startDate) dateQuery.$gte = new Date(startDate);
            if (endDate) dateQuery.$lte = new Date(endDate);
            const dateOr = [
                { approved_at: dateQuery },
                { rejected_at: dateQuery }
            ];
            if (adminId) {
                campaignQuery.$and.push({ $or: dateOr });
            } else {
                campaignQuery.$and = [{ $or: dateOr }];
            }
        }

        const campaigns = await Campaign.find(campaignQuery)
            .select("title status approved_by approved_at rejected_by rejected_at rejection_reason _id")
            .populate("approved_by", "username fullname")
            .populate("rejected_by", "username fullname")
            .lean()
            .sort({ updatedAt: -1 });

        activities.push(...campaigns.map(c => {
            const isApproved = c.approved_by || c.approved_at || c.status === "active" || c.status === "approved";
            const isRejected = c.rejected_by || c.rejected_at || c.status === "rejected";
            
            let action = "unknown";
            if (isApproved && !isRejected) {
                action = "approved";
            } else if (isRejected) {
                action = "rejected";
            } else if (isApproved) {
                action = "approved";
            }
            
            return {
                type: "campaign",
                action: action,
                item: c,
                admin: c.approved_by || c.rejected_by,
                timestamp: c.approved_at || c.rejected_at || c.updatedAt
            };
        }));
    }

    if (!type || type === "event") {
        const eventQuery = {
            $or: [
                { approved_by: { $ne: null } },
                { rejected_by: { $ne: null } },
                { approved_at: { $ne: null } },
                { rejected_at: { $ne: null } }
            ]
        };
        if (adminId) {
            eventQuery.$and = [
                {
                    $or: [
                        { approved_by: adminId },
                        { rejected_by: adminId }
                    ]
                }
            ];
        }
        if (startDate || endDate) {
            const dateQuery = {};
            if (startDate) dateQuery.$gte = new Date(startDate);
            if (endDate) dateQuery.$lte = new Date(endDate);
            const dateOr = [
                { approved_at: dateQuery },
                { rejected_at: dateQuery }
            ];
            if (adminId) {
                eventQuery.$and.push({ $or: dateOr });
            } else {
                eventQuery.$and = [{ $or: dateOr }];
            }
        }

        const events = await Event.find(eventQuery)
            .select("title status approved_by approved_at rejected_by rejected_at rejected_reason _id")
            .populate("approved_by", "username fullname")
            .populate("rejected_by", "username fullname")
            .lean()
            .sort({ updatedAt: -1 });

        activities.push(...events.map(e => {
            const isApproved = e.approved_by || e.approved_at || e.status === "published" || e.status === "active" || e.status === "approved";
            const isRejected = e.rejected_by || e.rejected_at || e.status === "rejected";
            
            let action = "unknown";
            if (isApproved && !isRejected) {
                action = "approved";
            } else if (isRejected) {
                action = "rejected";
            } else if (isApproved) {
                action = "approved";
            }
            
            return {
                type: "event",
                action: action,
                item: e,
                admin: e.approved_by || e.rejected_by,
                timestamp: e.approved_at || e.rejected_at || e.updatedAt
            };
        }));
    }

    if (!type || type === "kyc") {
        const kycQuery = {};
        if (adminId) kycQuery.$or = [
            { verified_by: adminId },
            { rejected_by: adminId }
        ];
        if (startDate || endDate) {
            kycQuery.$or = kycQuery.$or || [];
            const dateQuery = {};
            if (startDate) dateQuery.$gte = new Date(startDate);
            if (endDate) dateQuery.$lte = new Date(endDate);
            kycQuery.$or.push(
                { verified_at: dateQuery },
                { rejected_at: dateQuery }
            );
        }

        const kycs = await KYC.find(kycQuery)
            .select("user status verified_by verified_at rejected_by rejected_at rejection_reason _id")
            .populate("verified_by", "username fullname")
            .populate("rejected_by", "username fullname")
            .populate("user", "username fullname")
            .lean()
            .sort({ updatedAt: -1 });

        activities.push(...kycs.map(k => ({
            type: "kyc",
            action: k.verified_by ? "verified" : "rejected",
            item: k,
            admin: k.verified_by || k.rejected_by,
            timestamp: k.verified_at || k.rejected_at
        })));
    }

    if (!type || type === "report") {
        const reportQuery = { reviewed_by: { $ne: null } };
        if (adminId) reportQuery.reviewed_by = adminId;
        if (startDate || endDate) {
            reportQuery.reviewed_at = {};
            if (startDate) reportQuery.reviewed_at.$gte = new Date(startDate);
            if (endDate) reportQuery.reviewed_at.$lte = new Date(endDate);
        }

        const reports = await Report.find(reportQuery)
            .select("reported_type reported_id status reviewed_by reviewed_at resolution")
            .populate("reviewed_by", "username fullname")
            .sort({ reviewed_at: -1 });

        activities.push(...reports.map(r => ({
            type: "report",
            action: "reviewed",
            item: r,
            admin: r.reviewed_by,
            timestamp: r.reviewed_at
        })));
    }

    if (!type || type === "escrow") {
        const escrowQuery = { admin_reviewed_by: { $ne: null } };
        if (adminId) escrowQuery.admin_reviewed_by = adminId;
        if (startDate || endDate) {
            escrowQuery.admin_reviewed_at = {};
            if (startDate) escrowQuery.admin_reviewed_at.$gte = new Date(startDate);
            if (endDate) escrowQuery.admin_reviewed_at.$lte = new Date(endDate);
        }

        const escrows = await Escrow.find(escrowQuery)
            .select("campaign request_status admin_reviewed_by admin_reviewed_at admin_rejection_reason _id")
            .populate("admin_reviewed_by", "username fullname")
            .populate("campaign", "title")
            .lean()
            .sort({ admin_reviewed_at: -1 });

        activities.push(...escrows.map(e => {
            let action = "unknown";
            if (e.request_status === "admin_approved" || e.request_status === "released") {
                action = "approved";
            } else if (e.request_status === "admin_rejected") {
                action = "rejected";
            } else if (e.admin_reviewed_by) {
                action = "rejected";
            }
            
            return {
                type: "escrow",
                action: action,
                item: e,
                admin: e.admin_reviewed_by,
                timestamp: e.admin_reviewed_at || e.updatedAt
            };
        }));
    }

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = activities.length;
    const paginatedActivities = activities.slice(skip, skip + limit);

    return {
        history: paginatedActivities,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// ==================== USER MANAGEMENT ====================

export const getAllUsers = async (page = 1, limit = 20, filters = {}) => {
    const skip = (page - 1) * limit;
    const { search, role, is_banned, kyc_status } = filters;

    const query = {};

    // Filter by role (exclude owner)
    if (role) {
        query.role = role;
    } else {
        query.role = { $ne: "owner" };
    }

    // Filter by ban status
    if (is_banned !== undefined && is_banned !== null) {
        query.is_banned = is_banned === true || is_banned === "true";
    }

    // Filter by KYC status
    if (kyc_status) {
        query.kyc_status = kyc_status;
    }

    // Build final query - if search exists, combine with other filters using $and
    let finalQuery = query;
    if (search) {
        const searchConditions = [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { fullname: { $regex: search, $options: "i" } }
        ];
        
        // Use $and to combine search with other filters
        finalQuery = {
            $and: [
                query,
                { $or: searchConditions }
            ]
        };
    }

    const [users, total] = await Promise.all([
        User.find(finalQuery)
            .select("-password")
            .populate("banned_by", "username fullname")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments(finalQuery)
    ]);

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

export const banUser = async (userId, ownerId, reason) => {
    const user = await User.findById(userId);

    if (!user) {
        return { success: false, error: "USER_NOT_FOUND" };
    }

    // Prevent banning owner
    if (user.role === "owner") {
        return { success: false, error: "CANNOT_BAN_OWNER" };
    }

    // Prevent owner from banning themselves
    if (userId.toString() === ownerId.toString()) {
        return { success: false, error: "CANNOT_BAN_SELF" };
    }

    user.is_banned = true;
    user.banned_at = new Date();
    user.banned_by = ownerId;
    user.ban_reason = reason || "Banned by owner";
    await user.save();

    return { success: true, user };
};

export const unbanUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        return { success: false, error: "USER_NOT_FOUND" };
    }

    user.is_banned = false;
    user.banned_at = null;
    user.banned_by = null;
    user.ban_reason = null;
    await user.save();

    return { success: true, user };
};

export const resetUserKYC = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        return { success: false, error: "USER_NOT_FOUND" };
    }

    user.kyc_status = "unverified";
    user.current_kyc_id = null;
    await user.save();

    return { success: true, user };
};

export const getUserHistory = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await User.findById(userId).select("_id username email");
    if (!user) {
        return { success: false, error: "USER_NOT_FOUND" };
    }

    // Get login history (from user creation and recent activity)
    // Note: If you have a login history model, use it here
    const loginHistory = [{
        type: "login",
        action: "account_created",
        timestamp: user.createdAt || new Date(),
        details: "Account created"
    }];

    // Get donation history
    const [donations, donationsTotal] = await Promise.all([
        Donation.find({ donor: userId })
            .populate("campaign", "title")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Donation.countDocuments({ donor: userId })
    ]);

    const donationHistory = donations.map(d => ({
        type: "donate",
        action: "donated",
        timestamp: d.createdAt,
        amount: d.amount,
        currency: d.currency,
        campaign: d.campaign,
        payment_status: d.payment_status,
        donation_method: d.donation_method
    }));

    // Get post history
    const [posts, postsTotal] = await Promise.all([
        Post.find({ user: userId })
            .populate("campaign_id", "title")
            .populate("event_id", "title")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Post.countDocuments({ user: userId })
    ]);

    const postHistory = posts.map(p => ({
        type: "post",
        action: "created",
        timestamp: p.createdAt,
        post_id: p._id,
        content_preview: p.content_text?.substring(0, 100) || "",
        campaign: p.campaign_id,
        event: p.event_id,
        is_hidden: p.is_hidden
    }));

    // Get report history (reports made by this user)
    const [reports, reportsTotal] = await Promise.all([
        Report.find({ reporter: userId })
            .populate("reported_id")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Report.countDocuments({ reporter: userId })
    ]);

    const reportHistory = reports.map(r => ({
        type: "report",
        action: "reported",
        timestamp: r.createdAt,
        report_id: r._id,
        reported_type: r.reported_type,
        reported_reason: r.reported_reason,
        status: r.status,
        resolution: r.resolution
    }));

    // Combine all history and sort by timestamp
    const allHistory = [
        ...loginHistory,
        ...donationHistory,
        ...postHistory,
        ...reportHistory
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const paginatedHistory = allHistory.slice(skip, skip + limit);
    const totalHistory = loginHistory.length + donationsTotal + postsTotal + reportsTotal;

    return {
        success: true,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email
        },
        history: paginatedHistory,
        statistics: {
            total_donations: donationsTotal,
            total_posts: postsTotal,
            total_reports: reportsTotal
        },
        pagination: {
            page,
            limit,
            total: totalHistory,
            pages: Math.ceil(totalHistory / limit)
        }
    };
};


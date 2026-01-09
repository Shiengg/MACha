import mongoose from "mongoose";
import User from "../models/user.js";
import Donation from "../models/donation.js";
import Escrow from "../models/escrow.js";
import Campaign from "../models/campaign.js";
import Event from "../models/event.js";
import KYC from "../models/kyc.js";
import Report from "../models/report.js";
import Post from "../models/post.js";

export const getDashboard = async (adminId) => {
    // Convert adminId to string for consistent comparison
    const adminIdString = adminId.toString();
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);
    
    // Total counts
    const [
        totalUsers,
        totalCampaigns,
        totalEvents,
        totalDonations,
        activeCampaigns,
        pendingCampaigns,
        pendingEvents,
        pendingReports,
        pendingKYC,
        pendingWithdrawals
    ] = await Promise.all([
        User.countDocuments({ role: "user" }),
        Campaign.countDocuments(),
        Event.countDocuments(),
        Donation.countDocuments({ payment_status: "completed" }),
        Campaign.countDocuments({ status: "active" }),
        Campaign.countDocuments({ status: "pending" }),
        Event.countDocuments({ status: "pending" }),
        Report.countDocuments({ status: "pending" }),
        KYC.countDocuments({ status: "pending" }),
        Escrow.countDocuments({ 
            request_status: { $in: ["voting_completed", "admin_approved"] } 
        })
    ]);

    // Admin's own actions
    const [
        adminCampaignApprovals,
        adminCampaignRejections,
        adminEventApprovals,
        adminEventRejections,
        adminKYCApprovals,
        adminKYCRejections,
        adminWithdrawalApprovals,
        adminWithdrawalRejections,
        adminReportResolutions
    ] = await Promise.all([
        Campaign.countDocuments({ approved_by: adminId }),
        Campaign.countDocuments({ rejected_by: adminId }),
        Event.countDocuments({ approved_by: adminId }),
        Event.countDocuments({ rejected_by: adminId }),
        KYC.countDocuments({ verified_by: adminId }),
        KYC.countDocuments({ rejected_by: adminId }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, request_status: "admin_approved" }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, request_status: "admin_rejected" }),
        Report.countDocuments({ reviewed_by: adminId })
    ]);

    // Time-based stats for admin's actions
    const [
        todayCampaignApprovals, todayEventApprovals, todayKYCApprovals, todayEscrowApprovals,
        todayCampaignRejections, todayEventRejections, todayKYCRejections, todayEscrowRejections,
        weekCampaignApprovals, weekEventApprovals, weekKYCApprovals, weekEscrowApprovals,
        weekCampaignRejections, weekEventRejections, weekKYCRejections, weekEscrowRejections,
        monthCampaignApprovals, monthEventApprovals, monthKYCApprovals, monthEscrowApprovals,
        monthCampaignRejections, monthEventRejections, monthKYCRejections, monthEscrowRejections
    ] = await Promise.all([
        // Today approvals
        Campaign.countDocuments({ approved_by: adminId, approved_at: { $gte: todayStart, $ne: null } }),
        Event.countDocuments({ approved_by: adminId, approved_at: { $gte: todayStart, $ne: null } }),
        KYC.countDocuments({ verified_by: adminId, verified_at: { $gte: todayStart, $ne: null } }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, admin_reviewed_at: { $gte: todayStart, $ne: null }, request_status: "admin_approved" }),
        // Today rejections
        Campaign.countDocuments({ rejected_by: adminId, rejected_at: { $gte: todayStart, $ne: null } }),
        Event.countDocuments({ rejected_by: adminId, rejected_at: { $gte: todayStart, $ne: null } }),
        KYC.countDocuments({ rejected_by: adminId, rejected_at: { $gte: todayStart, $ne: null } }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, admin_reviewed_at: { $gte: todayStart, $ne: null }, request_status: "admin_rejected" }),
        // Week approvals
        Campaign.countDocuments({ approved_by: adminId, approved_at: { $gte: weekStart, $ne: null } }),
        Event.countDocuments({ approved_by: adminId, approved_at: { $gte: weekStart, $ne: null } }),
        KYC.countDocuments({ verified_by: adminId, verified_at: { $gte: weekStart, $ne: null } }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, admin_reviewed_at: { $gte: weekStart, $ne: null }, request_status: "admin_approved" }),
        // Week rejections
        Campaign.countDocuments({ rejected_by: adminId, rejected_at: { $gte: weekStart, $ne: null } }),
        Event.countDocuments({ rejected_by: adminId, rejected_at: { $gte: weekStart, $ne: null } }),
        KYC.countDocuments({ rejected_by: adminId, rejected_at: { $gte: weekStart, $ne: null } }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, admin_reviewed_at: { $gte: weekStart, $ne: null }, request_status: "admin_rejected" }),
        // Month approvals
        Campaign.countDocuments({ approved_by: adminId, approved_at: { $gte: monthStart, $ne: null } }),
        Event.countDocuments({ approved_by: adminId, approved_at: { $gte: monthStart, $ne: null } }),
        KYC.countDocuments({ verified_by: adminId, verified_at: { $gte: monthStart, $ne: null } }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, admin_reviewed_at: { $gte: monthStart, $ne: null }, request_status: "admin_approved" }),
        // Month rejections
        Campaign.countDocuments({ rejected_by: adminId, rejected_at: { $gte: monthStart, $ne: null } }),
        Event.countDocuments({ rejected_by: adminId, rejected_at: { $gte: monthStart, $ne: null } }),
        KYC.countDocuments({ rejected_by: adminId, rejected_at: { $gte: monthStart, $ne: null } }),
        Escrow.countDocuments({ admin_reviewed_by: adminId, admin_reviewed_at: { $gte: monthStart, $ne: null }, request_status: "admin_rejected" })
    ]);

    const todayAdminApprovals = todayCampaignApprovals + todayEventApprovals + todayKYCApprovals + todayEscrowApprovals;
    const todayAdminRejections = todayCampaignRejections + todayEventRejections + todayKYCRejections + todayEscrowRejections;
    const weekAdminApprovals = weekCampaignApprovals + weekEventApprovals + weekKYCApprovals + weekEscrowApprovals;
    const weekAdminRejections = weekCampaignRejections + weekEventRejections + weekKYCRejections + weekEscrowRejections;
    const monthAdminApprovals = monthCampaignApprovals + monthEventApprovals + monthKYCApprovals + monthEscrowApprovals;
    const monthAdminRejections = monthCampaignRejections + monthEventRejections + monthKYCRejections + monthEscrowRejections;

    // Recent activities - last 10 actions by this admin
    const recentActions = [];
    
    const [recentCampaigns, recentEvents, recentKYCs, recentWithdrawals, recentReports] = await Promise.all([
        Campaign.find({
            $or: [
                { approved_by: adminId },
                { rejected_by: adminId }
            ]
        })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title status approved_at rejected_at approved_by rejected_by')
        .lean(),
        Event.find({
            $or: [
                { approved_by: adminId },
                { rejected_by: adminId }
            ]
        })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title status approved_at rejected_at approved_by rejected_by')
        .lean(),
        KYC.find({
            $or: [
                { verified_by: adminId },
                { rejected_by: adminId }
            ]
        })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('user', 'username')
        .select('user status verified_at rejected_at verified_by rejected_by')
        .lean(),
        Escrow.find({
            admin_reviewed_by: adminId
        })
        .sort({ admin_reviewed_at: -1 })
        .limit(5)
        .populate('campaign', 'title')
        .select('campaign request_status admin_reviewed_at admin_reviewed_by')
        .lean(),
        Report.find({
            reviewed_by: adminId
        })
        .sort({ reviewed_at: -1 })
        .limit(5)
        .select('reported_type reported_item_id status reviewed_at reviewed_by')
        .lean()
    ]);

    // Combine and format recent actions
    recentCampaigns.forEach(campaign => {
        if (campaign.approved_by?.toString() === adminIdString && campaign.approved_at) {
            recentActions.push({
                type: 'Campaign Approval',
                item: campaign.title || 'Untitled Campaign',
                status: 'approved',
                date: campaign.approved_at,
                id: campaign._id
            });
        } else if (campaign.rejected_by?.toString() === adminIdString && campaign.rejected_at) {
            recentActions.push({
                type: 'Campaign Rejection',
                item: campaign.title || 'Untitled Campaign',
                status: 'rejected',
                date: campaign.rejected_at,
                id: campaign._id
            });
        }
    });

    recentEvents.forEach(event => {
        if (event.approved_by?.toString() === adminIdString && event.approved_at) {
            recentActions.push({
                type: 'Event Approval',
                item: event.title || 'Untitled Event',
                status: 'approved',
                date: event.approved_at,
                id: event._id
            });
        } else if (event.rejected_by?.toString() === adminIdString && event.rejected_at) {
            recentActions.push({
                type: 'Event Rejection',
                item: event.title || 'Untitled Event',
                status: 'rejected',
                date: event.rejected_at,
                id: event._id
            });
        }
    });

    recentKYCs.forEach(kyc => {
        const username = kyc.user?.username || 'Unknown User';
        if (kyc.verified_by?.toString() === adminIdString && kyc.verified_at) {
            recentActions.push({
                type: 'KYC Approval',
                item: username,
                status: 'approved',
                date: kyc.verified_at,
                id: kyc.user?._id || kyc._id
            });
        } else if (kyc.rejected_by?.toString() === adminIdString && kyc.rejected_at) {
            recentActions.push({
                type: 'KYC Rejection',
                item: username,
                status: 'rejected',
                date: kyc.rejected_at,
                id: kyc.user?._id || kyc._id
            });
        }
    });

    recentWithdrawals.forEach(escrow => {
        if (escrow.admin_reviewed_at) {
            const title = escrow.campaign?.title || 'Unknown Campaign';
            recentActions.push({
                type: 'Withdrawal Review',
                item: title,
                status: escrow.request_status === 'admin_approved' ? 'approved' : 'rejected',
                date: escrow.admin_reviewed_at,
                id: escrow._id
            });
        }
    });

    recentReports.forEach(report => {
        if (report.reviewed_at) {
            recentActions.push({
                type: 'Report Review',
                item: `${report.reported_type || 'Unknown'} Report`,
                status: report.status || 'pending',
                date: report.reviewed_at,
                id: report._id
            });
        }
    });

    // Sort by date descending and take top 10
    recentActions.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });
    const topRecentActions = recentActions.slice(0, 10);

    // User growth over last 12 months
    const userGrowthByMonth = [];
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        
        const count = await User.countDocuments({
            role: "user",
            createdAt: {
                $gte: monthStart,
                $lt: monthEnd
            }
        });
        
        userGrowthByMonth.push({
            month: `${monthStart.getMonth() + 1}/${monthStart.getFullYear()}`,
            count
        });
    }

    // Campaign activity over last 12 months
    const campaignActivityByMonth = [];
    for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        
        const [created, approved] = await Promise.all([
            Campaign.countDocuments({
                createdAt: {
                    $gte: monthStart,
                    $lt: monthEnd
                }
            }),
            Campaign.countDocuments({
                approved_at: {
                    $gte: monthStart,
                    $lt: monthEnd,
                    $ne: null
                }
            })
        ]);
        
        campaignActivityByMonth.push({
            month: `${monthStart.getMonth() + 1}/${monthStart.getFullYear()}`,
            created,
            approved
        });
    }

    return {
        overview: {
            total_users: totalUsers,
            total_campaigns: totalCampaigns,
            total_events: totalEvents,
            total_donations: totalDonations,
            active_campaigns: activeCampaigns
        },
        pending: {
            campaigns: pendingCampaigns,
            events: pendingEvents,
            reports: pendingReports,
            kyc: pendingKYC,
            withdrawals: pendingWithdrawals
        },
        admin_stats: {
            total_approvals: adminCampaignApprovals + adminEventApprovals + adminKYCApprovals + adminWithdrawalApprovals,
            total_rejections: adminCampaignRejections + adminEventRejections + adminKYCRejections + adminWithdrawalRejections,
            campaign_approvals: adminCampaignApprovals,
            campaign_rejections: adminCampaignRejections,
            event_approvals: adminEventApprovals,
            event_rejections: adminEventRejections,
            kyc_approvals: adminKYCApprovals,
            kyc_rejections: adminKYCRejections,
            withdrawal_approvals: adminWithdrawalApprovals,
            withdrawal_rejections: adminWithdrawalRejections,
            report_resolutions: adminReportResolutions
        },
        approvals_rejections: {
            today: {
                approvals: todayAdminApprovals,
                rejections: todayAdminRejections
            },
            week: {
                approvals: weekAdminApprovals,
                rejections: weekAdminRejections
            },
            month: {
                approvals: monthAdminApprovals,
                rejections: monthAdminRejections
            }
        },
        user_growth_by_month: userGrowthByMonth,
        campaign_activity_by_month: campaignActivityByMonth,
        recent_actions: topRecentActions
    };
};


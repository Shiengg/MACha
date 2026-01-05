import mongoose from "mongoose";
import RecoveryCase from "../models/recoveryCase.js";
import Campaign from "../models/campaign.js";
import Refund from "../models/refund.js";
import Donation from "../models/donation.js";
import { redisClient } from "../config/redis.js";
import * as escrowService from "./escrow.service.js";
import * as mailerService from "../utils/mailer.js";
import Notification from "../models/notification.js";

export const createRecoveryCase = async (campaignId, adminId, deadlineDays = 30) => {
    const campaign = await Campaign.findById(campaignId).populate("creator", "username email fullname");
    if (!campaign) {
        return { success: false, error: "CAMPAIGN_NOT_FOUND" };
    }

    if (campaign.status !== "cancelled") {
        return { success: false, error: "CAMPAIGN_NOT_CANCELLED" };
    }

    const existingCase = await RecoveryCase.findOne({ campaign: campaignId });
    if (existingCase) {
        return { success: false, error: "RECOVERY_CASE_EXISTS", recoveryCase: existingCase };
    }

    const totalDonated = campaign.current_amount;
    const totalReleasedAmount = await escrowService.getTotalReleasedAmount(campaignId);

    if (totalReleasedAmount <= 0) {
        return { success: true, message: "No amount to recover", totalReleased: 0 };
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);

    const recoveryCase = await RecoveryCase.create({
        campaign: campaignId,
        creator: campaign.creator._id,
        total_amount: totalReleasedAmount,
        recovered_amount: 0,
        status: "pending",
        deadline,
        recovery_method: "voluntary",
        created_by: adminId,
        timeline: [{
            date: new Date(),
            action: "Recovery case created",
            amount: 0,
            notes: `Campaign cancelled. Total released amount: ${totalReleasedAmount.toLocaleString("vi-VN")} VND`,
            created_by: adminId
        }]
    });

    if (campaign.creator.email) {
        try {
            await mailerService.sendRecoveryNotificationEmail(campaign.creator.email, {
                username: campaign.creator.username || campaign.creator.fullname || "Bạn",
                campaignTitle: campaign.title,
                campaignId: campaignId,
                amount: totalReleasedAmount,
                deadline: deadline
            });
        } catch (emailError) {
            console.error("Error sending recovery notification email:", emailError);
        }
    }

    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del("recovery:cases");

    return {
        success: true,
        recoveryCase
    };
};

export const updateRecoveryAmount = async (recoveryCaseId, amount, action, notes, userId) => {
    const recoveryCase = await RecoveryCase.findById(recoveryCaseId);
    if (!recoveryCase) {
        return { success: false, error: "RECOVERY_CASE_NOT_FOUND" };
    }

    recoveryCase.recovered_amount += amount;
    
    if (recoveryCase.recovered_amount >= recoveryCase.total_amount) {
        recoveryCase.status = "completed";
    } else if (recoveryCase.status === "pending") {
        recoveryCase.status = "in_progress";
    }

    recoveryCase.timeline.push({
        date: new Date(),
        action,
        amount,
        notes,
        created_by: userId
    });

    await recoveryCase.save();

    await redisClient.del(`recovery:${recoveryCaseId}`);
    await redisClient.del(`campaign:${recoveryCase.campaign}`);
    await redisClient.del("recovery:cases");

    return { success: true, recoveryCase };
};

export const processRecoveryRefund = async (recoveryCaseId, userId) => {
    const recoveryCase = await RecoveryCase.findById(recoveryCaseId).populate("campaign creator");
    if (!recoveryCase) {
        return { success: false, error: "RECOVERY_CASE_NOT_FOUND" };
    }

    if (recoveryCase.recovered_amount <= 0) {
        return { success: false, error: "NO_AMOUNT_RECOVERED" };
    }

    const campaignId = recoveryCase.campaign._id || recoveryCase.campaign;
    
    const donations = await Donation.find({
        campaign: campaignId,
        payment_status: "partially_refunded",
        remaining_refund_pending: { $gt: 0 }
    }).populate("donor", "username email fullname");

    if (donations.length === 0) {
        return { success: true, message: "No pending refunds found", refunds: [] };
    }

    const totalPendingRefund = donations.reduce((sum, d) => sum + d.remaining_refund_pending, 0);
    const recoveredAmount = recoveryCase.recovered_amount;
    
    const refundRatio = Math.min(1, recoveredAmount / totalPendingRefund);
    
    const refunds = [];
    
    for (const donation of donations) {
        if (recoveredAmount <= 0) break;
        
        const refundAmount = Math.min(
            Math.floor(donation.remaining_refund_pending * refundRatio),
            recoveredAmount
        );
        
        if (refundAmount <= 0) continue;

        try {
            const refund = await Refund.create({
                campaign: campaignId,
                donation: donation._id,
                donor: donation.donor._id,
                original_amount: donation.amount,
                refunded_amount: refundAmount,
                refund_ratio: donation.refund_ratio || 0,
                remaining_refund: donation.remaining_refund_pending - refundAmount,
                refund_status: "pending",
                refund_method: "recovery",
                created_by: userId,
                notes: `Refund from recovery. Recovery case: ${recoveryCaseId}`
            });

            donation.refunded_amount += refundAmount;
            donation.remaining_refund_pending -= refundAmount;
            
            if (donation.remaining_refund_pending <= 0) {
                donation.payment_status = "refunded";
                donation.refunded_at = new Date();
            }

            await donation.save();

            refunds.push({
                refundId: refund._id,
                donationId: donation._id,
                donorId: donation.donor._id,
                refundAmount
            });
        } catch (error) {
            console.error(`Error processing recovery refund for donation ${donation._id}:`, error);
        }
    }

    recoveryCase.recovered_amount = Math.max(0, recoveryCase.recovered_amount - recoveredAmount);
    
    if (recoveryCase.recovered_amount <= 0 && recoveryCase.status !== "completed") {
        recoveryCase.status = "completed";
    } else if (recoveryCase.status === "pending") {
        recoveryCase.status = "in_progress";
    }

    recoveryCase.timeline.push({
        date: new Date(),
        action: "Refund processed",
        amount: -recoveredAmount,
        notes: `Processed refunds for ${refunds.length} donations`,
        created_by: userId
    });

    await recoveryCase.save();

    const donorIds = [...new Set(refunds.map(r => r.donorId.toString()))];
    
    const notifications = donorIds.map(donorId => ({
        receiver: donorId,
        sender: userId,
        type: "recovery_refund_processed",
        campaign: campaignId,
        message: `Bạn đã được refund thêm từ khoản thu hồi của chiến dịch "${recoveryCase.campaign.title || "campaign"}"`,
        is_read: false
    }));

    try {
        const createdNotifications = await Notification.insertMany(notifications);
        for (let i = 0; i < createdNotifications.length; i++) {
            try {
                await redisClient.publish("notification:new", JSON.stringify({
                    recipientId: donorIds[i],
                    notification: {
                        _id: createdNotifications[i]._id.toString(),
                        type: "recovery_refund_processed",
                        message: notifications[i].message,
                        campaign: {
                            _id: campaignId.toString(),
                            title: recoveryCase.campaign.title || ""
                        },
                        is_read: false,
                        createdAt: createdNotifications[i].createdAt
                    }
                }));
            } catch (notifError) {
                console.error("Error publishing recovery refund notification:", notifError);
            }
        }
    } catch (notifError) {
        console.error("Error creating recovery refund notifications:", notifError);
    }

    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del(`donations:${campaignId}`);

    return {
        success: true,
        message: `Processed ${refunds.length} recovery refunds`,
        refunds,
        totalRefunded: refunds.reduce((sum, r) => sum + r.refundAmount, 0)
    };
};

export const escalateToLegal = async (recoveryCaseId, userId, legalCaseId, notes) => {
    const recoveryCase = await RecoveryCase.findById(recoveryCaseId);
    if (!recoveryCase) {
        return { success: false, error: "RECOVERY_CASE_NOT_FOUND" };
    }

    recoveryCase.status = "legal_action";
    recoveryCase.legal_case_id = legalCaseId;
    
    recoveryCase.timeline.push({
        date: new Date(),
        action: "Escalated to legal action",
        amount: 0,
        notes: notes || `Escalated to legal. Case ID: ${legalCaseId}`,
        created_by: userId
    });

    await recoveryCase.save();

    await redisClient.del(`recovery:${recoveryCaseId}`);
    await redisClient.del("recovery:cases");

    return { success: true, recoveryCase };
};

export const getRecoveryCaseById = async (recoveryCaseId) => {
    const recoveryCase = await RecoveryCase.findById(recoveryCaseId)
        .populate("campaign", "title")
        .populate("creator", "username email fullname")
        .populate("created_by", "username")
        .populate("assigned_to", "username");

    return recoveryCase;
};

export const getRecoveryCasesByCampaign = async (campaignId) => {
    const cases = await RecoveryCase.find({ campaign: campaignId })
        .populate("creator", "username email fullname")
        .sort({ createdAt: -1 });

    return cases;
};

export const getRecoveryCasesByCreator = async (creatorId) => {
    const cases = await RecoveryCase.find({ creator: creatorId })
        .populate("campaign", "title")
        .sort({ createdAt: -1 });

    return cases;
};

export const getAllRecoveryCases = async (filters = {}, page = 0, limit = 20) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.creator) query.creator = filters.creator;

    const cases = await RecoveryCase.find(query)
        .populate("campaign", "title")
        .populate("creator", "username email fullname")
        .populate("created_by", "username")
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit);

    const total = await RecoveryCase.countDocuments(query);

    return {
        cases,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
};


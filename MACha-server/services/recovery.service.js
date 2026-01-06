import mongoose from "mongoose";
import RecoveryCase from "../models/recoveryCase.js";
import Campaign from "../models/campaign.js";
import Refund from "../models/refund.js";
import Donation from "../models/donation.js";
import { redisClient } from "../config/redis.js";
import * as escrowService from "./escrow.service.js";
import * as mailerService from "../utils/mailer.js";

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
    
    // Tìm donations cần refund lần 2: những donation đã được refund một phần (partially_refunded)
    // hoặc có remaining_refund_pending > 0
    const donations = await Donation.find({
        campaign: campaignId,
        $or: [
            { payment_status: "partially_refunded" },
            { remaining_refund_pending: { $gt: 0 } }
        ]
    }).populate("donor", "username email fullname");

    if (donations.length === 0) {
        return { success: true, message: "No pending refunds found", refunds: [] };
    }

    // Tính totalPendingRefund dựa trên secondRefundRatio (không dựa vào remaining_refund_pending vì có thể sai do làm tròn)
    const totalPendingRefund = donations.reduce((sum, d) => {
        const firstRefundRatio = d.refund_ratio || (d.refunded_amount || 0) / d.amount;
        const secondRefundRatio = 1 - firstRefundRatio;
        const calculatedRefundAmount = Math.floor(d.amount * secondRefundRatio);
        return sum + calculatedRefundAmount;
    }, 0);
    
    const recoveredAmount = recoveryCase.recovered_amount;
    
    if (totalPendingRefund <= 0 || recoveredAmount <= 0) {
        return { success: true, message: "No pending refunds or recovered amount is zero", refunds: [] };
    }
    
    const refunds = [];
    let totalRefundedAmount = 0;
    let remainingRecoveredAmount = recoveredAmount;
    
    if (recoveredAmount >= totalPendingRefund) {
        for (const donation of donations) {
            if (remainingRecoveredAmount <= 0) break;
            
            // Lần đầu refund: tính % từ availableAmount/totalDonated
            // Lần hai (recovery): tính 100% - phần trăm lần đầu
            const firstRefundRatio = donation.refund_ratio || (donation.refunded_amount || 0) / donation.amount;
            const secondRefundRatio = 1 - firstRefundRatio;
            
            // Tính refundAmount dựa trên secondRefundRatio (không dựa vào remaining_refund_pending vì có thể sai do làm tròn)
            const calculatedRefundAmount = Math.floor(donation.amount * secondRefundRatio);
            // Chỉ giới hạn bởi remainingRecoveredAmount (số tiền creator đã trả)
            const refundAmount = Math.min(
                calculatedRefundAmount,
                remainingRecoveredAmount
            );
            
            if (refundAmount <= 0) continue;

            try {
                // Tính remaining_refund dựa trên tổng số tiền đã refund (không dựa vào remaining_refund_pending vì có thể sai do làm tròn)
                const currentRefundedAmount = donation.refunded_amount || 0;
                const totalRefundedAfterThis = currentRefundedAmount + refundAmount;
                const remainingRefund = Math.max(0, donation.amount - totalRefundedAfterThis);
                
                const refund = await Refund.create({
                    campaign: campaignId,
                    donation: donation._id,
                    donor: donation.donor._id,
                    original_amount: donation.amount,
                    refunded_amount: refundAmount,
                    refund_ratio: secondRefundRatio,
                    remaining_refund: remainingRefund,
                    refund_status: "pending",
                    refund_method: "recovery",
                    created_by: userId,
                    notes: `Refund from recovery. Recovery case: ${recoveryCaseId}`
                });

                // Cập nhật donation: cộng thêm refunded_amount và tính lại remaining_refund_pending
                donation.refunded_amount = totalRefundedAfterThis;
                donation.remaining_refund_pending = remainingRefund;
                
                // Nếu đã refund đủ (remaining_refund_pending = 0), cập nhật status
                if (donation.remaining_refund_pending <= 0) {
                    donation.payment_status = "refunded";
                    donation.refunded_at = new Date();
                } else {
                    donation.payment_status = "partially_refunded";
                }
                
                await donation.save();

                totalRefundedAmount += refundAmount;
                remainingRecoveredAmount -= refundAmount;

                refunds.push({
                    refundId: refund._id,
                    donationId: donation._id,
                    donorId: donation.donor._id,
                    refundAmount
                });
            } catch (error) {
                console.error(`[RECOVERY][PROCESS_REFUND] Error processing recovery refund for donation ${donation._id}:`, error);
            }
        }
    } else {
        const refundRatio = recoveredAmount / totalPendingRefund;
        
        for (const donation of donations) {
            if (remainingRecoveredAmount <= 0) break;
            
            const firstRefundRatio = donation.refund_ratio || (donation.refunded_amount || 0) / donation.amount;
            const secondRefundRatio = 1 - firstRefundRatio;
            
            // Tính refundAmount dựa trên secondRefundRatio, nhưng áp dụng tỷ lệ recoveredAmount/totalPendingRefund
            // (không dựa vào remaining_refund_pending vì có thể sai do làm tròn)
            const calculatedRefundAmount = Math.floor(donation.amount * secondRefundRatio * refundRatio);
            // Chỉ giới hạn bởi remainingRecoveredAmount (số tiền creator đã trả)
            const refundAmount = Math.min(
                calculatedRefundAmount,
                remainingRecoveredAmount
            );
            
            if (refundAmount <= 0) continue;

            try {
                // Tính remaining_refund dựa trên tổng số tiền đã refund (không dựa vào remaining_refund_pending vì có thể sai do làm tròn)
                const currentRefundedAmount = donation.refunded_amount || 0;
                const totalRefundedAfterThis = currentRefundedAmount + refundAmount;
                const remainingRefund = Math.max(0, donation.amount - totalRefundedAfterThis);
                
                const refund = await Refund.create({
                    campaign: campaignId,
                    donation: donation._id,
                    donor: donation.donor._id,
                    original_amount: donation.amount,
                    refunded_amount: refundAmount,
                    refund_ratio: secondRefundRatio,
                    remaining_refund: remainingRefund,
                    refund_status: "pending",
                    refund_method: "recovery",
                    created_by: userId,
                    notes: `Refund from recovery. Recovery case: ${recoveryCaseId}`
                });

                // Cập nhật donation: cộng thêm refunded_amount và tính lại remaining_refund_pending
                donation.refunded_amount = totalRefundedAfterThis;
                donation.remaining_refund_pending = remainingRefund;
                
                // Nếu đã refund đủ (remaining_refund_pending = 0), cập nhật status
                if (donation.remaining_refund_pending <= 0) {
                    donation.payment_status = "refunded";
                    donation.refunded_at = new Date();
                } else {
                    donation.payment_status = "partially_refunded";
                }
                
                await donation.save();

                totalRefundedAmount += refundAmount;
                remainingRecoveredAmount -= refundAmount;

                refunds.push({
                    refundId: refund._id,
                    donationId: donation._id,
                    donorId: donation.donor._id,
                    refundAmount
                });
            } catch (error) {
                console.error(`[RECOVERY][PROCESS_REFUND] Error processing recovery refund for donation ${donation._id}:`, error);
            }
        }
    }
    
    if (refunds.length === 0) {
        return { success: true, message: "No refunds were created", refunds: [] };
    }

    if (recoveryCase.recovered_amount >= recoveryCase.total_amount && recoveryCase.status !== "completed") {
        recoveryCase.status = "completed";
    } else if (recoveryCase.status === "pending") {
        recoveryCase.status = "in_progress";
    }

    recoveryCase.timeline.push({
        date: new Date(),
        action: "Refund processed",
        amount: -totalRefundedAmount,
        notes: `Processed refunds for ${refunds.length} donations`,
        created_by: userId
    });

    await recoveryCase.save();

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


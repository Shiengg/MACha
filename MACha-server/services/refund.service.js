import mongoose from "mongoose";
import Refund from "../models/refund.js";
import Donation from "../models/donation.js";
import Campaign from "../models/campaign.js";
import Escrow from "../models/escrow.js";
import { redisClient } from "../config/redis.js";
import * as escrowService from "./escrow.service.js";
import * as mailerService from "../utils/mailer.js";
import Notification from "../models/notification.js";

export const processProportionalRefund = async (campaignId, adminId, reason = null) => {
    const campaign = await Campaign.findById(campaignId).populate("creator", "username email");
    if (!campaign) {
        return { success: false, error: "CAMPAIGN_NOT_FOUND" };
    }

    if (campaign.status !== "cancelled") {
        return { success: false, error: "CAMPAIGN_NOT_CANCELLED" };
    }

    const totalDonated = campaign.current_amount;
    const totalReleasedAmount = await escrowService.getTotalReleasedAmount(campaignId);
    const isFullRefund = totalReleasedAmount === 0;

    if (totalDonated <= 0) {
        return { 
            success: true, 
            message: "No donations to refund", 
            refunds: [], 
            totalRefunded: 0,
            totalReleased: totalReleasedAmount,
            isFullRefund: isFullRefund
        };
    }

    const availableAmount = totalDonated - totalReleasedAmount;

    if (availableAmount <= 0) {
        return {
            success: true,
            message: "No available amount to refund",
            refunds: [],
            totalRefunded: 0,
            totalReleased: totalReleasedAmount,
            isFullRefund: isFullRefund,
            totalDonated: totalDonated
        };
    }

    const refundRatio = availableAmount / totalDonated;

    const donations = await Donation.find({
        campaign: campaignId,
        payment_status: "completed"
    }).populate("donor", "username email fullname");

    if (donations.length === 0) {
        return { 
            success: true, 
            message: "No completed donations found", 
            refunds: [],
            totalRefunded: 0,
            totalReleased: totalReleasedAmount,
            isFullRefund: isFullRefund,
            totalDonated: totalDonated
        };
    }

    const refunds = [];
    const refundPromises = donations.map(async (donation) => {
        const refundAmount = Math.floor(donation.amount * refundRatio);
        const remainingRefund = donation.amount - refundAmount;

        if (refundAmount <= 0) {
            return null;
        }

        try {
            const refund = await Refund.create({
                campaign: campaignId,
                donation: donation._id,
                donor: donation.donor._id,
                original_amount: donation.amount,
                refunded_amount: refundAmount,
                refund_ratio: refundRatio,
                remaining_refund: remainingRefund,
                refund_status: "pending",
                refund_method: "escrow",
                created_by: adminId,
                notes: reason || `Proportional refund due to campaign cancellation. Ratio: ${(refundRatio * 100).toFixed(2)}%`
            });

            donation.refunded_amount = refundAmount;
            donation.refund_ratio = refundRatio;
            donation.remaining_refund_pending = remainingRefund;
            
            if (isFullRefund || remainingRefund <= 0) {
                donation.payment_status = "refunded";
                donation.refunded_at = new Date();
                donation.remaining_refund_pending = 0;
            } else {
                donation.payment_status = "partially_refunded";
            }

            await donation.save();

            refunds.push({
                refundId: refund._id,
                donationId: donation._id,
                donorId: donation.donor._id,
                originalAmount: donation.amount,
                refundedAmount: refundAmount,
                remainingRefund: remainingRefund,
                refundRatio: refundRatio
            });

            return refund;
        } catch (error) {
            console.error(`Error processing refund for donation ${donation._id}:`, error);
            return null;
        }
    });

    await Promise.all(refundPromises);

    const validRefunds = refunds.filter(r => r !== null);
    const totalRefunded = validRefunds.reduce((sum, r) => sum + r.refundedAmount, 0);

    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del(`donations:${campaignId}`);
    await redisClient.del("campaigns");

    const donorIds = [...new Set(validRefunds.map(r => r.donorId.toString()))];
    
    const refundMessage = isFullRefund
        ? `Bạn đã được refund 100% số tiền đã quyên góp cho chiến dịch "${campaign.title}"`
        : `Bạn đã được refund ${(refundRatio * 100).toFixed(2)}% số tiền đã quyên góp cho chiến dịch "${campaign.title}". Phần còn lại đang được thu hồi từ creator.`;

    const notifications = donorIds.map(donorId => ({
        receiver: donorId,
        sender: adminId,
        type: "refund_processed",
        campaign: campaignId,
        message: refundMessage,
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
                        type: "refund_processed",
                        message: notifications[i].message,
                        campaign: {
                            _id: campaign._id.toString(),
                            title: campaign.title
                        },
                        is_read: false,
                        createdAt: createdNotifications[i].createdAt
                    }
                }));
            } catch (notifError) {
                console.error("Error publishing refund notification:", notifError);
            }
        }
    } catch (notifError) {
        console.error("Error creating refund notifications:", notifError);
    }

    for (const refund of validRefunds) {
        try {
            const donation = donations.find(d => d._id.toString() === refund.donationId.toString());
            if (donation && donation.donor && donation.donor.email) {
                await mailerService.sendRefundEmail(donation.donor.email, {
                    username: donation.donor.username || donation.donor.fullname || "Bạn",
                    campaignTitle: campaign.title,
                    campaignId: campaignId,
                    originalAmount: refund.originalAmount,
                    refundedAmount: refund.refundedAmount,
                    refundRatio: refund.refundRatio,
                    remainingRefund: refund.remainingRefund,
                    reason: reason || "Campaign đã bị hủy do vi phạm tiêu chuẩn cộng đồng"
                });
            }
        } catch (emailError) {
            console.error(`Error sending refund email to donor ${refund.donorId}:`, emailError);
        }
    }

    return {
        success: true,
        message: `Processed ${validRefunds.length} refunds`,
        refunds: validRefunds,
        totalRefunded,
        totalReleased: totalReleasedAmount,
        refundRatio,
        totalDonated,
        isFullRefund
    };
};

export const updateRefundStatus = async (refundId, status, transactionData = null) => {
    const refund = await Refund.findById(refundId);
    if (!refund) {
        return { success: false, error: "REFUND_NOT_FOUND" };
    }

    if (!["pending", "completed", "failed", "partial"].includes(status)) {
        return { success: false, error: "INVALID_STATUS" };
    }

    refund.refund_status = status;
    
    if (transactionData) {
        if (transactionData.transaction_id) {
            refund.refund_transaction_id = transactionData.transaction_id;
        }
        if (transactionData.response_data) {
            refund.refund_response_data = transactionData.response_data;
        }
    }

    if (status === "completed") {
        refund.refunded_at = new Date();
        
        const donation = await Donation.findById(refund.donation);
        if (donation) {
            if (donation.remaining_refund_pending > 0) {
                donation.payment_status = "partially_refunded";
                refund.refund_status = "partial";
            } else {
                donation.payment_status = "refunded";
                donation.refunded_at = new Date();
                refund.refund_status = "completed";
            }
            await donation.save();
        } else {
            refund.refund_status = "completed";
        }
    }

    await refund.save();

    await redisClient.del(`refund:${refundId}`);
    await redisClient.del(`campaign:${refund.campaign}`);
    await redisClient.del(`donations:${refund.campaign}`);

    return { success: true, refund };
};

export const getRefundsByCampaign = async (campaignId) => {
    const refunds = await Refund.find({ campaign: campaignId })
        .populate("donor", "username email fullname")
        .populate("donation")
        .sort({ createdAt: -1 });

    return refunds;
};

export const getRefundById = async (refundId) => {
    const refund = await Refund.findById(refundId)
        .populate("donor", "username email fullname")
        .populate("donation")
        .populate("campaign", "title");

    return refund;
};

export const getPendingRefunds = async () => {
    const refunds = await Refund.find({ refund_status: { $in: ["pending", "partial"] } })
        .populate("donor", "username email fullname")
        .populate("donation", "order_invoice_number sepay_transaction_id")
        .populate("campaign", "title")
        .populate("created_by", "username")
        .sort({ createdAt: -1 });

    return refunds;
};

export const initSepayRefundPayment = async (refundId, paymentMethod = 'BANK_TRANSFER') => {
    const refund = await Refund.findById(refundId)
        .populate("donor", "username email")
        .populate("campaign", "title")
        .populate("donation");
    
    if (!refund) {
        return {
            success: false,
            error: "REFUND_NOT_FOUND",
            message: "Không tìm thấy refund request"
        };
    }

    if (refund.refund_status !== "pending") {
        return {
            success: false,
            error: "INVALID_STATUS",
            message: `Refund không ở trạng thái pending. Hiện tại: ${refund.refund_status}`
        };
    }

    if (refund.refund_transaction_id) {
        return {
            success: false,
            error: "PAYMENT_ALREADY_INITIATED",
            message: "Payment đã được khởi tạo cho refund này"
        };
    }

    const orderInvoiceNumber = `REFUND-${refund._id}-${Date.now()}`;
    refund.refund_transaction_id = orderInvoiceNumber;
    await refund.save();

    return {
        success: true,
        refund,
        orderInvoiceNumber
    };
};

export const getRefundByOrderInvoice = async (orderInvoiceNumber) => {
    const refund = await Refund.findOne({ refund_transaction_id: orderInvoiceNumber });
    return refund;
};



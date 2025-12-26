import Donation from "../models/donation.js";
import Campaign from "../models/campaign.js";
import Escrow from "../models/escrow.js";
import { redisClient } from "../config/redis.js";
import * as trackingService from "./tracking.service.js";


const calculateAvailableAmount = async (campaignId, currentAmount) => {
    const releasedEscrows = await Escrow.find({
        campaign: campaignId,
        request_status: "released"
    });

    const totalReleasedAmount = releasedEscrows.reduce((sum, escrow) => {
        return sum + (escrow.withdrawal_request_amount || 0);
    }, 0);

    return currentAmount - totalReleasedAmount;
};

const checkAndCreateMilestoneWithdrawalRequest = async (campaign) => {
    const percentage = (campaign.current_amount / campaign.goal_amount) * 100;
    
    const milestones = [50, 75, 100];
    

    const achievedMilestone = milestones
        .sort((a, b) => b - a)
        .find(milestone => percentage >= milestone);
    
    if (!achievedMilestone) {
        return null;
    }
    
    const existingRequest = await Escrow.findOne({
        campaign: campaign._id,
        milestone_percentage: achievedMilestone,
        auto_created: true,
        request_status: {
            $in: [
                "pending_voting",
                "voting_in_progress",
                "voting_completed",
                "admin_approved"
            ]
        }
    });
    
    if (existingRequest) {
        return null;
    }
    
    const lowerMilestoneRequests = await Escrow.updateMany(
        {
            campaign: campaign._id,
            milestone_percentage: { $lt: achievedMilestone },
            auto_created: true,
            request_status: {
                $in: [
                    "pending_voting",
                    "voting_in_progress",
                    "voting_completed",
                    "admin_approved"
                ]
            }
        },
        {
            request_status: "cancelled"
        }
    );
    
    if (lowerMilestoneRequests.modifiedCount > 0) {
        console.log(`[Milestone] Đã hủy ${lowerMilestoneRequests.modifiedCount} withdrawal request(s) có milestone thấp hơn ${achievedMilestone}% cho campaign ${campaign._id}`);
    }
    
    // Tính số tiền available (current_amount - tổng các escrow đã released)
    const availableAmount = await calculateAvailableAmount(campaign._id, campaign.current_amount);
    
    // Nếu không còn tiền available, không tạo request
    if (availableAmount <= 0) {
        console.log(`[Milestone] Không có tiền available để tạo withdrawal request cho campaign ${campaign._id} (available: ${availableAmount})`);
        return null;
    }
    
    const withdrawalRequest = await Escrow.create({
        campaign: campaign._id,
        requested_by: campaign.creator,
        withdrawal_request_amount: availableAmount,
        request_reason: `Tạo yêu cầu rút tiền khi campaign đạt ${achievedMilestone}% mục tiêu`,
        request_status: "pending_voting",
        total_amount: campaign.current_amount,
        remaining_amount: availableAmount,
        auto_created: true,
        milestone_percentage: achievedMilestone
    });
    
    const now = new Date();
    const votingEndDate = new Date(now);
    votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
    withdrawalRequest.request_status = "voting_in_progress";
    withdrawalRequest.voting_start_date = now;
    withdrawalRequest.voting_end_date = votingEndDate;
    await withdrawalRequest.save();
    
    console.log(`[Milestone] Tạo withdrawal request tự động cho campaign ${campaign._id} khi đạt ${achievedMilestone}% mục tiêu`);
    
    return withdrawalRequest;
};

export const createDonation = async (campaignId, donorId, donationData) => {
    const { amount, currency, donation_method, is_anonymous } = donationData;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return null;
    }
    
    const donation = await Donation.create({
        campaign: campaignId,
        donor: donorId,
        amount,
        currency,
        donation_method,
        is_anonymous,
    });
    
    campaign.current_amount += amount;
    campaign.completed_donations_count += 1;
    await campaign.save();
    
    try {
        await checkAndCreateMilestoneWithdrawalRequest(campaign);
    } catch (milestoneError) {
        console.error('Error checking milestone withdrawal request:', milestoneError);
    }
    
    await redisClient.del(`donations:${campaignId}`);
    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del('campaigns');
    await redisClient.del(`eligible_voters:${campaignId}`);
    
    try {
        const populatedDonation = await Donation.findById(donation._id)
            .populate("donor", "username avatar_url fullname");
        
        await trackingService.publishEvent("tracking:donation:created", {
            donationId: donation._id.toString(),
            campaignId: campaignId.toString(),
            donorId: donorId.toString(),
            amount: donation.amount,
            currency: donation.currency,
            payment_status: donation.payment_status,
            is_anonymous: donation.is_anonymous,
            donation: populatedDonation,
            campaign: {
                _id: campaign._id,
                title: campaign.title,
                current_amount: campaign.current_amount,
                goal_amount: campaign.goal_amount,
                completed_donations_count: campaign.completed_donations_count
            }
        });
        
        await trackingService.publishEvent("tracking:campaign:updated", {
            campaignId: campaign._id.toString(),
            userId: donorId.toString(),
            title: campaign.title,
            goal_amount: campaign.goal_amount,
            current_amount: campaign.current_amount,
            completed_donations_count: campaign.completed_donations_count,
            status: campaign.status,
            category: campaign.category,
        });
    } catch (eventError) {
        console.error('Error publishing donation created event:', eventError);
    }
    
    return { donation, campaign };
}

export const getDonationsByCampaign = async (campaignId) => {
    const donationKey = `donations:${campaignId}`;
    
    const cached = await redisClient.get(donationKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const donations = await Donation.find({ campaign: campaignId })
        .populate("donor", "username avatar_url fullname")
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(donationKey, 300, JSON.stringify(donations));
    
    return donations;
}

export const createSepayDonation = async (campaignId, donorId, donationData) => {
    const { amount, currency, paymentMethod, is_anonymous } = donationData;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return null;
    }
    
    const donation = await Donation.create({
        campaign: campaignId,
        donor: donorId,
        amount,
        currency: currency || 'VND',
        donation_method: 'sepay',
        sepay_payment_method: paymentMethod || 'BANK_TRANSFER',
        payment_status: 'pending',
        is_anonymous: is_anonymous || false,
    });
    
    const orderInvoiceNumber = `DONATION-${campaign._id}-${Date.now()}`;
    donation.order_invoice_number = orderInvoiceNumber;
    await donation.save();
    
    campaign.total_donations_count += 1;
    await campaign.save();
    
    await redisClient.del(`donations:${campaignId}`);
    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del('campaigns');
    
    try {
        const populatedDonation = await Donation.findById(donation._id)
            .populate("donor", "username avatar_url fullname");
        
        await trackingService.publishEvent("tracking:donation:created", {
            donationId: donation._id.toString(),
            campaignId: campaignId.toString(),
            donorId: donorId.toString(),
            amount: donation.amount,
            currency: donation.currency,
            payment_status: donation.payment_status,
            is_anonymous: donation.is_anonymous,
            donation_method: 'sepay',
            donation: populatedDonation,
            campaign: {
                _id: campaign._id,
                title: campaign.title,
                current_amount: campaign.current_amount,
                goal_amount: campaign.goal_amount,
                completed_donations_count: campaign.completed_donations_count
            }
        });
    } catch (eventError) {
        console.error('Error publishing sepay donation created event:', eventError);
    }
    
    return { donation, campaign };
}

export const getDonationByOrderInvoice = async (orderInvoiceNumber) => {
    const donation = await Donation.findOne({ order_invoice_number: orderInvoiceNumber });
    return donation;
}

export const updateSepayDonationStatus = async (orderInvoiceNumber, status, sepayData) => {
    const donation = await Donation.findOne({ order_invoice_number: orderInvoiceNumber });
    if (!donation) {
        return null;
    }

    if (donation.payment_status === 'completed') {
        const campaign = await Campaign.findById(donation.campaign);
        return { donation, campaign };
    }
    
    if ((status === 'cancelled' || status === 'failed') && donation.payment_status === 'completed') {
        const campaign = await Campaign.findById(donation.campaign);
        return { donation, campaign };
    }

    if (status === 'completed' && (donation.payment_status === 'cancelled' || donation.payment_status === 'failed')) {
    }
    else if ((status === 'cancelled' || status === 'failed') && donation.payment_status === 'pending') {
        if (sepayData?.transaction_id || donation.sepay_transaction_id) {
            const campaign = await Campaign.findById(donation.campaign);
            return { donation, campaign };
        }
        
        if (donation.paid_at) {
            const campaign = await Campaign.findById(donation.campaign);
            return { donation, campaign };
        }
    }
    else if ((status === 'cancelled' || status === 'failed') && (donation.payment_status === 'cancelled' || donation.payment_status === 'failed')) {
        const campaign = await Campaign.findById(donation.campaign);
        return { donation, campaign };
    }
    
    const oldPaymentStatus = donation.payment_status;
    
    const updateData = {
        payment_status: status,
        sepay_response_data: sepayData
    };
    
    if (sepayData?.transaction_id) {
        updateData.sepay_transaction_id = sepayData.transaction_id;
    }
    
    if (status === 'completed') {
        updateData.paid_at = new Date();
    } else if (status === 'failed') {
        updateData.failed_at = new Date();
    } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date();
    }

    Object.assign(donation, updateData);
    await donation.save();
    
    const campaign = await Campaign.findById(donation.campaign);
    
    if (status === 'completed' && oldPaymentStatus !== 'completed' && campaign) {
        campaign.current_amount += donation.amount;
        campaign.completed_donations_count += 1;
        await campaign.save();
        
        try {
            await checkAndCreateMilestoneWithdrawalRequest(campaign);
        } catch (milestoneError) {      
            console.error('Error checking milestone withdrawal request:', milestoneError);
        }
        
        try {
            await trackingService.publishEvent("tracking:campaign:updated", {
                campaignId: campaign._id.toString(),
                userId: donation.donor.toString(),
                title: campaign.title,
                goal_amount: campaign.goal_amount,
                current_amount: campaign.current_amount,
                completed_donations_count: campaign.completed_donations_count,
                status: campaign.status,
                category: campaign.category,
            });
        } catch (campaignEventError) {
            console.error('Error publishing campaign updated event:', campaignEventError);
        }
    }
    
    await redisClient.del(`donations:${donation.campaign}`);
    await redisClient.del(`campaign:${donation.campaign}`);
    await redisClient.del('campaigns');
    if (status === 'completed' && oldPaymentStatus !== 'completed') {
        await redisClient.del(`eligible_voters:${donation.campaign}`);
    }
    
    if (status === 'completed' && campaign) {
        try {
            const populatedDonation = await Donation.findById(donation._id)
                .populate("donor", "username avatar_url fullname");
            
            await trackingService.publishEvent("tracking:donation:status_changed", {
                donationId: donation._id.toString(),
                campaignId: donation.campaign.toString(),
                donorId: donation.donor.toString(),
                oldStatus: oldPaymentStatus,
                newStatus: status,
                amount: donation.amount,
                currency: donation.currency,
                payment_status: donation.payment_status,
                is_anonymous: donation.is_anonymous,
                donation: populatedDonation,
                campaign: {
                    _id: campaign._id,
                    title: campaign.title,
                    current_amount: campaign.current_amount,
                    goal_amount: campaign.goal_amount,
                    completed_donations_count: campaign.completed_donations_count
                    
                }
            });
            
            await trackingService.publishEvent("tracking:donation:updated", {
                donationId: donation._id.toString(),
                campaignId: donation.campaign.toString(),
                donorId: donation.donor.toString(),
                amount: donation.amount,
                currency: donation.currency,
                payment_status: donation.payment_status,
                is_anonymous: donation.is_anonymous,
                donation: populatedDonation,
                campaign: {
                    _id: campaign._id,
                    title: campaign.title,
                    current_amount: campaign.current_amount,
                    goal_amount: campaign.goal_amount,
                    completed_donations_count: campaign.completed_donations_count
                }
            });
        } catch (eventError) {
            console.error('Error publishing donation status changed event:', eventError);
        }
    }
    
    return { donation, campaign };
}
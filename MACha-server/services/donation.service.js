import mongoose from "mongoose";
import Donation from "../models/donation.js";
import Campaign from "../models/campaign.js";
import Escrow from "../models/escrow.js";
import CampaignCompanion from "../models/campaignCompanion.js";
import User from "../models/user.js";
import { redisClient } from "../config/redis.js";
import * as trackingService from "./tracking.service.js";
import * as escrowService from "./escrow.service.js";
import * as campaignCompanionService from "./campaignCompanion.service.js";
import * as queueService from "./queue.service.js";
import { createJob, JOB_TYPES, JOB_SOURCE } from "../schemas/job.schema.js";

// Cache để tránh check nhiều lần
let transactionSupportChecked = false;
let transactionSupported = false;

/**
 * Kiểm tra xem MongoDB có hỗ trợ transactions không
 * Transactions chỉ hoạt động trên replica set hoặc sharded cluster
 */
const checkTransactionSupport = async () => {
    if (transactionSupportChecked) {
        return transactionSupported;
    }
    
    // Nếu có env variable force enable, sử dụng nó
    if (process.env.MONGODB_TRANSACTION_SUPPORT === 'true') {
        transactionSupported = true;
        transactionSupportChecked = true;
        console.log('✅ MongoDB transactions enabled via MONGODB_TRANSACTION_SUPPORT env variable');
        return true;
    }
    
    // Nếu có env variable force disable, sử dụng nó
    if (process.env.MONGODB_TRANSACTION_SUPPORT === 'false') {
        transactionSupported = false;
        transactionSupportChecked = true;
        console.log('⚠️  MongoDB transactions disabled via MONGODB_TRANSACTION_SUPPORT env variable');
        return false;
    }
    
    try {
        const admin = mongoose.connection.db.admin();
        const serverStatus = await admin.serverStatus();
        
        // Kiểm tra replica set: serverStatus.repl sẽ có setName nếu là replica set
        const isReplicaSet = serverStatus.repl && 
                            (serverStatus.repl.setName || serverStatus.repl.replSetName);
        
        // Kiểm tra mongos: serverStatus.process sẽ là 'mongos' nếu là mongos
        const isMongos = serverStatus.process === 'mongos';
        
        // Kiểm tra connection string có chứa replica set name không
        const connectionString = process.env.DATABASE_URL || '';
        const hasReplicaSetInUrl = connectionString.includes('replicaSet=') || 
                                   connectionString.includes('replicaSet:');
        
        // Transactions được hỗ trợ nếu:
        // 1. Là replica set (có setName trong serverStatus)
        // 2. Là mongos (sharded cluster)
        // 3. Connection string có chỉ định replicaSet
        transactionSupported = isReplicaSet || isMongos || hasReplicaSetInUrl;
        
        transactionSupportChecked = true;
        
        if (transactionSupported) {
            const type = isMongos ? 'mongos (sharded cluster)' : 
                        isReplicaSet ? `replica set (${serverStatus.repl.setName || serverStatus.repl.replSetName || 'unknown'})` :
                        'replica set (detected from connection string)';
            console.log(`✅ MongoDB transactions supported (${type})`);
        } else {
            console.log('⚠️  MongoDB transactions not supported (standalone instance). Using fallback operations.');
        }
        
        return transactionSupported;
    } catch (error) {
        // Nếu không thể check, giả định không hỗ trợ (an toàn hơn)
        // Trong production, nên set MONGODB_TRANSACTION_SUPPORT=true nếu chắc chắn có replica set
        console.warn('⚠️  Could not check MongoDB transaction support, assuming not supported:', error.message);
        console.warn('💡 Tip: Set MONGODB_TRANSACTION_SUPPORT=true in .env if you have replica set');
        transactionSupported = false;
        transactionSupportChecked = true;
        return false;
    }
};

/**
 * Helper function để emit ESCROW_THRESHOLD_REACHED notification
 * @param {Object} withdrawalRequest - Escrow object
 * @param {Object} campaign - Campaign object
 * @param {Number} milestonePercentage - Milestone percentage đạt được
 */
const emitEscrowThresholdReachedNotification = async (withdrawalRequest, campaign, milestonePercentage) => {
    // Chỉ emit nếu chưa được notify (idempotency)
    if (withdrawalRequest.threshold_notified_at) {
        console.log(`[Milestone] ⚠️ Escrow ${withdrawalRequest._id} already notified (threshold_notified_at: ${withdrawalRequest.threshold_notified_at}), skipping`);
        return;
    }
    
    try {
        // Lấy danh sách unique donors (chỉ những người đã donate thành công)
        const uniqueDonors = await Donation.aggregate([
            {
                $match: {
                    campaign: campaign._id,
                    payment_status: "completed"
                }
            },
            {
                $group: {
                    _id: "$donor"
                }
            },
            {
                $project: {
                    _id: 0,
                    donorId: "$_id"
                }
            }
        ]);
        
        const donorIds = uniqueDonors.map(d => d.donorId.toString());
        
        if (donorIds.length > 0) {
            console.log(`[Milestone] Emitting ESCROW_THRESHOLD_REACHED event for escrow ${withdrawalRequest._id}, campaign ${campaign._id}, ${donorIds.length} donors`);
            
            const job = createJob(
                JOB_TYPES.ESCROW_THRESHOLD_REACHED,
                {
                    escrowId: withdrawalRequest._id.toString(),
                    campaignId: campaign._id.toString(),
                    campaignTitle: campaign.title,
                    milestonePercentage: milestonePercentage,
                    donorIds: donorIds // Pass donor IDs để worker không cần query DB
                },
                {
                    userId: campaign.creator.toString(),
                    source: JOB_SOURCE.SYSTEM,
                    requestId: `escrow-threshold-${withdrawalRequest._id}-${Date.now()}`
                }
            );
            
            await queueService.pushJob(job);
            
            // Đánh dấu đã notify (idempotency)
            withdrawalRequest.threshold_notified_at = new Date();
            await withdrawalRequest.save();
            
            console.log(`[Milestone] ✅ ESCROW_THRESHOLD_REACHED job queued successfully for escrow ${withdrawalRequest._id}`);
        } else {
            console.log(`[Milestone] ⚠️ No donors found for campaign ${campaign._id}, skipping notification`);
        }
    } catch (error) {
        // Log error nhưng không fail toàn bộ flow
        console.error(`[Milestone] ❌ Error emitting ESCROW_THRESHOLD_REACHED event for escrow ${withdrawalRequest._id}:`, error);
    }
};

const checkAndCreateMilestoneWithdrawalRequest = async (campaign, isExpired = false) => {
    const percentage = (campaign.current_amount / campaign.goal_amount) * 100;
    
    // Sử dụng milestones từ campaign thay vì hardcoded
    if (!campaign.milestones || campaign.milestones.length === 0) {
        return null;
    }
    
    // Nếu campaign đã hết hạn, tạo request cho số tiền còn lại
    if (isExpired) {
        // Kiểm tra xem đã có withdrawal request nào đang active chưa
        const existingRequest = await Escrow.findOne({
            campaign: campaign._id,
            auto_created: true,
            request_status: {
                $in: [
                    "pending_voting",
                    "voting_in_progress",
                    "voting_completed",
                    "admin_approved",
                    "released"
                ]
            }
        });
        
        if (existingRequest) {
            return null;
        }
        
        // Tính số tiền available
        const availableAmount = await escrowService.calculateAvailableAmount(campaign._id, campaign.current_amount);
        
        if (availableAmount <= 0) {
            console.log(`[Milestone] Campaign ${campaign._id} đã hết hạn nhưng không có tiền available (${availableAmount})`);
            return null;
        }
        
        // Nếu có milestones và có milestone 100%
        if (campaign.milestones && campaign.milestones.length > 0) {
            const milestone100 = campaign.milestones.find(m => m.percentage === 100);
            
            if (milestone100) {
                // Hủy các request của các mốc thấp hơn
                await Escrow.updateMany(
                    {
                        campaign: campaign._id,
                        milestone_percentage: { $lt: 100 },
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
                
                // Tạo request cho mốc 100%
                const requestReason = milestone100.commitment_description 
                    ? `Tạo yêu cầu rút tiền khi campaign hết hạn. Cam kết: ${milestone100.commitment_description}`
                    : `Tạo yêu cầu rút tiền khi campaign hết hạn`;
                
                const withdrawalRequest = await Escrow.create({
                    campaign: campaign._id,
                    requested_by: campaign.creator,
                    withdrawal_request_amount: availableAmount,
                    request_reason: requestReason,
                    request_status: "pending_voting",
                    total_amount: campaign.current_amount,
                    remaining_amount: availableAmount,
                    auto_created: true,
                    milestone_percentage: 100
                });
                
                const now = new Date();
                const votingEndDate = new Date(now);
                votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
                withdrawalRequest.request_status = "voting_in_progress";
                withdrawalRequest.voting_start_date = now;
                withdrawalRequest.voting_end_date = votingEndDate;
                await withdrawalRequest.save();
                
                console.log(`[Milestone] Tạo withdrawal request tự động cho campaign ${campaign._id} khi hết hạn (mốc 100%)`);
                
                return withdrawalRequest;
            } else {
                // Không có milestone 100%, tạo request cho số tiền còn lại
                await Escrow.updateMany(
                    {
                        campaign: campaign._id,
                        milestone_percentage: { $ne: null },
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
                
                const withdrawalRequest = await Escrow.create({
                    campaign: campaign._id,
                    requested_by: campaign.creator,
                    withdrawal_request_amount: availableAmount,
                    request_reason: `Tạo yêu cầu rút tiền cho số tiền còn lại khi campaign hết hạn (${campaign.current_amount.toLocaleString('vi-VN')} VND / ${campaign.goal_amount.toLocaleString('vi-VN')} VND)`,
                    request_status: "pending_voting",
                    total_amount: campaign.current_amount,
                    remaining_amount: availableAmount,
                    auto_created: true,
                    milestone_percentage: null
                });
                
                const now = new Date();
                const votingEndDate = new Date(now);
                votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
                withdrawalRequest.request_status = "voting_in_progress";
                withdrawalRequest.voting_start_date = now;
                withdrawalRequest.voting_end_date = votingEndDate;
                await withdrawalRequest.save();
                
                console.log(`[Milestone] Tạo withdrawal request tự động cho campaign ${campaign._id} khi hết hạn (số tiền còn lại, không có milestone 100%)`);
                
                return withdrawalRequest;
            }
        } else {
            // Không có milestones, tạo request cho số tiền còn lại
            const withdrawalRequest = await Escrow.create({
                campaign: campaign._id,
                requested_by: campaign.creator,
                withdrawal_request_amount: availableAmount,
                request_reason: `Tạo yêu cầu rút tiền cho số tiền còn lại khi campaign hết hạn (${campaign.current_amount.toLocaleString('vi-VN')} VND / ${campaign.goal_amount.toLocaleString('vi-VN')} VND)`,
                request_status: "pending_voting",
                total_amount: campaign.current_amount,
                remaining_amount: availableAmount,
                auto_created: true,
                milestone_percentage: null
            });
            
            const now = new Date();
            const votingEndDate = new Date(now);
            votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
            withdrawalRequest.request_status = "voting_in_progress";
            withdrawalRequest.voting_start_date = now;
            withdrawalRequest.voting_end_date = votingEndDate;
            await withdrawalRequest.save();
            
            console.log(`[Milestone] Tạo withdrawal request tự động cho campaign ${campaign._id} khi hết hạn (số tiền còn lại, không có milestones)`);
            
            return withdrawalRequest;
        }
    }
    
    // Logic bình thường cho khi đạt milestone
    // Sắp xếp milestones theo percentage giảm dần và tìm milestone đạt được
    const milestones = campaign.milestones.map(m => m.percentage).sort((a, b) => b - a);
    const achievedMilestonePercentage = milestones.find(milestone => percentage >= milestone);
    
    if (!achievedMilestonePercentage) {
        return null;
    }
    
    // Tìm milestone object để lấy commitment_description
    const achievedMilestone = campaign.milestones.find(m => m.percentage === achievedMilestonePercentage);
    
    const existingRequest = await Escrow.findOne({
        campaign: campaign._id,
        milestone_percentage: achievedMilestonePercentage,
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
            milestone_percentage: { $lt: achievedMilestonePercentage },
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
        console.log(`[Milestone] Đã hủy ${lowerMilestoneRequests.modifiedCount} withdrawal request(s) có milestone thấp hơn ${achievedMilestonePercentage}% cho campaign ${campaign._id}`);
    }
    
    // Tính số tiền available (current_amount - tổng các escrow đã released)
    const availableAmount = await escrowService.calculateAvailableAmount(campaign._id, campaign.current_amount);
    
    // Nếu không còn tiền available, không tạo request
    if (availableAmount <= 0) {
        console.log(`[Milestone] Không có tiền available để tạo withdrawal request cho campaign ${campaign._id} (available: ${availableAmount})`);
        return null;
    }
    
    // Tạo request reason với commitment description
    const requestReason = achievedMilestone.commitment_description 
        ? `Tạo yêu cầu rút tiền khi campaign đạt ${achievedMilestonePercentage}% mục tiêu. Cam kết: ${achievedMilestone.commitment_description}`
        : `Tạo yêu cầu rút tiền khi campaign đạt ${achievedMilestonePercentage}% mục tiêu`;
    
    const withdrawalRequest = await Escrow.create({
        campaign: campaign._id,
        requested_by: campaign.creator,
        withdrawal_request_amount: availableAmount,
        request_reason: requestReason,
        request_status: "pending_voting",
        total_amount: campaign.current_amount,
        remaining_amount: availableAmount,
        auto_created: true,
        milestone_percentage: achievedMilestonePercentage
    });
    
    const now = new Date();
    const votingEndDate = new Date(now);
    votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
    withdrawalRequest.request_status = "voting_in_progress";
    withdrawalRequest.voting_start_date = now;
    withdrawalRequest.voting_end_date = votingEndDate;
    await withdrawalRequest.save();
    
    console.log(`[Milestone] Tạo withdrawal request tự động cho campaign ${campaign._id} khi đạt ${achievedMilestonePercentage}% mục tiêu`);
    
    // Emit event ESCROW_THRESHOLD_REACHED để gửi notification cho tất cả donors
    await emitEscrowThresholdReachedNotification(withdrawalRequest, campaign, achievedMilestonePercentage);
    
    return withdrawalRequest;
};

export const createDonation = async (campaignId, donorId, donationData) => {
    const { amount, currency, donation_method, is_anonymous, companion_id } = donationData;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return null;
    }

    let companion = null;
    if (companion_id) {
        try {
            companion = await campaignCompanionService.validateCompanionForDonation(
                companion_id,
                donorId,
                campaignId
            );
        } catch (error) {
            throw new Error(`Invalid companion: ${error.message}`);
        }
    }
    
    const donation = await Donation.create({
        campaign: campaignId,
        donor: donorId,
        amount,
        currency,
        donation_method,
        is_anonymous,
        companion: companion ? companion._id : null,
    });
    
    // ✅ FIX: Sử dụng $inc operator để đảm bảo atomic update, tránh race condition
    await Campaign.findByIdAndUpdate(
        campaignId,
        { 
            $inc: { 
                current_amount: amount,
                completed_donations_count: 1
            } 
        }
    );
    
    // Reload campaign để có giá trị mới nhất cho các operations sau
    const updatedCampaign = await Campaign.findById(campaignId);
    
    try {
        await checkAndCreateMilestoneWithdrawalRequest(updatedCampaign);
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
                _id: updatedCampaign._id,
                title: updatedCampaign.title,
                current_amount: updatedCampaign.current_amount,
                goal_amount: updatedCampaign.goal_amount,
                completed_donations_count: updatedCampaign.completed_donations_count
            }
        });
        
        await trackingService.publishEvent("tracking:campaign:updated", {
            campaignId: updatedCampaign._id.toString(),
            userId: donorId.toString(),
            title: updatedCampaign.title,
            goal_amount: updatedCampaign.goal_amount,
            current_amount: updatedCampaign.current_amount,
            completed_donations_count: updatedCampaign.completed_donations_count,
            status: updatedCampaign.status,
            category: updatedCampaign.category,
        });
    } catch (eventError) {
        console.error('Error publishing donation created event:', eventError);
    }
    
    return { donation, campaign: updatedCampaign };
}

export const getDonationsByCampaign = async (campaignId) => {
    const donationKey = `donations:${campaignId}`;
    
    const cached = await redisClient.get(donationKey);
    if (cached) {
        const donations = JSON.parse(cached);
        return donations.map(formatDonationWithCompanion);
    }
    
    const donations = await Donation.find({ campaign: campaignId })
        .populate("donor", "username avatar_url fullname")
        .populate({
            path: "companion",
            populate: {
                path: "user",
                select: "username fullname avatar"
            }
        })
        .sort({ createdAt: -1 });
    
    const formattedDonations = donations.map(formatDonationWithCompanion);
    
    await redisClient.setEx(donationKey, 300, JSON.stringify(formattedDonations));
    
    return formattedDonations;
}

const formatDonationWithCompanion = (donation) => {
    const donationObj = donation.toObject ? donation.toObject() : donation;
    
    let display_name = donationObj.donor?.fullname || donationObj.donor?.username || "Anonymous";
    
    if (donationObj.companion?.user) {
        const companionName = donationObj.companion.user.fullname || donationObj.companion.user.username;
        display_name = `${display_name} (qua ${companionName})`;
    }
    
    return {
        ...donationObj,
        display_name
    };
}

export const createSepayDonation = async (campaignId, donorId, donationData) => {
    const { amount, currency, paymentMethod, is_anonymous, companion_id } = donationData;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return null;
    }

    let companion = null;
    if (companion_id) {
        try {
            companion = await campaignCompanionService.validateCompanionForDonation(
                companion_id,
                donorId,
                campaignId
            );
        } catch (error) {
            throw new Error(`Invalid companion: ${error.message}`);
        }
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
        companion: companion_id || null,
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
    // ✅ FIX: Đọc donation trước để lấy oldPaymentStatus
    const existingDonation = await Donation.findOne({ order_invoice_number: orderInvoiceNumber });
    if (!existingDonation) {
        return null;
    }

    const oldPaymentStatus = existingDonation.payment_status;

    // Early return nếu đã completed và status mới cũng là completed (idempotency)
    if (oldPaymentStatus === 'completed' && status === 'completed') {
        const campaign = await Campaign.findById(existingDonation.campaign);
        return { donation: existingDonation, campaign, alreadyProcessed: true };
    }

    // Early return cho các trường hợp không hợp lệ
    if (oldPaymentStatus === 'completed' && (status === 'cancelled' || status === 'failed')) {
        const campaign = await Campaign.findById(existingDonation.campaign);
        return { donation: existingDonation, campaign };
    }

    if ((status === 'cancelled' || status === 'failed') && oldPaymentStatus === 'pending') {
        if (sepayData?.transaction_id || existingDonation.sepay_transaction_id) {
            const campaign = await Campaign.findById(existingDonation.campaign);
            return { donation: existingDonation, campaign };
        }
        
        if (existingDonation.paid_at) {
            const campaign = await Campaign.findById(existingDonation.campaign);
            return { donation: existingDonation, campaign };
        }
    }

    if ((status === 'cancelled' || status === 'failed') && 
        (oldPaymentStatus === 'cancelled' || oldPaymentStatus === 'failed')) {
        const campaign = await Campaign.findById(existingDonation.campaign);
        return { donation: existingDonation, campaign };
    }

    if (status === 'completed' && (oldPaymentStatus === 'cancelled' || oldPaymentStatus === 'failed')) {
        // Không cho phép completed nếu đã cancelled/failed
        const campaign = await Campaign.findById(existingDonation.campaign);
        return { donation: existingDonation, campaign };
    }

    // ✅ FIX: Sử dụng findOneAndUpdate với condition để đảm bảo idempotency (atomic check)
    // Chỉ update nếu payment_status chưa phải là 'completed' (tránh duplicate processing)
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

    // ✅ FIX: Atomic update - chỉ update nếu payment_status chưa là 'completed' (khi status === 'completed')
    // Điều này đảm bảo idempotency: nếu callback được gọi nhiều lần, chỉ xử lý 1 lần
    const donation = await Donation.findOneAndUpdate(
        { 
            order_invoice_number: orderInvoiceNumber,
            // Chỉ update nếu chưa completed (tránh duplicate processing)
            ...(status === 'completed' ? { payment_status: { $ne: 'completed' } } : {})
        },
        updateData,
        { new: true }
    );

    if (!donation) {
        // Donation đã được xử lý bởi request khác (nếu status === 'completed')
        if (status === 'completed') {
            const alreadyProcessedDonation = await Donation.findOne({ order_invoice_number: orderInvoiceNumber });
            if (alreadyProcessedDonation && alreadyProcessedDonation.payment_status === 'completed') {
                const campaign = await Campaign.findById(alreadyProcessedDonation.campaign);
                return { donation: alreadyProcessedDonation, campaign, alreadyProcessed: true };
            }
        }
        return null;
    }
    
    const campaign = await Campaign.findById(donation.campaign);
    if (!campaign) {
        return { donation };
    }
    
    // ✅ FIX: Sử dụng MongoDB Transaction cho complex operations khi status === 'completed'
    // Đảm bảo atomic: update donation + campaign + milestone
    // Fallback về non-transactional operations nếu MongoDB không hỗ trợ transactions (standalone)
    if (status === 'completed' && oldPaymentStatus !== 'completed') {
        const supportsTransactions = await checkTransactionSupport();
        
        if (supportsTransactions) {
            // Sử dụng transactions khi có hỗ trợ (replica set hoặc sharded cluster)
            const session = await mongoose.startSession();
            session.startTransaction();
            
            try {
                // ✅ FIX: Sử dụng $inc operator để đảm bảo atomic update, tránh race condition
                await Campaign.findByIdAndUpdate(
                    campaign._id,
                    { 
                        $inc: { 
                            current_amount: donation.amount,
                            completed_donations_count: 1
                        } 
                    },
                    { session }
                );
                
                // Reload campaign để có giá trị mới nhất
                const campaignWithLatestData = await Campaign.findById(campaign._id).session(session);
                
                // Check và tạo milestone withdrawal request trong transaction
                try {
                    await checkAndCreateMilestoneWithdrawalRequest(campaignWithLatestData);
                } catch (milestoneError) {      
                    console.error('Error checking milestone withdrawal request:', milestoneError);
                    // Không throw error, chỉ log - milestone có thể retry sau
                }
                
                await session.commitTransaction();
                
                // Publish events sau khi transaction commit thành công
                try {
                    await trackingService.publishEvent("tracking:campaign:updated", {
                        campaignId: campaignWithLatestData._id.toString(),
                        userId: donation.donor.toString(),
                        title: campaignWithLatestData.title,
                        goal_amount: campaignWithLatestData.goal_amount,
                        current_amount: campaignWithLatestData.current_amount,
                        completed_donations_count: campaignWithLatestData.completed_donations_count,
                        status: campaignWithLatestData.status,
                        category: campaignWithLatestData.category,
                    });
                } catch (campaignEventError) {
                    console.error('Error publishing campaign updated event:', campaignEventError);
                }
                
                // Update campaign reference để return đúng giá trị
                Object.assign(campaign, campaignWithLatestData);
            } catch (error) {
                await session.abortTransaction();
                console.error('Transaction failed in updateSepayDonationStatus:', error);
                throw error;
            } finally {
                session.endSession();
            }
        } else {
            // Fallback: Sử dụng atomic operations không cần transactions (cho standalone MongoDB)
            // $inc operator đảm bảo atomicity ngay cả khi không có transactions
            try {
                // ✅ FIX: Sử dụng $inc operator để đảm bảo atomic update, tránh race condition
                await Campaign.findByIdAndUpdate(
                    campaign._id,
                    { 
                        $inc: { 
                            current_amount: donation.amount,
                            completed_donations_count: 1
                        } 
                    }
                );
                
                // Reload campaign để có giá trị mới nhất
                const campaignWithLatestData = await Campaign.findById(campaign._id);
                
                // Check và tạo milestone withdrawal request
                try {
                    await checkAndCreateMilestoneWithdrawalRequest(campaignWithLatestData);
                } catch (milestoneError) {      
                    console.error('Error checking milestone withdrawal request:', milestoneError);
                    // Không throw error, chỉ log - milestone có thể retry sau
                }
                
                // Publish events sau khi update thành công
                try {
                    await trackingService.publishEvent("tracking:campaign:updated", {
                        campaignId: campaignWithLatestData._id.toString(),
                        userId: donation.donor.toString(),
                        title: campaignWithLatestData.title,
                        goal_amount: campaignWithLatestData.goal_amount,
                        current_amount: campaignWithLatestData.current_amount,
                        completed_donations_count: campaignWithLatestData.completed_donations_count,
                        status: campaignWithLatestData.status,
                        category: campaignWithLatestData.category,
                    });
                } catch (campaignEventError) {
                    console.error('Error publishing campaign updated event:', campaignEventError);
                }
                
                // Update campaign reference để return đúng giá trị
                Object.assign(campaign, campaignWithLatestData);
            } catch (error) {
                console.error('Failed to update campaign in updateSepayDonationStatus (fallback):', error);
                throw error;
            }
        }
    }
    
    await redisClient.del(`donations:${donation.campaign}`);
    await redisClient.del(`campaign:${donation.campaign}`);
    await redisClient.del('campaigns');
    if (status === 'completed' && oldPaymentStatus !== 'completed') {
        await redisClient.del(`eligible_voters:${donation.campaign}`);
    }
    
    // Reload campaign để có giá trị mới nhất (sau transaction)
    const finalCampaign = await Campaign.findById(donation.campaign);
    
    if (status === 'completed' && finalCampaign) {
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
                    _id: finalCampaign._id,
                    title: finalCampaign.title,
                    current_amount: finalCampaign.current_amount,
                    goal_amount: finalCampaign.goal_amount,
                    completed_donations_count: finalCampaign.completed_donations_count
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
                    _id: finalCampaign._id,
                    title: finalCampaign.title,
                    current_amount: finalCampaign.current_amount,
                    goal_amount: finalCampaign.goal_amount,
                    completed_donations_count: finalCampaign.completed_donations_count
                }
            });
        } catch (eventError) {
            console.error('Error publishing donation status changed event:', eventError);
        }


        if (oldPaymentStatus !== 'completed' && !donation.thank_you_mail_sent_at) {
            try {
                // Reload donation để đảm bảo có giá trị mới nhất (tránh race condition)
                const freshDonation = await Donation.findById(donation._id);
                
                // Double check: Nếu đã có người khác set thank_you_mail_sent_at, skip
                if (freshDonation.thank_you_mail_sent_at) {
                    console.log(`[Donation Service] Thank you email already sent for donation ${donation._id} (race condition detected), skipping`);
                    return { donation: freshDonation, campaign };
                }

                // Populate donor để lấy email
                const donor = await User.findById(donation.donor).select("email username fullname");
                
                if (!donor || !donor.email) {
                    console.warn(`[Donation Service] Cannot send thank you email: donor not found or no email for donation ${donation._id}`);
                } else {
                    console.log(`[Donation Service][${donation.sepay_transaction_id || donation.order_invoice_number}] Preparing thank you email for donation ${donation._id} to ${donor.email}`);

                    // Tạo job để gửi email cảm ơn
                    const thankYouJob = createJob(
                        JOB_TYPES.DONATION_THANK_YOU,
                        {
                            email: donor.email,
                            donorName: donor.fullname || donor.username || null,
                            amount: donation.amount,
                            currency: donation.currency,
                            transactionId: donation.sepay_transaction_id || donation.order_invoice_number || null,
                            transactionTime: donation.paid_at || donation.updatedAt || new Date().toISOString(),
                            createdAt: donation.createdAt || new Date().toISOString(),
                            donationId: donation._id.toString(),
                        },
                        {
                            userId: donation.donor.toString(),
                            source: JOB_SOURCE.SYSTEM,
                            requestId: `donation-${donation._id}-${Date.now()}`,
                        }
                    );

                    // Push job vào queue
                    await queueService.pushJob(thankYouJob);

                    // Đánh dấu đã push job (idempotency)
                    // Note: Field thank_you_mail_sent_at được set ngay sau khi push job thành công
                    // để tránh gửi lại khi callback bị gọi lại
                    freshDonation.thank_you_mail_sent_at = new Date();
                    await freshDonation.save();

                    console.log(`[Donation Service][${donation.sepay_transaction_id || donation.order_invoice_number}] Thank you email job queued successfully for donation ${donation._id} to ${donor.email}`);
                    
                    // Update donation reference để return đúng giá trị
                    donation.thank_you_mail_sent_at = freshDonation.thank_you_mail_sent_at;
                }
            } catch (mailError) {
                // Log error nhưng không fail toàn bộ flow
                // Mail có thể retry sau
                console.error(`[Donation Service][${donation.sepay_transaction_id || donation.order_invoice_number}] Failed to queue thank you email for donation ${donation._id}:`, mailError);
            }
        } else if (donation.thank_you_mail_sent_at) {
            console.log(`[Donation Service] Thank you email already sent for donation ${donation._id} (thank_you_mail_sent_at: ${donation.thank_you_mail_sent_at}), skipping`);
        }
    }
    
    // Reload campaign để có giá trị mới nhất trước khi return
    const finalCampaignForReturn = await Campaign.findById(donation.campaign);
    return { donation, campaign: finalCampaignForReturn || campaign };
}
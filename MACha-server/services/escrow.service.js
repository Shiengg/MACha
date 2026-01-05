import mongoose from "mongoose";
import Escrow from "../models/escrow.js";
import Campaign from "../models/campaign.js";
import Donation from "../models/donation.js";
import Vote from "../models/vote.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import { redisClient } from "../config/redis.js";
import * as mailerService from "../utils/mailer.js";

const VOTING_DURATION_DAYS = 3;


export const getTotalReleasedAmount = async (campaignId) => {
    const result = await Escrow.aggregate([
        {
            $match: {
                campaign: mongoose.Types.ObjectId.isValid(campaignId) 
                    ? new mongoose.Types.ObjectId(campaignId)
                    : campaignId,
                request_status: "released"
            }
        },
        {
            $group: {
                _id: null,
                totalReleasedAmount: { $sum: "$withdrawal_request_amount" }
            }
        }
    ]);

    return result.length > 0 ? (result[0].totalReleasedAmount || 0) : 0;
};

export const calculateAvailableAmount = async (campaignId, currentAmount) => {
    const totalReleasedAmount = await getTotalReleasedAmount(campaignId);
    return currentAmount - totalReleasedAmount;
};

const startVotingPeriod = (escrow) => {
    const now = new Date();
    const votingEndDate = new Date(now);
    votingEndDate.setDate(votingEndDate.getDate() + VOTING_DURATION_DAYS);
    
    escrow.request_status = "voting_in_progress";
    escrow.voting_start_date = now;
    escrow.voting_end_date = votingEndDate;
    
    return escrow;
};


export const createWithdrawalRequest = async (campaignId, userId, requestData) => {
    const { withdrawal_request_amount, request_reason } = requestData;

    if (!withdrawal_request_amount || withdrawal_request_amount <= 0) {
        return {
            success: false,
            error: "INVALID_AMOUNT",
            message: "Số tiền yêu cầu rút phải lớn hơn 0"
        };
    }

    if (!request_reason || request_reason.trim().length === 0) {
        return {
            success: false,
            error: "MISSING_REASON",
            message: "Lý do yêu cầu rút tiền là bắt buộc"
        };
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return {
            success: false,
            error: "CAMPAIGN_NOT_FOUND",
            message: "Không tìm thấy campaign"
        };
    }

    if (campaign.creator.toString() !== userId.toString()) {
        return {
            success: false,
            error: "UNAUTHORIZED",
            message: "Chỉ creator của campaign mới có thể tạo withdrawal request"
        };
    }

    if (campaign.status !== "active") {
        return {
            success: false,
            error: "CAMPAIGN_NOT_ACTIVE",
            message: `Campaign phải ở trạng thái "active" để tạo withdrawal request. Hiện tại: ${campaign.status}`
        };
    }

    const availableAmount = await calculateAvailableAmount(campaignId, campaign.current_amount);

    if (withdrawal_request_amount > availableAmount) {
        return {
            success: false,
            error: "INSUFFICIENT_FUNDS",
            message: `Số tiền yêu cầu rút (${withdrawal_request_amount.toLocaleString('vi-VN')} VND) vượt quá số tiền có sẵn (${availableAmount.toLocaleString('vi-VN')} VND)`,
            availableAmount
        };
    }

    const pendingRequest = await Escrow.findOne({
        campaign: campaignId,
        request_status: {
            $in: [
                "pending_voting",
                "voting_in_progress",
                "voting_completed",
                "admin_approved"
            ]
        }
    });

    if (pendingRequest) {
        return {
            success: false,
            error: "PENDING_REQUEST_EXISTS",
            message: "Đã có withdrawal request đang pending. Vui lòng đợi request hiện tại được xử lý trước khi tạo request mới.",
            pendingRequestId: pendingRequest._id
        };
    }

    const escrow = await Escrow.create({
        campaign: campaignId,
        requested_by: userId,
        withdrawal_request_amount: withdrawal_request_amount,
        request_reason: request_reason,
        request_status: "pending_voting",
        total_amount: campaign.current_amount,
        remaining_amount: availableAmount - withdrawal_request_amount,
        auto_created: false,
        milestone_percentage: null
    });
    
    startVotingPeriod(escrow);
    await escrow.save();

    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del('campaigns');

    return {
        success: true,
        escrow
    };
};


export const getEligibleVoters = async (campaignId) => {
    const cacheKey = `eligible_voters:${campaignId}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return [];
    }
    
    // Chỉ cần đã donate (bất kỳ số tiền nào) là được vote
    const eligibleVoters = await Donation.aggregate([
        {
            $match: {
                campaign: campaign._id,
                payment_status: "completed"
            }
        },
        {
            $group: {
                _id: "$donor",
                totalDonatedAmount: { $sum: "$amount" }
            }
        },
        {
            $sort: { totalDonatedAmount: -1 }
        },
        {
            $project: {
                _id: 0,
                donorId: "$_id",
                totalDonatedAmount: 1
            }
        }
    ]);
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(eligibleVoters));
    
    return eligibleVoters;
};


export const submitVote = async (escrowId, userId, value) => {
    if (value !== "approve" && value !== "reject") {
        return {
            success: false,
            error: "INVALID_VOTE_VALUE",
            message: "Vote value phải là 'approve' hoặc 'reject'"
        };
    }
    
    const escrow = await Escrow.findById(escrowId).populate("campaign");
    if (!escrow) {
        return {
            success: false,
            error: "ESCROW_NOT_FOUND",
            message: "Không tìm thấy withdrawal request"
        };
    }
    
    if (escrow.request_status !== "voting_in_progress") {
        return {
            success: false,
            error: "VOTING_NOT_IN_PROGRESS",
            message: `Withdrawal request không đang trong trạng thái voting. Hiện tại: ${escrow.request_status}`
        };
    }
    
    const now = new Date();
    if (escrow.voting_end_date && escrow.voting_end_date < now) {
        return {
            success: false,
            error: "VOTING_PERIOD_EXPIRED",
            message: "Voting period đã kết thúc"
        };
    }
    
    const eligibleVoters = await getEligibleVoters(escrow.campaign._id.toString());
    const isEligible = eligibleVoters.some(voter => voter.donorId.toString() === userId.toString());
    
    if (!isEligible) {
        return {
            success: false,
            error: "NOT_ELIGIBLE_TO_VOTE",
            message: "Bạn không đủ điều kiện để vote cho withdrawal request này"
        };
    }
    
    const userVoterData = eligibleVoters.find(voter => voter.donorId.toString() === userId.toString());
    const donatedAmount = userVoterData.totalDonatedAmount;
    const voteWeight = donatedAmount;
    
    const existingVote = await Vote.findOne({
        escrow: escrowId,
        donor: userId
    });
    
    if (existingVote) {
        existingVote.value = value;
        existingVote.donated_amount = donatedAmount;
        existingVote.vote_weight = voteWeight;
        await existingVote.save();
        
        return {
            success: true,
            vote: existingVote,
            message: "Vote đã được cập nhật"
        };
    }
    
    const vote = await Vote.create({
        escrow: escrowId,
        donor: userId,
        value: value,
        donated_amount: donatedAmount,
        vote_weight: voteWeight
    });
    
    return {
        success: true,
        vote: vote
    };
};

export const finalizeVotingResult = async (escrowId) => {
    const escrow = await Escrow.findById(escrowId).populate("campaign");
    if (!escrow) {
        return {
            success: false,
            error: "ESCROW_NOT_FOUND"
        };
    }
    
    if (escrow.request_status !== "voting_in_progress") {
        return {
            success: false,
            error: "NOT_IN_VOTING_STATUS",
            message: `Escrow không đang trong trạng thái voting_in_progress. Hiện tại: ${escrow.request_status}`
        };
    }
    
    const votes = await Vote.find({ escrow: escrowId });
    
    let totalApproveWeight = 0;
    let totalRejectWeight = 0;
    let approveCount = 0;
    let rejectCount = 0;
    
    votes.forEach(vote => {
        if (vote.value === "approve") {
            totalApproveWeight += vote.vote_weight || 0;
            approveCount++;
        } else if (vote.value === "reject") {
            totalRejectWeight += vote.vote_weight || 0;
            rejectCount++;
        }
    });
    
    const totalWeight = totalApproveWeight + totalRejectWeight;
    
    const approvePercentage = totalWeight > 0 ? (totalApproveWeight / totalWeight) * 100 : 0;
    const rejectPercentage = totalWeight > 0 ? (totalRejectWeight / totalWeight) * 100 : 0;
    
    const APPROVE_THRESHOLD = 50;
    
    if (approvePercentage >= APPROVE_THRESHOLD) {
        escrow.request_status = "voting_completed";
    } else {
        escrow.request_status = "voting_completed";
    }
    
    await escrow.save();
    
    return {
        success: true,
        escrow: escrow,
        voteSummary: {
            totalVotes: votes.length,
            approveCount,
            rejectCount,
            totalApproveWeight,
            totalRejectWeight,
            approvePercentage: approvePercentage.toFixed(2),
            rejectPercentage: rejectPercentage.toFixed(2)
        }
    };
};


export const processExpiredVotingPeriods = async () => {
    const now = new Date();
    
    const expiredEscrows = await Escrow.find({
        request_status: "voting_in_progress",
        voting_end_date: { $lte: now }
    });
    
    const results = [];
    
    for (const escrow of expiredEscrows) {
        try {
            const result = await finalizeVotingResult(escrow._id.toString());
            results.push({
                escrowId: escrow._id.toString(),
                success: result.success,
                error: result.error,
                voteSummary: result.voteSummary
            });
            
            if (result.success) {
                console.log(`[Voting] Đã finalize voting result cho escrow ${escrow._id}: ${result.voteSummary.approvePercentage}% approve`);
            }
        } catch (error) {
            console.error(`[Voting] Error finalizing voting for escrow ${escrow._id}:`, error);
            results.push({
                escrowId: escrow._id.toString(),
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
};


export const getWithdrawalRequestsForReview = async (status = "voting_completed") => {
    const escrows = await Escrow.find({ request_status: status })
        .populate("campaign", "title goal_amount current_amount creator")
        .populate("requested_by", "username email fullname")
        .sort({ createdAt: -1 });
    
    // Tính voting results cho mỗi escrow
    const escrowsWithVotingResults = await Promise.all(
        escrows.map(async (escrow) => {
            const votes = await Vote.find({ escrow: escrow._id });
            
            let totalApproveWeight = 0;
            let totalRejectWeight = 0;
            let approveCount = 0;
            let rejectCount = 0;
            
            votes.forEach(vote => {
                if (vote.value === "approve") {
                    totalApproveWeight += vote.vote_weight || 0;
                    approveCount++;
                } else if (vote.value === "reject") {
                    totalRejectWeight += vote.vote_weight || 0;
                    rejectCount++;
                }
            });
            
            const totalWeight = totalApproveWeight + totalRejectWeight;
            const approvePercentage = totalWeight > 0 ? (totalApproveWeight / totalWeight) * 100 : 0;
            const rejectPercentage = totalWeight > 0 ? (totalRejectWeight / totalWeight) * 100 : 0;
            
            return {
                ...escrow.toObject(),
                votingResults: {
                    totalVotes: votes.length,
                    approveCount,
                    rejectCount,
                    totalApproveWeight,
                    totalRejectWeight,
                    approvePercentage: approvePercentage.toFixed(2),
                    rejectPercentage: rejectPercentage.toFixed(2)
                }
            };
        })
    );
    
    return escrowsWithVotingResults;
};

export const approveWithdrawalRequest = async (escrowId, adminId) => {
    const escrow = await Escrow.findById(escrowId).populate("campaign");
    if (!escrow) {
        return {
            success: false,
            error: "ESCROW_NOT_FOUND",
            message: "Không tìm thấy withdrawal request"
        };
    }
    
    if (escrow.request_status !== "voting_completed") {
        return {
            success: false,
            error: "INVALID_STATUS",
            message: `Withdrawal request không ở trạng thái voting_completed. Hiện tại: ${escrow.request_status}`
        };
    }
    
    const now = new Date();
    
    // Chỉ set status thành admin_approved, chưa release tiền
    // Owner sẽ cần xem và release sau đó
    escrow.request_status = "admin_approved";
    escrow.admin_reviewed_by = adminId;
    escrow.admin_reviewed_at = now;
    escrow.approved_at = now;
    await escrow.save();
    
    return {
        success: true,
        escrow: escrow,
        message: "Withdrawal request đã được admin duyệt. Chờ owner xem và release tiền."
    };
};

export const rejectWithdrawalRequest = async (escrowId, adminId, rejectionReason) => {
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) {
        return {
            success: false,
            error: "ESCROW_NOT_FOUND",
            message: "Không tìm thấy withdrawal request"
        };
    }
    
    if (escrow.request_status !== "voting_completed") {
        return {
            success: false,
            error: "INVALID_STATUS",
            message: `Withdrawal request không ở trạng thái voting_completed. Hiện tại: ${escrow.request_status}`
        };
    }
    
    if (!rejectionReason || rejectionReason.trim().length === 0) {
        return {
            success: false,
            error: "MISSING_REJECTION_REASON",
            message: "Lý do từ chối là bắt buộc"
        };
    }
    
    const now = new Date();
    
    escrow.request_status = "admin_rejected";
    escrow.admin_reviewed_by = adminId;
    escrow.admin_reviewed_at = now;
    escrow.admin_rejection_reason = rejectionReason;
    await escrow.save();
    
    return {
        success: true,
        escrow: escrow,
        message: "Withdrawal request đã bị từ chối"
    };
};


export const getWithdrawalRequestsByCampaign = async (campaignId, status = null) => {
    const query = { campaign: campaignId };
    if (status) {
        query.request_status = status;
    }
    
    const escrows = await Escrow.find(query)
        .populate("campaign", "title goal_amount current_amount creator")
        .populate("requested_by", "username email fullname avatar")
        .populate("admin_reviewed_by", "username fullname")
        .sort({ createdAt: -1 });
    
    // Tính voting results cho mỗi escrow
    const escrowsWithDetails = await Promise.all(
        escrows.map(async (escrow) => {
            const votes = await Vote.find({ escrow: escrow._id });
            
            let totalApproveWeight = 0;
            let totalRejectWeight = 0;
            let approveCount = 0;
            let rejectCount = 0;
            
            votes.forEach(vote => {
                if (vote.value === "approve") {
                    totalApproveWeight += vote.vote_weight || 0;
                    approveCount++;
                } else if (vote.value === "reject") {
                    totalRejectWeight += vote.vote_weight || 0;
                    rejectCount++;
                }
            });
            
            const totalWeight = totalApproveWeight + totalRejectWeight;
            const approvePercentage = totalWeight > 0 ? (totalApproveWeight / totalWeight) * 100 : 0;
            const rejectPercentage = totalWeight > 0 ? (totalRejectWeight / totalWeight) * 100 : 0;
            
            return {
                ...escrow.toObject(),
                votingResults: {
                    totalVotes: votes.length,
                    approveCount,
                    rejectCount,
                    totalApproveWeight,
                    totalRejectWeight,
                    approvePercentage: approvePercentage.toFixed(2),
                    rejectPercentage: rejectPercentage.toFixed(2)
                }
            };
        })
    );
    
    return escrowsWithDetails;
};

/**
 * Lấy chi tiết một withdrawal request theo ID
 * @param {string} escrowId - ID của escrow
 * @returns {Promise<Object|null>} Escrow object với thông tin đầy đủ hoặc null
 */
export const getWithdrawalRequestById = async (escrowId) => {
    const escrow = await Escrow.findById(escrowId)
        .populate("campaign", "title goal_amount current_amount creator")
        .populate("requested_by", "username email fullname avatar")
        .populate("admin_reviewed_by", "username fullname");
    
    if (!escrow) {
        return null;
    }
    
    // Tính voting results
    const votes = await Vote.find({ escrow: escrowId });
    
    let totalApproveWeight = 0;
    let totalRejectWeight = 0;
    let approveCount = 0;
    let rejectCount = 0;
    
    votes.forEach(vote => {
        if (vote.value === "approve") {
            totalApproveWeight += vote.vote_weight || 0;
            approveCount++;
        } else if (vote.value === "reject") {
            totalRejectWeight += vote.vote_weight || 0;
            rejectCount++;
        }
    });
    
    const totalWeight = totalApproveWeight + totalRejectWeight;
    const approvePercentage = totalWeight > 0 ? (totalApproveWeight / totalWeight) * 100 : 0;
    const rejectPercentage = totalWeight > 0 ? (totalRejectWeight / totalWeight) * 100 : 0;
    
    return {
        ...escrow.toObject(),
        votingResults: {
            totalVotes: votes.length,
            approveCount,
            rejectCount,
            totalApproveWeight,
            totalRejectWeight,
            approvePercentage: approvePercentage.toFixed(2),
            rejectPercentage: rejectPercentage.toFixed(2)
        }
    };
};


export const getVotesByEscrow = async (escrowId) => {
    const votes = await Vote.find({ escrow: escrowId })
        .populate("donor", "username fullname avatar")
        .sort({ createdAt: -1 });
    
    return votes;
};

export const getAdminApprovedWithdrawalRequests = async () => {
    const escrows = await Escrow.find({ request_status: "admin_approved" })
        .populate("campaign", "title goal_amount current_amount creator")
        .populate("requested_by", "username email fullname avatar")
        .populate("admin_reviewed_by", "username fullname")
        .sort({ createdAt: -1 });
    
    const escrowsWithVotingResults = await Promise.all(
        escrows.map(async (escrow) => {
            const votes = await Vote.find({ escrow: escrow._id });
            
            let totalApproveWeight = 0;
            let totalRejectWeight = 0;
            let approveCount = 0;
            let rejectCount = 0;
            
            votes.forEach(vote => {
                if (vote.value === "approve") {
                    totalApproveWeight += vote.vote_weight || 0;
                    approveCount++;
                } else if (vote.value === "reject") {
                    totalRejectWeight += vote.vote_weight || 0;
                    rejectCount++;
                }
            });
            
            const totalWeight = totalApproveWeight + totalRejectWeight;
            const approvePercentage = totalWeight > 0 ? (totalApproveWeight / totalWeight) * 100 : 0;
            const rejectPercentage = totalWeight > 0 ? (totalRejectWeight / totalWeight) * 100 : 0;
            
            return {
                ...escrow.toObject(),
                votingResults: {
                    totalVotes: votes.length,
                    approveCount,
                    rejectCount,
                    totalApproveWeight,
                    totalRejectWeight,
                    approvePercentage: approvePercentage.toFixed(2),
                    rejectPercentage: rejectPercentage.toFixed(2)
                }
            };
        })
    );
    
    return escrowsWithVotingResults;
};

export const initSepayWithdrawalPayment = async (escrowId, paymentMethod = 'BANK_TRANSFER') => {
    const escrow = await Escrow.findById(escrowId).populate("campaign");
    if (!escrow) {
        return {
            success: false,
            error: "ESCROW_NOT_FOUND",
            message: "Không tìm thấy withdrawal request"
        };
    }
    
    if (escrow.request_status !== "admin_approved") {
        return {
            success: false,
            error: "INVALID_STATUS",
            message: `Withdrawal request không ở trạng thái admin_approved. Hiện tại: ${escrow.request_status}`
        };
    }
    
    if (escrow.order_invoice_number) {
        return {
            success: false,
            error: "PAYMENT_ALREADY_INITIATED",
            message: "Payment đã được khởi tạo cho withdrawal request này"
        };
    }
    
    const orderInvoiceNumber = `WITHDRAWAL-${escrow._id}-${Date.now()}`;
    escrow.order_invoice_number = orderInvoiceNumber;
    escrow.sepay_payment_method = paymentMethod;
    await escrow.save();
    
    return {
        success: true,
        escrow: escrow,
        orderInvoiceNumber: orderInvoiceNumber
    };
};

export const getEscrowByOrderInvoice = async (orderInvoiceNumber) => {
    const escrow = await Escrow.findOne({ order_invoice_number: orderInvoiceNumber });
    return escrow;
};

const getUniqueDonorsByCampaign = async (campaignId) => {
    const uniqueDonors = await Donation.aggregate([
        {
            $match: {
                campaign: mongoose.Types.ObjectId.isValid(campaignId) 
                    ? new mongoose.Types.ObjectId(campaignId)
                    : campaignId,
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
    
    return uniqueDonors.map(d => d.donorId);
};

export const updateSepayWithdrawalStatus = async (orderInvoiceNumber, status, sepayData) => {
    const escrow = await Escrow.findOne({ order_invoice_number: orderInvoiceNumber }).populate("campaign");
    if (!escrow) {
        return null;
    }

    if (escrow.request_status === 'released') {
        return { escrow, campaign: escrow.campaign };
    }
    
    let newStatus = escrow.request_status;
    if (status === 'completed' && escrow.request_status === 'admin_approved') {
        newStatus = 'released';
    }
    
    const updateData = {
        sepay_response_data: sepayData
    };
    
    if (sepayData?.transaction_id) {
        updateData.sepay_transaction_id = sepayData.transaction_id;
    }
    
    if (newStatus === 'released') {
        updateData.released_at = new Date();
        escrow.request_status = 'released';
    }

    Object.assign(escrow, updateData);
    await escrow.save();
    
    const campaign = escrow.campaign;
    if (campaign && newStatus === 'released') {
        await redisClient.del(`campaign:${campaign._id}`);
        await redisClient.del('campaigns');
        
        try {
            await escrow.populate("requested_by", "username email fullname");
            const creator = escrow.requested_by;
            
            if (creator && creator.email) {
                try {
                    await mailerService.sendWithdrawalReleasedEmail(creator.email, {
                        username: creator.username || creator.fullname || 'Người dùng',
                        campaignTitle: campaign.title,
                        campaignId: campaign._id.toString(),
                        withdrawalAmount: escrow.withdrawal_request_amount
                    });
                } catch (emailError) {
                    console.error('[Withdrawal] Error sending email to creator:', emailError);
                }
            }
            
            const donorIds = await getUniqueDonorsByCampaign(campaign._id);
            
            if (donorIds.length > 0) {
                const notifications = donorIds.map(donorId => ({
                    receiver: donorId,
                    sender: creator._id,
                    type: 'withdrawal_released',
                    campaign: campaign._id,
                    message: `Chiến dịch "${campaign.title}" đã giải ngân thành công số tiền ${escrow.withdrawal_request_amount.toLocaleString('vi-VN')} VND`,
                    is_read: false
                }));
                
                const createdNotifications = await Notification.insertMany(notifications);
                
                for (let i = 0; i < createdNotifications.length; i++) {
                    try {
                        const notification = createdNotifications[i];
                        const donorId = donorIds[i];
                        
                        await redisClient.publish('notification:new', JSON.stringify({
                            recipientId: donorId.toString(),
                            notification: {
                                _id: notification._id.toString(),
                                type: 'withdrawal_released',
                                message: notifications[i].message,
                                sender: {
                                    _id: creator._id.toString(),
                                    username: creator.username,
                                    fullname: creator.fullname
                                },
                                campaign: {
                                    _id: campaign._id.toString(),
                                    title: campaign.title
                                },
                                is_read: false,
                                createdAt: notification.createdAt
                            }
                        }));
                    } catch (notifError) {
                        console.error('[Withdrawal] Error publishing notification:', notifError);
                    }
                }
                
                await redisClient.del(donorIds.map(id => `notifications:${id}`));
            }
        } catch (error) {
            console.error('[Withdrawal] Error sending email/notifications:', error);
        }
    }
    
    return { escrow, campaign };
};

import mongoose from "mongoose";
import Escrow from "../models/escrow.js";
import Campaign from "../models/campaign.js";
import Donation from "../models/donation.js";
import Vote from "../models/vote.js";
import { redisClient } from "../config/redis.js";

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
    
    const thresholdPercentage = 0.01;
    const thresholdAmount = campaign.goal_amount * thresholdPercentage;
    
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
            $match: {
                totalDonatedAmount: { $gte: thresholdAmount }
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
    
    escrow.request_status = "admin_approved";
    escrow.admin_reviewed_by = adminId;
    escrow.admin_reviewed_at = now;
    await escrow.save();
    
    // TODO: Tích hợp payment gateway để chuyển tiền
    // SePay hiện tại chỉ hỗ trợ nhận tiền từ donor, không có API để transfer money
    // Có thể cần tích hợp bank transfer API hoặc payment gateway khác
    // Tạm thời, giả sử payment thành công và update status thành "released"
    
    // Simulate payment success (TODO: Replace with actual payment gateway integration)
    try {
        // TODO: Implement actual payment transfer logic here
        // Example:
        // const paymentResult = await transferMoney({
        //     recipientBankAccount: campaign.creator.bank_account,
        //     amount: escrow.withdrawal_request_amount,
        //     ...
        // });
        
        // If payment successful:
        escrow.request_status = "released";
        escrow.released_at = new Date();
        await escrow.save();
        
        // Update campaign: trừ current_amount (hoặc maintain separate released_amount field)
        // Note: campaign.current_amount không nên trừ vì nó là tổng số tiền đã nhận
        // Có thể cần thêm field released_amount vào campaign model
        
    } catch (paymentError) {
        // Nếu payment failed, giữ nguyên status "admin_approved"
        console.error('Payment transfer failed:', paymentError);
        return {
            success: false,
            error: "PAYMENT_FAILED",
            message: "Chuyển tiền thất bại. Vui lòng thử lại sau.",
            escrow: escrow
        };
    }
    
    return {
        success: true,
        escrow: escrow,
        message: "Withdrawal request đã được approve và tiền đã được chuyển"
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

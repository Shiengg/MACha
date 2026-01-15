import mongoose from "mongoose";
import Escrow from "../models/escrow.js";
import Campaign from "../models/campaign.js";
import Donation from "../models/donation.js";
import Vote from "../models/vote.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import { redisClient } from "../config/redis.js";
import * as mailerService from "../utils/mailer.js";
import * as queueService from "./queue.service.js";
import { createJob, JOB_TYPES, JOB_SOURCE } from "../schemas/job.schema.js";
import { invalidateCampaignCache } from "./campaign.service.js";

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

export const cancelPendingWithdrawalRequests = async (campaignId) => {
    const cancelled = await Escrow.updateMany(
        {
            campaign: campaignId,
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

    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del("campaigns");

    return {
        success: true,
        cancelledCount: cancelled.modifiedCount
    };
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
    
    if (!["voting_in_progress", "voting_extended"].includes(escrow.request_status)) {
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
    
    // Check ngay sau khi vote: nếu reject > 50% donor thì trigger REJECTED_BY_COMMUNITY
    // Chỉ check khi vote là "reject" để tránh check không cần thiết
    if (value === "reject") {
        try {
            const totalDonors = eligibleVoters.length;
            const rejectVotes = await Vote.countDocuments({
                escrow: escrowId,
                value: "reject"
            });
            const rejectDonorPercentage = totalDonors > 0 ? (rejectVotes / totalDonors) * 100 : 0;
            
            // Nếu reject > 50% tổng donor, trigger evaluate để set REJECTED_BY_COMMUNITY
            if (rejectDonorPercentage > 50) {
                console.log(`[Submit Vote] Reject > 50% (${rejectDonorPercentage.toFixed(2)}%), triggering evaluate for escrow ${escrowId}`);
                
                // Reload escrow để đảm bảo có latest data
                const currentEscrow = await Escrow.findById(escrowId).populate("campaign");
                if (currentEscrow && ["voting_in_progress", "voting_extended"].includes(currentEscrow.request_status)) {
                    await evaluateVoteResults(escrowId);
                    console.log(`[Submit Vote] Escrow ${escrowId} set to REJECTED_BY_COMMUNITY`);
                }
            }
        } catch (evaluateError) {
            // Log error nhưng không fail vote submission
            console.error(`[Submit Vote] Error evaluating vote results after reject vote:`, evaluateError);
        }
    }
    
    return {
        success: true,
        vote: vote
    };
};

/**
 * Đánh giá kết quả vote và quyết định trạng thái escrow
 * Logic:
 * - Nếu reject > 50% tổng donor -> REJECTED_BY_COMMUNITY
 * - Nếu vote < 50% tổng donor -> giữ nguyên trạng thái để admin có thể gia hạn
 * - Ngược lại -> voting_completed (chờ admin review)
 */
export const evaluateVoteResults = async (escrowId) => {
    const escrow = await Escrow.findById(escrowId).populate("campaign");
    if (!escrow) {
        return {
            success: false,
            error: "ESCROW_NOT_FOUND"
        };
    }
    
    // Lấy tổng số donor của campaign
    const eligibleVoters = await getEligibleVoters(escrow.campaign._id.toString());
    const totalDonors = eligibleVoters.length;
    
    // Lấy tất cả votes
    const votes = await Vote.find({ escrow: escrowId });
    
    // Tính toán vote statistics
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
    
    const totalVotes = votes.length;
    const totalWeight = totalApproveWeight + totalRejectWeight;
    
    const approvePercentage = totalWeight > 0 ? (totalApproveWeight / totalWeight) * 100 : 0;
    const rejectPercentage = totalWeight > 0 ? (totalRejectWeight / totalWeight) * 100 : 0;
    
    // Tính % donor đã vote và % reject theo số lượng donor (không phải weight)
    const votePercentage = totalDonors > 0 ? (totalVotes / totalDonors) * 100 : 0;
    const rejectDonorPercentage = totalDonors > 0 ? (rejectCount / totalDonors) * 100 : 0;
    
    const voteSummary = {
        totalDonors,
        totalVotes,
        approveCount,
        rejectCount,
        totalApproveWeight,
        totalRejectWeight,
        approvePercentage: approvePercentage.toFixed(2),
        rejectPercentage: rejectPercentage.toFixed(2),
        votePercentage: votePercentage.toFixed(2),
        rejectDonorPercentage: rejectDonorPercentage.toFixed(2)
    };
    
    // CASE 2: Reject > 50% tổng donor -> REJECTED_BY_COMMUNITY
    if (rejectDonorPercentage > 50) {
        escrow.request_status = "rejected_by_community";
        escrow.community_rejected_at = new Date();
        await escrow.save();
        
        console.log(`[Vote Evaluation] Escrow ${escrowId} REJECTED_BY_COMMUNITY: ${rejectDonorPercentage.toFixed(2)}% donors rejected`);
        
        return {
            success: true,
            escrow,
            voteSummary,
            decision: "REJECTED_BY_COMMUNITY",
            reason: `Reject vote > 50% donors (${rejectDonorPercentage.toFixed(2)}%)`
        };
    }
    
    // CASE 1: Vote < 50% tổng donor -> giữ nguyên trạng thái để admin gia hạn
    // (không tự động chuyển sang voting_completed)
    if (votePercentage < 50) {
        console.log(`[Vote Evaluation] Escrow ${escrowId} INSUFFICIENT_VOTES: ${votePercentage.toFixed(2)}% donors voted (< 50%)`);
        
        return {
            success: true,
            escrow,
            voteSummary,
            decision: "INSUFFICIENT_VOTES",
            reason: `Vote < 50% donors (${votePercentage.toFixed(2)}%). Admin can extend voting period.`,
            canExtend: true
        };
    }
    
    // Trường hợp còn lại: vote đủ, không reject quá nhiều -> voting_completed
    escrow.request_status = "voting_completed";
    await escrow.save();
    
    console.log(`[Vote Evaluation] Escrow ${escrowId} VOTING_COMPLETED: ${votePercentage.toFixed(2)}% voted, ${approvePercentage.toFixed(2)}% approve`);
    
    return {
        success: true,
        escrow,
        voteSummary,
        decision: "VOTING_COMPLETED",
        reason: "Vote completed, waiting for admin review"
    };
};

/**
 * Legacy function - giữ lại để backward compatibility
 * Sử dụng evaluateVoteResults mới
 */
export const finalizeVotingResult = async (escrowId) => {
    const result = await evaluateVoteResults(escrowId);
    
    if (!result.success) {
        return result;
    }
    
    // Nếu là INSUFFICIENT_VOTES, vẫn set voting_completed để backward compatible
    // nhưng trong logic mới sẽ xử lý riêng
    if (result.decision === "INSUFFICIENT_VOTES") {
        // Giữ nguyên trạng thái voting_in_progress hoặc voting_extended
        // để admin có thể gia hạn
        return {
            success: true,
            escrow: result.escrow,
            voteSummary: result.voteSummary,
            canExtend: true
        };
    }
    
    return {
        success: true,
        escrow: result.escrow,
        voteSummary: result.voteSummary
    };
};


export const processExpiredVotingPeriods = async () => {
    const now = new Date();
    
    // Tìm các escrow đã hết thời gian vote (cả voting_in_progress và voting_extended)
    const expiredEscrows = await Escrow.find({
        request_status: { $in: ["voting_in_progress", "voting_extended"] },
        voting_end_date: { $lte: now }
    });
    
    const results = [];
    
    for (const escrow of expiredEscrows) {
        try {
            const result = await evaluateVoteResults(escrow._id.toString());
            
            results.push({
                escrowId: escrow._id.toString(),
                success: result.success,
                error: result.error,
                voteSummary: result.voteSummary,
                decision: result.decision,
                reason: result.reason,
                canExtend: result.canExtend || false
            });
            
            if (result.success) {
                if (result.decision === "REJECTED_BY_COMMUNITY") {
                    console.log(`[Voting] Escrow ${escrow._id} REJECTED_BY_COMMUNITY: ${result.voteSummary.rejectDonorPercentage}% donors rejected`);
                } else if (result.decision === "INSUFFICIENT_VOTES") {
                    console.log(`[Voting] Escrow ${escrow._id} INSUFFICIENT_VOTES: ${result.voteSummary.votePercentage}% donors voted (< 50%)`);
                } else {
                    console.log(`[Voting] Escrow ${escrow._id} VOTING_COMPLETED: ${result.voteSummary.approvePercentage}% approve`);
                }
            }
        } catch (error) {
            console.error(`[Voting] Error evaluating voting for escrow ${escrow._id}:`, error);
            results.push({
                escrowId: escrow._id.toString(),
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
};


export const getWithdrawalRequestsForReview = async (status = null) => {
    // Query cả voting_completed và rejected_by_community để admin xem
    const query = {};
    if (status) {
        query.request_status = status;
    } else {
        // Mặc định: hiển thị các escrow cần admin review
        query.request_status = { $in: ["voting_completed", "rejected_by_community"] };
    }
    
    const escrows = await Escrow.find(query)
        .populate("campaign", "title goal_amount current_amount creator status")
        .populate("requested_by", "username email fullname")
        .populate("voting_extended_by", "username fullname")
        .sort({ createdAt: -1 });
    
    // Tính voting results cho mỗi escrow
    const escrowsWithVotingResults = await Promise.all(
        escrows.map(async (escrow) => {
            // Lấy tổng số donor
            const eligibleVoters = await getEligibleVoters(escrow.campaign._id.toString());
            const totalDonors = eligibleVoters.length;
            
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
            
            const totalVotes = votes.length;
            const totalWeight = totalApproveWeight + totalRejectWeight;
            const approvePercentage = totalWeight > 0 ? (totalApproveWeight / totalWeight) * 100 : 0;
            const rejectPercentage = totalWeight > 0 ? (totalRejectWeight / totalWeight) * 100 : 0;
            
            // Tính % donor đã vote và % reject theo số lượng donor
            const votePercentage = totalDonors > 0 ? (totalVotes / totalDonors) * 100 : 0;
            const rejectDonorPercentage = totalDonors > 0 ? (rejectCount / totalDonors) * 100 : 0;
            
            // Tính progress cho mỗi escrow
            const progress = calculateEscrowProgress(escrow);
            
            // Xác định admin actions
            const now = new Date();
            const isExpired = escrow.voting_end_date && escrow.voting_end_date < now;
            
            // CASE 1: Vote < 50% → cho phép gia hạn
            const canExtend = (escrow.request_status === "voting_in_progress" || 
                              escrow.request_status === "voting_extended" || 
                              (escrow.request_status === "voting_completed" && votePercentage < 50)) &&
                             votePercentage < 50;
            
            // CASE 2: Reject > 50% → cho phép huỷ campaign
            const canCancel = escrow.request_status === "rejected_by_community" &&
                             escrow.campaign.status !== "cancelled";
            
            return {
                ...escrow.toObject(),
                votingResults: {
                    totalDonors,
                    totalVotes,
                    approveCount,
                    rejectCount,
                    totalApproveWeight,
                    totalRejectWeight,
                    approvePercentage: approvePercentage.toFixed(2),
                    rejectPercentage: rejectPercentage.toFixed(2),
                    votePercentage: votePercentage.toFixed(2),
                    rejectDonorPercentage: rejectDonorPercentage.toFixed(2)
                },
                escrow_progress: progress,
                adminActions: {
                    canExtend,
                    canCancel,
                    canApprove: escrow.request_status === "voting_completed",
                    canReject: escrow.request_status === "voting_completed"
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
    
    // Invalidate cache
    await redisClient.del(`campaign:${escrow.campaign._id}`);
    await redisClient.del('campaigns');
    await redisClient.del(`escrow:${escrowId}`);
    
    // Emit event ESCROW_APPROVED_BY_ADMIN để gửi notification cho tất cả donors
    // Chỉ emit nếu chưa được notify (idempotency)
    if (!escrow.admin_approved_notified_at) {
        try {
            // Lấy danh sách unique donors (chỉ những người đã donate thành công)
            const uniqueDonors = await Donation.aggregate([
                {
                    $match: {
                        campaign: escrow.campaign._id,
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
                console.log(`[Escrow Approval] Emitting ESCROW_APPROVED_BY_ADMIN event for escrow ${escrow._id}, campaign ${escrow.campaign._id}, ${donorIds.length} donors`);
                
                const job = createJob(
                    JOB_TYPES.ESCROW_APPROVED_BY_ADMIN,
                    {
                        escrowId: escrow._id.toString(),
                        campaignId: escrow.campaign._id.toString(),
                        campaignTitle: escrow.campaign.title,
                        withdrawalAmount: escrow.withdrawal_request_amount,
                        donorIds: donorIds // Pass donor IDs để worker không cần query DB
                    },
                    {
                        userId: adminId.toString(),
                        source: JOB_SOURCE.ADMIN,
                        requestId: `escrow-approved-${escrow._id}-${Date.now()}`
                    }
                );
                
                await queueService.pushJob(job);
                
                // Đánh dấu đã notify (idempotency)
                escrow.admin_approved_notified_at = new Date();
                await escrow.save();
                
                console.log(`[Escrow Approval] ✅ ESCROW_APPROVED_BY_ADMIN job queued successfully for escrow ${escrow._id}`);
            } else {
                console.log(`[Escrow Approval] ⚠️ No donors found for campaign ${escrow.campaign._id}, skipping notification`);
            }
        } catch (error) {
            // Log error nhưng không fail toàn bộ flow
            console.error(`[Escrow Approval] ❌ Error emitting ESCROW_APPROVED_BY_ADMIN event for escrow ${escrow._id}:`, error);
        }
    } else {
        console.log(`[Escrow Approval] ⚠️ Escrow ${escrow._id} already notified (admin_approved_notified_at: ${escrow.admin_approved_notified_at}), skipping`);
    }
    
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

/**
 * Admin gia hạn thời gian vote cho escrow
 * @param {string} escrowId - ID của escrow
 * @param {string} adminId - ID của admin
 * @param {number} extensionDays - Số ngày gia hạn (3 hoặc 5)
 * @returns {Promise<Object>} Result object
 */
export const extendVotingPeriod = async (escrowId, adminId, extensionDays) => {
    const requestId = `extend-vote-${escrowId}-${Date.now()}`;
    
    console.log(`[Extend Voting] Starting extend voting period`, {
        requestId,
        escrowId,
        adminId,
        extensionDays,
        timestamp: new Date().toISOString()
    });
    
    // Validate extension days
    if (![3, 5].includes(extensionDays)) {
        return {
            success: false,
            error: "INVALID_EXTENSION_DAYS",
            message: "Số ngày gia hạn phải là 3 hoặc 5"
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
    
    // Chỉ cho phép gia hạn khi:
    // - Đang ở trạng thái voting_in_progress hoặc voting_extended
    // - Hoặc đã hết thời gian vote nhưng chưa có đủ vote (<50% donor voted)
    const allowedStatuses = ["voting_in_progress", "voting_extended"];
    const now = new Date();
    const isExpired = escrow.voting_end_date && escrow.voting_end_date < now;
    
    if (!allowedStatuses.includes(escrow.request_status) && !isExpired) {
        return {
            success: false,
            error: "INVALID_STATUS",
            message: `Không thể gia hạn vote khi escrow ở trạng thái: ${escrow.request_status}`
        };
    }
    
    // Gia hạn thời gian vote
    const currentEndDate = escrow.voting_end_date || new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + extensionDays);
    
    escrow.voting_end_date = newEndDate;
    escrow.request_status = "voting_extended";
    escrow.voting_extended_count = (escrow.voting_extended_count || 0) + 1;
    escrow.last_extended_at = now;
    escrow.voting_extended_by = adminId;
    await escrow.save();
    
    console.log(`[Extend Voting] Voting period extended successfully`, {
        requestId,
        escrowId,
        extensionDays,
        newEndDate: newEndDate.toISOString(),
        extendedCount: escrow.voting_extended_count
    });
    
    // Invalidate cache
    await redisClient.del(`campaign:${escrow.campaign._id}`);
    await redisClient.del(`escrow:${escrowId}`);
    
    // Gửi notification cho tất cả donor về việc gia hạn
    try {
        const eligibleVoters = await getEligibleVoters(escrow.campaign._id.toString());
        const donorIds = eligibleVoters.map(v => v.donorId.toString());
        
        if (donorIds.length > 0) {
            const notifications = donorIds.map(donorId => ({
                receiver: donorId,
                sender: null, // System notification
                type: 'voting_extended',
                campaign: escrow.campaign._id,
                message: `Thời gian vote đã được gia hạn thêm ${extensionDays} ngày`,
                content: `Thời gian vote cho withdrawal request của campaign "${escrow.campaign.title}" đã được gia hạn thêm ${extensionDays} ngày. Hãy tham gia vote!`,
                is_read: false
            }));
            
            await Notification.insertMany(notifications);
            
            // Publish real-time notifications
            for (const notif of notifications) {
                try {
                    await redisClient.publish('notification:new', JSON.stringify({
                        recipientId: notif.receiver.toString(),
                        notification: {
                            type: 'voting_extended',
                            message: notif.message,
                            campaign: {
                                _id: escrow.campaign._id.toString(),
                                title: escrow.campaign.title
                            },
                            is_read: false,
                            createdAt: new Date()
                        }
                    }));
                } catch (publishError) {
                    console.error(`[Extend Voting] Error publishing notification to ${notif.receiver}:`, publishError);
                }
            }
            
            await redisClient.del(donorIds.map(id => `notifications:${id}`));
            
            console.log(`[Extend Voting] ✅ Notifications sent to ${donorIds.length} donors`);
        }
    } catch (notifError) {
        console.error(`[Extend Voting] ❌ Error sending notifications:`, notifError);
        // Không fail toàn bộ flow nếu notification lỗi
    }
    
    return {
        success: true,
        escrow,
        newEndDate: newEndDate.toISOString(),
        extensionDays,
        extendedCount: escrow.voting_extended_count
    };
};

/**
 * Admin huỷ campaign do bị từ chối bởi cộng đồng và khởi tạo refund
 * @param {string} escrowId - ID của escrow
 * @param {string} adminId - ID của admin
 * @returns {Promise<Object>} Result object
 */
export const cancelCampaignByCommunityRejection = async (escrowId, adminId) => {
    const requestId = `cancel-community-reject-${escrowId}-${Date.now()}`;
    
    console.log(`[Cancel Campaign] Starting cancel campaign by community rejection`, {
        requestId,
        escrowId,
        adminId,
        timestamp: new Date().toISOString()
    });
    
    const escrow = await Escrow.findById(escrowId).populate("campaign");
    if (!escrow) {
        return {
            success: false,
            error: "ESCROW_NOT_FOUND",
            message: "Không tìm thấy withdrawal request"
        };
    }
    
    if (escrow.request_status !== "rejected_by_community") {
        return {
            success: false,
            error: "INVALID_STATUS",
            message: `Escrow không ở trạng thái rejected_by_community. Hiện tại: ${escrow.request_status}`
        };
    }
    
    const campaignId = escrow.campaign._id.toString();
    const campaign = escrow.campaign;
    
    // Idempotency check: kiểm tra campaign đã bị cancel chưa
    if (campaign.status === "cancelled") {
        console.log(`[Cancel Campaign] Campaign ${campaignId} already cancelled (idempotency)`, {
            requestId,
            cancelledAt: campaign.cancelled_at
        });
        return {
            success: true,
            campaign,
            wasAlreadyCancelled: true,
            message: "Campaign đã bị huỷ trước đó"
        };
    }
    
    // Cancel campaign
    campaign.status = "cancelled";
    campaign.cancelled_at = new Date();
    campaign.cancellation_reason = "Campaign bị từ chối bởi cộng đồng (>50% donors reject withdrawal request)";
    await campaign.save();
    
    console.log(`[Cancel Campaign] Campaign ${campaignId} cancelled successfully`, {
        requestId,
        campaignId
    });
    
    // Cancel tất cả pending withdrawal requests của campaign
    await cancelPendingWithdrawalRequests(campaignId);
    
    // Invalidate cache
    await invalidateCampaignCache(campaignId, campaign.category, requestId, campaign.creator.toString());
    
    // Khởi tạo refund flow (reuse logic từ report.service)
    try {
        const refundServiceModule = await import('./refund.service.js');
        const escrowServiceModule = await import('./escrow.service.js');
        
        // Cancel pending withdrawal requests (đã làm ở trên, nhưng double-check)
        await escrowServiceModule.cancelPendingWithdrawalRequests(campaignId);
        
        // Process refund
        const refundResult = await refundServiceModule.processProportionalRefund(
            campaignId,
            adminId,
            "Campaign đã bị huỷ do cộng đồng từ chối withdrawal request (>50% donors reject)"
        );
        
        if (!refundResult.success) {
            console.error(`[Cancel Campaign] Refund failed: ${refundResult.error || refundResult.message}`, {
                requestId,
                campaignId
            });
            // Không throw error, chỉ log - campaign đã được cancel, refund có thể retry sau
        } else {
            console.log(`[Cancel Campaign] ✅ Refund processed successfully`, {
                requestId,
                campaignId,
                refundsCount: refundResult.refunds?.length || 0,
                totalRefunded: refundResult.totalRefunded || 0
            });
        }
        
        // Gửi notification và email cho tất cả donor
        try {
            const eligibleVoters = await getEligibleVoters(campaignId);
            const donorIds = eligibleVoters.map(v => v.donorId.toString());
            
            if (donorIds.length > 0) {
                // Tạo notifications
                const notifications = donorIds.map(donorId => ({
                    receiver: donorId,
                    sender: null, // System notification
                    type: 'campaign_cancelled',
                    campaign: campaign._id,
                    message: `Campaign đã bị huỷ do cộng đồng từ chối`,
                    content: `Campaign "${campaign.title}" đã bị huỷ do cộng đồng từ chối withdrawal request. Tiền donate sẽ được hoàn lại.`,
                    is_read: false
                }));
                
                await Notification.insertMany(notifications);
                
                // Publish real-time notifications
                for (const notif of notifications) {
                    try {
                        await redisClient.publish('notification:new', JSON.stringify({
                            recipientId: notif.receiver.toString(),
                            notification: {
                                type: 'campaign_cancelled',
                                message: notif.message,
                                campaign: {
                                    _id: campaign._id.toString(),
                                    title: campaign.title
                                },
                                is_read: false,
                                createdAt: new Date()
                            }
                        }));
                    } catch (publishError) {
                        console.error(`[Cancel Campaign] Error publishing notification:`, publishError);
                    }
                }
                
                await redisClient.del(donorIds.map(id => `notifications:${id}`));
                
                console.log(`[Cancel Campaign] ✅ Notifications sent to ${donorIds.length} donors`);
            }
        } catch (notifError) {
            console.error(`[Cancel Campaign] ❌ Error sending notifications:`, notifError);
        }
        
        return {
            success: true,
            campaign,
            refund: refundResult,
            requestId
        };
    } catch (error) {
        console.error(`[Cancel Campaign] ❌ Error processing refund:`, error);
        // Campaign đã được cancel, nhưng refund failed
        // Trả về success với warning
        return {
            success: true,
            campaign,
            refund: { success: false, error: error.message },
            warning: "Campaign đã bị huỷ nhưng refund processing có lỗi. Vui lòng kiểm tra và xử lý thủ công.",
            requestId
        };
    }
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
            
            // Tính progress cho mỗi escrow
            const progress = calculateEscrowProgress(escrow);
            
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
                },
                escrow_progress: progress
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
    
    // Tính progress
    const progress = calculateEscrowProgress(escrow);
    
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
        },
        escrow_progress: progress
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

/**
 * Tính toán progress steps cho escrow
 * @param {Object} escrow - Escrow object với request_status
 * @returns {Object} Progress object với current_status và steps[]
 */
export const calculateEscrowProgress = (escrow) => {
    if (!escrow || !escrow.request_status) {
        return null;
    }

    const status = escrow.request_status;
    
    // Định nghĩa các steps
    const allSteps = [
        { key: 'milestone_reached', label: 'Đạt mốc giải ngân', order: 1 },
        { key: 'community_voting', label: 'Cộng đồng bỏ phiếu', order: 2 },
        { key: 'admin_review', label: 'Admin duyệt', order: 3 },
        { key: 'owner_disbursement', label: 'Owner giải ngân', order: 4 },
        { key: 'completed', label: 'Hoàn tất', order: 5 }
    ];

    // Map status sang progress steps
    let steps = [];
    
    switch (status) {
        case 'pending_voting':
            // Escrow vừa được tạo, chưa bắt đầu vote
            steps = allSteps.map(step => {
                if (step.order === 1) {
                    return { ...step, state: 'DONE' };
                } else if (step.order === 2) {
                    return { ...step, state: 'WAITING' };
                } else {
                    return { ...step, state: 'WAITING' };
                }
            });
            break;
            
        case 'voting_in_progress':
            // Đang trong quá trình vote
            steps = allSteps.map(step => {
                if (step.order === 1) {
                    return { ...step, state: 'DONE' };
                } else if (step.order === 2) {
                    return { ...step, state: 'ACTIVE' };
                } else {
                    return { ...step, state: 'WAITING' };
                }
            });
            break;
            
        case 'voting_extended':
            // Đã gia hạn thời gian vote
            steps = allSteps.map(step => {
                if (step.order === 1) {
                    return { ...step, state: 'DONE' };
                } else if (step.order === 2) {
                    return { ...step, state: 'ACTIVE' };
                } else {
                    return { ...step, state: 'WAITING' };
                }
            });
            break;
            
        case 'voting_completed':
            // Vote xong, chờ admin duyệt
            steps = allSteps.map(step => {
                if (step.order <= 2) {
                    return { ...step, state: 'DONE' };
                } else if (step.order === 3) {
                    return { ...step, state: 'ACTIVE' };
                } else {
                    return { ...step, state: 'WAITING' };
                }
            });
            break;
            
        case 'admin_approved':
            // Admin đã duyệt, chờ owner giải ngân
            steps = allSteps.map(step => {
                if (step.order <= 3) {
                    return { ...step, state: 'DONE' };
                } else if (step.order === 4) {
                    return { ...step, state: 'ACTIVE' };
                } else {
                    return { ...step, state: 'WAITING' };
                }
            });
            break;
            
        case 'released':
            // Đã giải ngân hoàn tất
            steps = allSteps.map(step => ({
                ...step,
                state: 'DONE'
            }));
            break;
            
        case 'admin_rejected':
            // Admin từ chối
            steps = allSteps.map(step => {
                if (step.order <= 2) {
                    return { ...step, state: 'DONE' };
                } else if (step.order === 3) {
                    return { ...step, state: 'REJECTED' };
                } else {
                    return { ...step, state: 'CANCELLED' };
                }
            });
            break;
            
        case 'rejected_by_community':
            // Bị từ chối bởi cộng đồng (>50% reject)
            steps = allSteps.map(step => {
                if (step.order <= 2) {
                    return { ...step, state: 'DONE' };
                } else if (step.order === 2) {
                    return { ...step, state: 'REJECTED' }; // Community voting step bị reject
                } else {
                    return { ...step, state: 'CANCELLED' };
                }
            });
            break;
            
        case 'cancelled':
            // Đã hủy
            steps = allSteps.map(step => {
                if (step.order === 1) {
                    return { ...step, state: 'DONE' };
                } else {
                    return { ...step, state: 'CANCELLED' };
                }
            });
            break;
            
        default:
            // Unknown status
            steps = allSteps.map(step => ({
                ...step,
                state: 'WAITING'
            }));
    }

    return {
        current_status: status,
        steps: steps,
        // Thêm metadata hữu ích
        metadata: {
            voting_start_date: escrow.voting_start_date || null,
            voting_end_date: escrow.voting_end_date || null,
            admin_reviewed_at: escrow.admin_reviewed_at || null,
            released_at: escrow.released_at || null,
            milestone_percentage: escrow.milestone_percentage || null,
            voting_extended_count: escrow.voting_extended_count || 0,
            last_extended_at: escrow.last_extended_at || null,
            community_rejected_at: escrow.community_rejected_at || null
        }
    };
};

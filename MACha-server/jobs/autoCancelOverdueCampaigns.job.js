import cron from 'node-cron';
import Escrow from '../models/escrow.js';
import Campaign from '../models/campaign.js';
import User from '../models/user.js';
import { redisClient } from '../config/redis.js';
import { invalidateCampaignCache } from '../services/campaign.service.js';

/**
 * Auto-cancel campaigns nếu creator không update trạng thái sau 48h kể từ khi gửi email nhắc nhở
 * 
 * Điều kiện:
 * - Escrow có request_status = "released"
 * - update_warning_email_sent_at != null (đã gửi email nhắc nhở)
 * - update_fulfilled_at == null (chưa update)
 * - update_warning_email_sent_at + 48h <= now
 * - Campaign có status = "voting"
 * 
 * Hành động:
 * - Chuyển campaign.status = "cancelled"
 * - Set campaign.cancelled_at = now
 * - Set campaign.cancellation_reason = "Tự động hủy do creator không cập nhật trạng thái sau 48h kể từ khi nhận email nhắc nhở"
 * - KHÔNG ảnh hưởng đến escrow đã release (giữ nguyên trạng thái)
 */
const autoCancelOverdueCampaigns = async () => {
    const now = new Date();
    
    console.log(`[Auto-Cancel] Checking overdue campaigns for auto-cancel at ${now.toISOString()}`);
    
    try {
        // Tính thời điểm 48h trước (để tìm escrow đã gửi email nhắc nhở >= 48h trước)
        const fortyEightHoursAgo = new Date(now);
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
        
        // Query escrows cần auto-cancel:
        // - request_status = "released" (escrow đã release)
        // - update_warning_email_sent_at != null (đã gửi email nhắc nhở)
        // - update_fulfilled_at == null (chưa update)
        // - update_warning_email_sent_at <= fortyEightHoursAgo (đã qua 48h)
        const overdueEscrows = await Escrow.find({
            request_status: "released",
            update_warning_email_sent_at: { 
                $ne: null,
                $lte: fortyEightHoursAgo
            },
            update_fulfilled_at: null
        })
        .populate({
            path: "campaign",
            select: "_id title status creator"
        })
        .lean();

        if (overdueEscrows.length === 0) {
            console.log(`[Auto-Cancel] No overdue campaigns found for auto-cancel`);
            return {
                success: true,
                checked: 0,
                cancelled: 0,
                errors: 0
            };
        }

        console.log(`[Auto-Cancel] Found ${overdueEscrows.length} escrow(s) with overdue updates (>= 48h after warning email)`);

        let cancelledCount = 0;
        let errorCount = 0;
        const errors = [];
        const cancelledCampaignIds = new Set(); // Track campaigns đã cancelled để tránh duplicate

        // Process từng escrow
        for (const escrow of overdueEscrows) {
            try {
                // Validate: Escrow phải có campaign
                if (!escrow.campaign || !escrow.campaign._id) {
                    console.warn(`[Auto-Cancel] Escrow ${escrow._id} missing campaign, skipping`);
                    continue;
                }

                const campaignId = escrow.campaign._id;
                
                // Skip nếu campaign đã được cancelled trong lần chạy này
                if (cancelledCampaignIds.has(campaignId.toString())) {
                    console.log(`[Auto-Cancel] Campaign ${campaignId} already cancelled in this run, skipping escrow ${escrow._id}`);
                    continue;
                }

                // Load campaign để check status
                const campaign = await Campaign.findById(campaignId);
                if (!campaign) {
                    console.warn(`[Auto-Cancel] Campaign ${campaignId} not found for escrow ${escrow._id}, skipping`);
                    continue;
                }

                // Chỉ cancel nếu campaign đang ở trạng thái "voting"
                // (không cancel nếu đã cancelled, active, completed, etc.)
                if (campaign.status !== "voting") {
                    console.log(`[Auto-Cancel] Campaign ${campaignId} status is "${campaign.status}", not "voting". Skipping auto-cancel.`);
                    continue;
                }

                // Idempotency check: Nếu đã cancelled, skip
                if (campaign.status === "cancelled") {
                    console.log(`[Auto-Cancel] Campaign ${campaignId} already cancelled, skipping`);
                    cancelledCampaignIds.add(campaignId.toString());
                    continue;
                }

                // Auto-cancel campaign
                campaign.status = "cancelled";
                campaign.cancelled_at = now;
                campaign.cancellation_reason = "Tự động hủy do creator không cập nhật trạng thái sau 48h kể từ khi nhận email nhắc nhở";
                await campaign.save();

                cancelledCampaignIds.add(campaignId.toString());
                cancelledCount++;

                // Invalidate cache
                try {
                    await invalidateCampaignCache(
                        campaignId,
                        campaign.category,
                        `auto-cancel-${campaignId}-${Date.now()}`,
                        campaign.creator?.toString() || campaign.creator
                    );
                } catch (cacheError) {
                    console.error(`[Auto-Cancel] Error invalidating cache for campaign ${campaignId}:`, cacheError);
                    // Continue - cache error không fail toàn bộ flow
                }

                console.log(`[Auto-Cancel] ✅ Auto-cancelled campaign ${campaignId} (${campaign.title}) - escrow ${escrow._id} overdue >= 48h after warning email`);

            } catch (error) {
                errorCount++;
                const errorMsg = `Error processing escrow ${escrow._id} for auto-cancel: ${error.message}`;
                errors.push(errorMsg);
                console.error(`[Auto-Cancel] ❌ ${errorMsg}`, error);
                // Continue processing other escrows
            }
        }

        console.log(`[Auto-Cancel] Completed auto-cancel check: ${cancelledCount} campaigns cancelled, ${errorCount} errors`);

        return {
            success: true,
            checked: overdueEscrows.length,
            cancelled: cancelledCount,
            errors: errorCount,
            errorDetails: errors.length > 0 ? errors : undefined
        };

    } catch (error) {
        console.error(`[Auto-Cancel] ❌ Error checking overdue campaigns for auto-cancel:`, error);
        return {
            success: false,
            error: error.message,
            checked: 0,
            cancelled: 0,
            errors: 1
        };
    }
};

// Schedule: Chạy mỗi 6 giờ (0 */6 * * *)
// Format: minute hour day month dayOfWeek
// 0 */6 * * * = Mỗi 6 giờ, vào phút thứ 0 (00:00, 06:00, 12:00, 18:00)
cron.schedule("0 */6 * * *", async () => {
    console.log(`[Auto-Cancel] Starting scheduled auto-cancel check at ${new Date().toISOString()}`);
    try {
        const result = await autoCancelOverdueCampaigns();
        if (result.checked > 0) {
            console.log(`[Auto-Cancel] Scheduled check completed: ${result.cancelled} cancelled, ${result.errors} errors`);
        }
    } catch (error) {
        console.error('[Auto-Cancel] Error in scheduled auto-cancel check:', error);
    }
});

// Export function để có thể gọi thủ công (testing, admin tools, etc.)
export { autoCancelOverdueCampaigns };

console.log('✅ Background job "autoCancelOverdueCampaigns" scheduled: runs every 6 hours');


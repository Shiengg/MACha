import cron from 'node-cron';
import Escrow from '../models/escrow.js';
import Campaign from '../models/campaign.js';
import User from '../models/user.js';
import * as mailerService from '../utils/mailer.js';

/**
 * Background job: Kiểm tra các escrow đã released nhưng creator chưa cập nhật tiến độ
 * 
 * Logic:
 * - Query Escrow với điều kiện:
 *   - request_status = "released"
 *   - update_fulfilled_at == null (chưa có update hợp lệ)
 *   - update_required_by < now (đã quá hạn)
 *   - update_warning_email_sent_at == null (chưa gửi mail cảnh báo)
 * 
 * - Xử lý:
 *   - Gửi EMAIL CẢNH BÁO cho creator
 *   - Set update_warning_email_sent_at = now (idempotency - tránh gửi mail trùng)
 * 
 * Schedule: Chạy mỗi 6 giờ (0 */6 * * *)
 */

const checkOverduePostReleaseUpdates = async () => {
    const now = new Date();
    
    console.log(`[Cron] Checking overdue post-release updates at ${now.toISOString()}`);
    
    try {
        // Query escrows cần gửi cảnh báo
        const overdueEscrows = await Escrow.find({
            request_status: "released",
            update_fulfilled_at: null,
            update_required_by: { $lt: now },
            update_warning_email_sent_at: null
        })
        .populate({
            path: "campaign",
            select: "title creator"
        })
        .lean();

        if (overdueEscrows.length === 0) {
            console.log(`[Cron] No overdue post-release updates found`);
            return {
                success: true,
                checked: 0,
                warned: 0,
                errors: 0
            };
        }

        console.log(`[Cron] Found ${overdueEscrows.length} escrow(s) with overdue post-release updates`);

        let warnedCount = 0;
        let errorCount = 0;
        const errors = [];

        // Process từng escrow
        for (const escrow of overdueEscrows) {
            try {
                // Validate: Escrow phải có campaign và campaign phải có creator
                if (!escrow.campaign || !escrow.campaign.creator) {
                    console.warn(`[Cron] Escrow ${escrow._id} missing campaign or creator, skipping`);
                    continue;
                }

                // Get creator info
                const creator = await User.findById(escrow.campaign.creator)
                    .select("username email fullname")
                    .lean();

                if (!creator || !creator.email) {
                    console.warn(`[Cron] Creator ${escrow.campaign.creator} not found or no email for escrow ${escrow._id}, skipping`);
                    continue;
                }

                // Get milestone info để lấy commitment_days
                const campaign = await Campaign.findById(escrow.campaign._id)
                    .select("milestones")
                    .lean();

                if (!campaign || !campaign.milestones || campaign.milestones.length === 0) {
                    console.warn(`[Cron] Campaign ${escrow.campaign._id} missing milestones for escrow ${escrow._id}, skipping`);
                    continue;
                }

                const milestone = campaign.milestones.find(
                    m => m.percentage === escrow.milestone_percentage
                );

                if (!milestone || !milestone.commitment_days) {
                    console.warn(`[Cron] Milestone ${escrow.milestone_percentage}% not found or missing commitment_days for escrow ${escrow._id}, skipping`);
                    continue;
                }

                // Send warning email
                try {
                    await mailerService.sendPostReleaseUpdateWarningEmail(creator.email, {
                        username: creator.username || creator.fullname || 'Người dùng',
                        campaignTitle: escrow.campaign.title,
                        campaignId: escrow.campaign._id.toString(),
                        milestonePercentage: escrow.milestone_percentage || 'N/A',
                        commitmentDays: milestone.commitment_days,
                        updateRequiredBy: escrow.update_required_by
                    });

                    // Set update_warning_email_sent_at = now (idempotency)
                    await Escrow.updateOne(
                        { _id: escrow._id },
                        { $set: { update_warning_email_sent_at: now } }
                    );

                    warnedCount++;
                    console.log(`[Cron] ✅ Sent warning email to creator ${creator.email} for escrow ${escrow._id} (campaign: ${escrow.campaign.title}, milestone: ${escrow.milestone_percentage}%)`);

                } catch (emailError) {
                    errorCount++;
                    const errorMsg = `Failed to send warning email for escrow ${escrow._id}: ${emailError.message}`;
                    errors.push(errorMsg);
                    console.error(`[Cron] ❌ ${errorMsg}`, emailError);
                    // Continue processing other escrows
                }

            } catch (error) {
                errorCount++;
                const errorMsg = `Error processing escrow ${escrow._id}: ${error.message}`;
                errors.push(errorMsg);
                console.error(`[Cron] ❌ ${errorMsg}`, error);
                // Continue processing other escrows
            }
        }

        console.log(`[Cron] Completed checking overdue post-release updates: ${warnedCount} warned, ${errorCount} errors`);

        return {
            success: true,
            checked: overdueEscrows.length,
            warned: warnedCount,
            errors: errorCount,
            errorDetails: errors.length > 0 ? errors : undefined
        };

    } catch (error) {
        console.error(`[Cron] ❌ Error checking overdue post-release updates:`, error);
        return {
            success: false,
            error: error.message,
            checked: 0,
            warned: 0,
            errors: 1
        };
    }
};

// Schedule: Chạy mỗi 6 giờ (0 */6 * * *)
// Format: minute hour day month dayOfWeek
// 0 */6 * * * = Mỗi 6 giờ, vào phút thứ 0 (00:00, 06:00, 12:00, 18:00)
cron.schedule("0 */6 * * *", async () => {
    console.log(`[Cron] Starting scheduled check for overdue post-release updates at ${new Date().toISOString()}`);
    try {
        const result = await checkOverduePostReleaseUpdates();
        if (result.checked > 0) {
            console.log(`[Cron] Scheduled check completed: ${result.warned} warned, ${result.errors} errors`);
        }
    } catch (error) {
        console.error('[Cron] Error in scheduled check for overdue post-release updates:', error);
    }
});

// Export function để có thể gọi thủ công (testing, admin tools, etc.)
export { checkOverduePostReleaseUpdates };

console.log('✅ Background job "checkOverduePostReleaseUpdates" scheduled: runs every 6 hours');


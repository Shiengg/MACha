import cron from 'node-cron';
import * as escrowService from '../services/escrow.service.js';

// Chạy mỗi giờ để check các voting period đã kết thúc
cron.schedule("0 * * * *", async () => {
    console.log(`[Cron] Checking expired voting periods at ${new Date().toISOString()}`);
    try {
        const results = await escrowService.processExpiredVotingPeriods();
        if (results.length > 0) {
            console.log(`[Cron] Processed ${results.length} expired voting period(s)`);
        }
    } catch (error) {
        console.error('[Cron] Error processing expired voting periods:', error);
    }
});


import cron from 'node-cron';
import * as campaignService from '../services/campaign.service.js';

cron.schedule("0 0 * * *", async () => {
    console.log(`[Cron] Checking expired campaigns at ${new Date().toISOString()}`);
    try {
        const results = await campaignService.processExpiredCampaigns();
        if (results.length > 0) {
            const successCount = results.filter(r => r.success).length;
            console.log(`[Cron] Processed ${results.length} expired campaign(s), ${successCount} successful`);
        }
    } catch (error) {
        console.error('[Cron] Error processing expired campaigns:', error);
    }
});


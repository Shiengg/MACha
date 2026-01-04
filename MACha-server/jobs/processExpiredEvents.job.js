import cron from 'node-cron';
import * as eventService from '../services/event.service.js';

cron.schedule("*/10 * * * * *", async () => {
    console.log(`[Cron] Checking expired events at ${new Date().toISOString()}`);
    try {
        const results = await eventService.processExpiredEvents();
        if (results.length > 0) {
            const successCount = results.filter(r => r.success).length;
            console.log(`[Cron] Processed ${results.length} expired event(s), ${successCount} successful`);
        }
    } catch (error) {
        console.error('[Cron] Error processing expired events:', error);
    }
});


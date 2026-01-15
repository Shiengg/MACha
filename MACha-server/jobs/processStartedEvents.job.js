import cron from 'node-cron';
import * as eventService from '../services/event.service.js';

// Run every 5 minutes to check for events that just started
// Syntax: second minute hour day month weekday
cron.schedule("*/5 * * * *", async () => {
    console.log(`[Cron] Checking started events at ${new Date().toISOString()}`);
    try {
        const results = await eventService.processStartedEvents();
        if (results.length > 0) {
            const successCount = results.filter(r => r.success).length;
            const totalNotified = results.reduce((sum, r) => sum + (r.notifiedCount || 0), 0);
            console.log(`[Cron] Processed ${results.length} started event(s), ${successCount} successful, ${totalNotified} users notified`);
        } else {
            console.log(`[Cron] No started events found`);
        }
    } catch (error) {
        console.error('[Cron] Error processing started events:', error);
    }
});


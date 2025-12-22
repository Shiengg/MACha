import cron from 'node-cron';
import * as authService from '../services/auth.service.js';

cron.schedule("*/30 * * * * *", async () => {
    await authService.cleanupUnverifiedUsers();
    console.log("Cleanup unverified users job executed");
})
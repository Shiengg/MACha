import cron from 'node-cron';
import * as authService from '../services/auth.service.js';

cron.schedule("0 0 * * *", async () => {
    await authService.cleanupUnverifiedUsers();
})
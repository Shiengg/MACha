import { redisClient } from "../config/redis.js";

export const pushJob = async (job) => {
    await redisClient.lPush("job_queue", JSON.stringify(job));
}
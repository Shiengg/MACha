import { redisClient } from '../config/redis.js';

const ONLINE_TTL = 60;


export const setUserOnline = async (userId, socketId) => {
    try {
        const onlineKey = `user:online:${userId}`;
        await redisClient.setEx(onlineKey, ONLINE_TTL, socketId);
        return true;
    } catch (error) {
        console.error('Error setting user online:', error);
        return false;
    }
};

export const setUserOffline = async (userId) => {
    try {
        const onlineKey = `user:online:${userId}`;
        await redisClient.del(onlineKey);
        return true;
    } catch (error) {
        console.error('Error setting user offline:', error);
        return false;
    }
};

export const isUserOnline = async (userId) => {
    try {
        const onlineKey = `user:online:${userId}`;
        const result = await redisClient.exists(onlineKey);
        return result === 1;
    } catch (error) {
        console.error('Error checking user online status:', error);
        return false;
    }
};

export const refreshUserOnline = async (userId) => {
    try {
        const onlineKey = `user:online:${userId}`;
        const exists = await redisClient.exists(onlineKey);
        if (exists === 1) {
            await redisClient.expire(onlineKey, ONLINE_TTL);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error refreshing user online status:', error);
        return false;
    }
};

export const getUserSocketId = async (userId) => {
    try {
        const onlineKey = `user:online:${userId}`;
        return await redisClient.get(onlineKey);
    } catch (error) {
        console.error('Error getting user socket ID:', error);
        return null;
    }
};
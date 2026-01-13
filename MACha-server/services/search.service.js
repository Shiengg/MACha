import SearchKeywords from "../models/searchKeywords.js";
import SearchHistories from "../models/searchHistories.js";
import { redisClient } from "../config/redis.js";

const SEARCH_HISTORY_TTL = 300;
const MAX_HISTORY_ITEMS = 50;

const invalidateUserSearchCache = async (userId) => {
    const cacheKey = `search:history:${userId}`;
    await redisClient.del(cacheKey);
};

const normalizeQuery = (query) => {
    return query.trim().toLowerCase();
};

const parseSearchQuery = (query, searchType = "keyword") => {
    const trimmed = query.trim();
    
    if (trimmed.startsWith('#')) {
        const hashtagName = trimmed.substring(1).trim().toLowerCase();
        if (hashtagName) {
            return {
                keyword: hashtagName,
                type: "hashtag"
            };
        }
    }
    
    // Support explicit search type (e.g., USER_SEARCH)
    if (searchType === "USER_SEARCH") {
        return {
            keyword: trimmed.toLowerCase(),
            type: "USER_SEARCH"
        };
    }
    
    return {
        keyword: trimmed.toLowerCase(),
        type: "keyword"
    };
};

export const saveSearchHistory = async (userId, query, searchType = "keyword") => {
    try {
        if (!query || !query.trim()) {
            return { success: false, error: 'EMPTY_QUERY' };
        }

        const { keyword, type } = parseSearchQuery(query, searchType);

        let searchKeyword = await SearchKeywords.findOne({ keyword, type });

        if (!searchKeyword) {
            searchKeyword = await SearchKeywords.create({
                keyword,
                type,
                search_count: 0
            });
        }

        await SearchHistories.create({
            user: userId,
            keyword: searchKeyword._id,
            searchedAt: new Date()
        });

        searchKeyword.search_count += 1;
        await searchKeyword.save();

        await invalidateUserSearchCache(userId);

        const recentHistories = await SearchHistories.find({ user: userId })
            .sort({ searchedAt: -1 })
            .limit(MAX_HISTORY_ITEMS + 1);

        if (recentHistories.length > MAX_HISTORY_ITEMS) {
            const idsToDelete = recentHistories
                .slice(MAX_HISTORY_ITEMS)
                .map(h => h._id);
            
            await SearchHistories.deleteMany({ _id: { $in: idsToDelete } });
        }

        return { success: true, keywordId: searchKeyword._id };
    } catch (error) {
        console.error('Error saving search history:', error);
        return { success: false, error: 'SAVE_FAILED' };
    }
};

export const getSearchHistory = async (userId) => {
    try {
        const cacheKey = `search:history:${userId}`;
        
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return { success: true, history: JSON.parse(cached) };
        }

        const histories = await SearchHistories.find({ user: userId })
            .populate('keyword', 'keyword type')
            .sort({ searchedAt: -1 })
            .limit(MAX_HISTORY_ITEMS)
            .lean();

        const formattedHistory = histories.map(h => ({
            _id: h._id,
            keyword: h.keyword.keyword,
            type: h.keyword.type,
            searchedAt: h.searchedAt
        }));

        await redisClient.setEx(cacheKey, SEARCH_HISTORY_TTL, JSON.stringify(formattedHistory));

        return { success: true, history: formattedHistory };
    } catch (error) {
        console.error('Error getting search history:', error);
        return { success: false, error: 'FETCH_FAILED' };
    }
};

export const getAllSearchHistory = async (userId) => {
    try {
        const histories = await SearchHistories.find({ user: userId })
            .populate('keyword', 'keyword type')
            .sort({ searchedAt: -1 })
            .lean();

        const formattedHistory = histories.map(h => ({
            _id: h._id,
            keyword: h.keyword.keyword,
            type: h.keyword.type,
            searchedAt: h.searchedAt
        }));

        return { success: true, history: formattedHistory };
    } catch (error) {
        console.error('Error getting all search history:', error);
        return { success: false, error: 'FETCH_FAILED' };
    }
};

export const deleteSearchHistory = async (userId, historyIds) => {
    try {
        if (!Array.isArray(historyIds) || historyIds.length === 0) {
            return { success: false, error: 'INVALID_IDS' };
        }

        const result = await SearchHistories.deleteMany({
            _id: { $in: historyIds },
            user: userId
        });

        await invalidateUserSearchCache(userId);

        return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
        console.error('Error deleting search history:', error);
        return { success: false, error: 'DELETE_FAILED' };
    }
};

export const deleteAllSearchHistory = async (userId) => {
    try {
        const result = await SearchHistories.deleteMany({ user: userId });

        await invalidateUserSearchCache(userId);

        return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
        console.error('Error deleting all search history:', error);
        return { success: false, error: 'DELETE_FAILED' };
    }
};


import Campaign from "../models/campaign.js";
import axios from "axios";

const RECOMMENDED_URL = process.env.RECOMMENDED_URL;


export const getRecommendedCampaigns = async (userId, limit = 10) => {
    try {
        // Validate inputs
        if (!userId) {
            throw new Error("User ID is required");
        }

        if (!RECOMMENDED_URL) {
            console.warn("RECOMMENDED_URL not configured, falling back to random campaigns");
            return await getFallbackCampaigns(limit);
        }

        // Call recommendation service
        const response = await axios.post(
            RECOMMENDED_URL,
            {
                user_id: userId,
                limit: limit
            },
            {
                timeout: 5000, // 5 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        // Extract campaign IDs from response
        const { campaign_ids, strategy } = response.data;

        if (!campaign_ids || !Array.isArray(campaign_ids) || campaign_ids.length === 0) {
            console.warn("No campaign IDs returned from recommendation service, falling back");
            return await getFallbackCampaigns(limit);
        }

        // Fetch campaigns from database with the recommended order
        const campaigns = await Campaign.find({
            _id: { $in: campaign_ids },
            status: 'active' // Only return active campaigns
        })
            .populate("creator", "username fullname avatar")
            .populate("hashtag", "name")
            .lean();

        // Sort campaigns by the order returned from recommendation service
        const campaignMap = new Map(campaigns.map(c => [c._id.toString(), c]));
        const orderedCampaigns = campaign_ids
            .map(id => campaignMap.get(id.toString()))
            .filter(Boolean); // Filter out null/undefined (campaigns not found or not active)

        // If we got fewer campaigns than expected, fill with random active campaigns
        if (orderedCampaigns.length < limit) {
            const existingIds = orderedCampaigns.map(c => c._id.toString());
            const additionalCampaigns = await Campaign.find({
                _id: { $nin: campaign_ids },
                status: 'active'
            })
                .populate("creator", "username fullname avatar")
                .populate("hashtag", "name")
                .limit(limit - orderedCampaigns.length)
                .lean();

            orderedCampaigns.push(...additionalCampaigns);
        }

        return {
            campaigns: orderedCampaigns,
            strategy: strategy || 'unknown',
            count: orderedCampaigns.length
        };

    } catch (error) {
        console.error("Error fetching recommended campaigns:", error.message);
        
        // Fallback to random campaigns if recommendation service fails
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.warn("Recommendation service unavailable, using fallback");
        }
        
        return await getFallbackCampaigns(limit);
    }
};

/**
 * Fallback function to return random active campaigns
 * Used when recommendation service is unavailable or returns no results
 * @param {number} limit - Number of campaigns to return
 * @returns {Promise<Object>} Object with campaigns array and metadata
 */
const getFallbackCampaigns = async (limit = 10) => {
    try {
        const campaigns = await Campaign.aggregate([
            { $match: { status: 'active' } },
            { $sample: { size: limit } }
        ]);

        // Populate the campaigns
        const populatedCampaigns = await Campaign.populate(campaigns, [
            { path: "creator", select: "username fullname avatar" },
            { path: "hashtag", select: "name" }
        ]);

        return {
            campaigns: populatedCampaigns,
            strategy: 'fallback_random',
            count: populatedCampaigns.length
        };
    } catch (error) {
        console.error("Error in fallback campaigns:", error.message);
        return {
            campaigns: [],
            strategy: 'fallback_error',
            count: 0
        };
    }
};

/**
 * Get recommended campaigns for anonymous users (not logged in)
 * Returns popular/trending campaigns
 * @param {number} limit - Number of campaigns to return
 * @returns {Promise<Object>} Object with campaigns array and metadata
 */
export const getAnonymousRecommendations = async (limit = 10) => {
    try {
        // For anonymous users, return most popular campaigns
        // (campaigns with highest donation amounts or most recent)
        const campaigns = await Campaign.find({ status: 'active' })
            .populate("creator", "username fullname avatar")
            .populate("hashtag", "name")
            .sort({ current_amount: -1, createdAt: -1 }) // Sort by donation amount and recency
            .limit(limit)
            .lean();

        return {
            campaigns,
            strategy: 'anonymous_popular',
            count: campaigns.length
        };
    } catch (error) {
        console.error("Error fetching anonymous recommendations:", error.message);
        return {
            campaigns: [],
            strategy: 'anonymous_error',
            count: 0
        };
    }
};


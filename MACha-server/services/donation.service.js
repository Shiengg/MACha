import Donation from "../models/donation.js";
import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";

export const createDonation = async (campaignId, donorId, donationData) => {
    const { amount, currency, donation_method, is_anonymous } = donationData;
    
    // Check if campaign exists
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return null;
    }
    
    // Create donation
    const donation = await Donation.create({
        campaign: campaignId,
        donor: donorId,
        amount,
        currency,
        donation_method,
        is_anonymous,
    });
    
    // Update campaign current_amount
    campaign.current_amount += amount;
    await campaign.save();
    
    // Invalidate cache
    await redisClient.del(`donations:${campaignId}`);
    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del('campaigns');
    
    return { donation, campaign };
}

export const getDonationsByCampaign = async (campaignId) => {
    const donationKey = `donations:${campaignId}`;
    
    // Check cache
    const cached = await redisClient.get(donationKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database
    const donations = await Donation.find({ campaign: campaignId })
        .populate("donor", "username avatar_url")
        .sort({ created_at: -1 });
    
    // Save to cache (TTL: 5 minutes)
    await redisClient.setEx(donationKey, 300, JSON.stringify(donations));
    
    return donations;
}
import Donation from "../models/donation.js";
import Campaign from "../models/campaign.js";
import { HTTP_STATUS } from "../utils/status.js";

export const createDonation = async (req, res) => {
    try {
        const id = req.params.campaignId;
        const { amount, currency, donation_method, is_anonymous } = req.body;

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" })
        }

        const donation = await Donation.create({
            campaign: id,
            donor: req.user._id,
            amount,
            currency,
            donation_method,
            is_anonymous,
        })

        campaign.current_amount += amount;
        await campaign.save();

        res.status(HTTP_STATUS.CREATED).json({ donation });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getDonationsByCampaign = async (req, res) => {
    try {
        const donations = await Donation.find({ campaign: req.params.campaignId })
            .populate("donor", "username avatar_url")
            .sort({ created_at: -1 });
        res.status(HTTP_STATUS.OK).json(donations);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
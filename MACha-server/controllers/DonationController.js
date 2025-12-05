import { HTTP_STATUS } from "../utils/status.js";
import * as donationService from "../services/donation.service.js";

export const createDonation = async (req, res) => {
    try {
        const campaignId = req.params.campaignId;
        const donorId = req.user._id;
        const donationData = req.body;

        const result = await donationService.createDonation(campaignId, donorId, donationData);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" });
        }

        res.status(HTTP_STATUS.CREATED).json({ donation: result.donation });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getDonationsByCampaign = async (req, res) => {
    try {
        const donations = await donationService.getDonationsByCampaign(req.params.campaignId);
        
        res.status(HTTP_STATUS.OK).json(donations);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
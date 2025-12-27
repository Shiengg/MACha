import * as campaignUpdateService from "../services/campaignUpdate.service.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const createCampaignUpdate = async (req, res) => {
    try {
        const campaignId = req.params.campaignId;
        const userId = req.user._id;
        const { content, image_url } = req.body;

        const result = await campaignUpdateService.createCampaignUpdate(
            campaignId,
            userId,
            { content, image_url }
        );

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Campaign not found"
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    message: HTTP_STATUS_TEXT.FORBIDDEN
                });
            }
            if (result.error === 'VALIDATION_ERROR') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
        }

        return res.status(HTTP_STATUS.CREATED).json({ update: result.update });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getCampaignUpdates = async (req, res) => {
    try {
        const campaignId = req.params.campaignId;
        const updates = await campaignUpdateService.getCampaignUpdates(campaignId);

        res.status(HTTP_STATUS.OK).json({
            count: updates.length,
            updates
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteCampaignUpdate = async (req, res) => {
    try {
        const updateId = req.params.updateId;
        const userId = req.user._id;

        const result = await campaignUpdateService.deleteCampaignUpdate(updateId, userId);

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Update not found"
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    message: HTTP_STATUS_TEXT.FORBIDDEN
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Update deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};


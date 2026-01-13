import { Router } from "express";
import * as CampaignCompanionController from "../controllers/CampaignCompanionController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const campaignCompanionRoutes = Router();

campaignCompanionRoutes.post(
    '/campaigns/:campaignId/companion/join',
    authMiddleware,
    RateLimitMiddleware.rateLimitByUserId(10, 60),
    CampaignCompanionController.join
);

campaignCompanionRoutes.delete(
    '/campaigns/:campaignId/companion/leave',
    authMiddleware,
    RateLimitMiddleware.rateLimitByUserId(10, 60),
    CampaignCompanionController.leave
);

campaignCompanionRoutes.get(
    '/campaigns/:campaignId/companions',
    RateLimitMiddleware.rateLimitByIP(100, 60),
    CampaignCompanionController.getCampaignCompanions
);

campaignCompanionRoutes.get(
    '/users/:userId/companion-campaigns',
    RateLimitMiddleware.rateLimitByIP(100, 60),
    CampaignCompanionController.getUserCompanionCampaigns
);

export default campaignCompanionRoutes;


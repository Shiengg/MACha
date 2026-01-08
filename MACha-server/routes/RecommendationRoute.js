import { Router } from "express";
import {
    getRecommendedCampaigns,
    getAnonymousRecommendations
} from "../controllers/RecommendationController.js";
import { optionalAuthMiddleware } from "../middlewares/authMiddleware.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const recommendationRoutes = Router();

// Get recommended campaigns (works for both authenticated and anonymous users)
recommendationRoutes.get(
    '/',
    optionalAuthMiddleware,
    getRecommendedCampaigns
);

// Get recommendations for anonymous users (public)
recommendationRoutes.get(
    '/anonymous',
    getAnonymousRecommendations
);

/**
 * @swagger
 * components:
 *   schemas:
 *     RecommendationResponse:
 *       type: object
 *       properties:
 *         campaigns:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CampaignResponse'
 *           description: Array of recommended campaigns
 *         strategy:
 *           type: string
 *           description: The recommendation strategy used
 *           enum:
 *             - onboarding_interest
 *             - user_based
 *             - content_based
 *             - hybrid
 *             - fallback_random
 *             - anonymous_popular
 *           example: "onboarding_interest"
 *         count:
 *           type: number
 *           description: Number of campaigns returned
 *           example: 10
 */

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get recommended campaigns
 *     description: |
 *       Get personalized campaign recommendations for the current user.
 *       - For authenticated users: Returns personalized recommendations based on user behavior and interests
 *       - For anonymous users: Returns popular/trending campaigns
 *       
 *       The recommendation service uses various strategies including:
 *       - onboarding_interest: Based on user's selected interests during onboarding
 *       - user_based: Collaborative filtering based on similar users
 *       - content_based: Based on campaign similarity
 *       - hybrid: Combination of multiple strategies
 *       - fallback_random: Random active campaigns when service is unavailable
 *       - anonymous_popular: Popular campaigns for non-authenticated users
 *     tags:
 *       - Recommendations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of recommendations to return (1-50, default 10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *           example: 10
 *     responses:
 *       200:
 *         description: Recommended campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecommendationResponse'
 *             examples:
 *               authenticated_user:
 *                 summary: Recommendations for authenticated user
 *                 value:
 *                   campaigns:
 *                     - _id: "695d374bfcaf1b878f8488b9"
 *                       creator:
 *                         _id: "695bddbc127fc9be4831a5a5"
 *                         username: "john_doe"
 *                         avatar: "https://example.com/avatar.jpg"
 *                       title: "Help Children in Need"
 *                       description: "Supporting underprivileged children"
 *                       goal_amount: 50000000
 *                       current_amount: 15000000
 *                       status: "active"
 *                       category: "children"
 *                   strategy: "onboarding_interest"
 *                   count: 10
 *               anonymous_user:
 *                 summary: Recommendations for anonymous user
 *                 value:
 *                   campaigns:
 *                     - _id: "695d374bfcaf1b878f8488b9"
 *                       title: "Emergency Relief Fund"
 *                       goal_amount: 100000000
 *                       current_amount: 75000000
 *                       status: "active"
 *                   strategy: "anonymous_popular"
 *                   count: 10
 *               fallback:
 *                 summary: Fallback when recommendation service unavailable
 *                 value:
 *                   campaigns:
 *                     - _id: "695d374bfcaf1b878f8488b9"
 *                       title: "Medical Support Campaign"
 *                       status: "active"
 *                   strategy: "fallback_random"
 *                   count: 10
 *       400:
 *         description: Bad request - Invalid limit parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Limit must be between 1 and 50"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to get recommended campaigns"
 */

/**
 * @swagger
 * /api/recommendations/anonymous:
 *   get:
 *     summary: Get recommendations for anonymous users
 *     description: |
 *       Get popular/trending campaigns for users who are not logged in.
 *       Returns campaigns sorted by popularity (donation amount and recency).
 *     tags:
 *       - Recommendations
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of recommendations to return (1-50, default 10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *           example: 10
 *     responses:
 *       200:
 *         description: Popular campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecommendationResponse'
 *             examples:
 *               success:
 *                 value:
 *                   campaigns:
 *                     - _id: "695d374bfcaf1b878f8488b9"
 *                       title: "Emergency Disaster Relief"
 *                       goal_amount: 100000000
 *                       current_amount: 80000000
 *                       status: "active"
 *                       category: "disaster"
 *                   strategy: "anonymous_popular"
 *                   count: 10
 *       400:
 *         description: Bad request - Invalid limit parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Limit must be between 1 and 50"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to get recommended campaigns"
 */

export default recommendationRoutes;


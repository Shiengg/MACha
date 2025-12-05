import { Router } from "express";
import { getAllCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign, cancelCampaign } from "../controllers/CampaignController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const campaignRoutes = Router();

campaignRoutes.get('/', RateLimitMiddleware.rateLimitByIP(100, 60), getAllCampaigns);
campaignRoutes.get('/:id', RateLimitMiddleware.rateLimitByIP(100, 60), getCampaignById);
campaignRoutes.post('/', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), createCampaign);
campaignRoutes.patch('/:id', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), updateCampaign);
campaignRoutes.delete('/:id', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), deleteCampaign);
campaignRoutes.post('/:id/cancel', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), cancelCampaign);

/**
 * @swagger
 * components:
 *   schemas:
 *     CampaignCreator:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Creator's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e9"
 *         username:
 *           type: string
 *           description: Creator's username
 *           example: "john_doe"
 *         avatar:
 *           type: string
 *           description: Creator's avatar URL
 *           example: "https://example.com/avatar.jpg"
 *     
 *     CreateCampaignRequest:
 *       type: object
 *       required:
 *         - title
 *         - goal_amount
 *         - current_amount
 *         - start_date
 *       properties:
 *         title:
 *           type: string
 *           description: Campaign title
 *           example: "Help Build Clean Water Wells in Rural Vietnam"
 *         description:
 *           type: string
 *           description: Detailed campaign description
 *           example: "We are raising funds to build clean water wells in remote villages in Vietnam. Your donation will directly help provide access to clean drinking water for families in need."
 *         goal_amount:
 *           type: number
 *           description: Target fundraising amount
 *           example: 50000000
 *         current_amount:
 *           type: number
 *           description: Current raised amount
 *           example: 0
 *         start_date:
 *           type: string
 *           format: date
 *           description: Campaign start date
 *           example: "2023-08-01"
 *         end_date:
 *           type: string
 *           format: date
 *           description: Campaign end date (optional)
 *           example: "2023-12-31"
 *         status:
 *           type: string
 *           enum: ["active", "completed", "cancelled"]
 *           description: Campaign status
 *           example: "active"
 *         proof_documents_url:
 *           type: string
 *           description: URL to proof documents
 *           example: "https://example.com/documents/campaign-proof.pdf"
 *       additionalProperties: false
 *     
 *     UpdateCampaignRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Campaign title
 *           example: "Help Build Clean Water Wells in Rural Vietnam - Updated"
 *         description:
 *           type: string
 *           description: Detailed campaign description
 *           example: "Updated description with more details about the project progress"
 *         goal_amount:
 *           type: number
 *           description: Target fundraising amount
 *           example: 60000000
 *         current_amount:
 *           type: number
 *           description: Current raised amount
 *           example: 15000000
 *         end_date:
 *           type: string
 *           format: date
 *           description: Campaign end date
 *           example: "2024-03-31"
 *         status:
 *           type: string
 *           enum: ["active", "completed", "cancelled"]
 *           description: Campaign status
 *           example: "active"
 *         proof_documents_url:
 *           type: string
 *           description: URL to proof documents
 *           example: "https://example.com/documents/updated-proof.pdf"
 *       additionalProperties: false
 *     
 *     CampaignResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Campaign's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         creator:
 *           oneOf:
 *             - type: string
 *               description: Creator ID (when not populated)
 *               example: "64a7b8c9d1e2f3a4b5c6d7e9"
 *             - $ref: '#/components/schemas/CampaignCreator'
 *         title:
 *           type: string
 *           description: Campaign title
 *           example: "Help Build Clean Water Wells in Rural Vietnam"
 *         description:
 *           type: string
 *           description: Campaign description
 *           example: "We are raising funds to build clean water wells in remote villages in Vietnam."
 *         goal_amount:
 *           type: number
 *           description: Target fundraising amount
 *           example: 50000000
 *         current_amount:
 *           type: number
 *           description: Current raised amount
 *           example: 15000000
 *         start_date:
 *           type: string
 *           format: date-time
 *           description: Campaign start date
 *           example: "2023-08-01T00:00:00.000Z"
 *         end_date:
 *           type: string
 *           format: date-time
 *           description: Campaign end date
 *           example: "2023-12-31T23:59:59.000Z"
 *         status:
 *           type: string
 *           enum: ["active", "completed", "cancelled"]
 *           description: Campaign status
 *           example: "active"
 *         proof_documents_url:
 *           type: string
 *           description: URL to proof documents
 *           example: "https://example.com/documents/campaign-proof.pdf"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Campaign creation timestamp
 *           example: "2023-07-25T14:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Campaign last update timestamp
 *           example: "2023-07-25T14:30:00.000Z"
 *     
 *     GetAllCampaignsResponse:
 *       type: object
 *       properties:
 *         campaigns:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CampaignResponse'
 *           description: List of all campaigns
 *     
 *     GetCampaignByIdResponse:
 *       type: object
 *       properties:
 *         campaign:
 *           $ref: '#/components/schemas/CampaignResponse'
 *     
 *     CreateCampaignResponse:
 *       type: object
 *       properties:
 *         campaign:
 *           $ref: '#/components/schemas/CampaignResponse'
 */

/**
 * @swagger
 * /api/campaigns/:
 *   get:
 *     summary: Get all campaigns
 *     description: Retrieves all fundraising campaigns from the platform. Each campaign includes populated creator information (username and avatar) for display purposes.
 *     tags:
 *       - Campaigns
 *     responses:
 *       200:
 *         description: Campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetAllCampaignsResponse'
 *             examples:
 *               multiple_campaigns:
 *                 summary: Multiple active campaigns
 *                 value:
 *                   campaigns:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                       creator:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                         username: "alice_charity"
 *                         avatar: "https://example.com/alice-avatar.jpg"
 *                       title: "Help Build Clean Water Wells in Rural Vietnam"
 *                       description: "We are raising funds to build clean water wells in remote villages in Vietnam."
 *                       goal_amount: 50000000
 *                       current_amount: 15000000
 *                       start_date: "2023-08-01T00:00:00.000Z"
 *                       end_date: "2023-12-31T23:59:59.000Z"
 *                       status: "active"
 *                       proof_documents_url: "https://example.com/documents/water-wells-proof.pdf"
 *                       createdAt: "2023-07-25T14:30:00.000Z"
 *                       updatedAt: "2023-07-25T14:30:00.000Z"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                       creator:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                         username: "bob_education"
 *                         avatar: "https://example.com/bob-avatar.jpg"
 *                       title: "Scholarships for Underprivileged Students"
 *                       description: "Providing educational opportunities for students from low-income families."
 *                       goal_amount: 30000000
 *                       current_amount: 8500000
 *                       start_date: "2023-07-15T00:00:00.000Z"
 *                       end_date: "2023-11-30T23:59:59.000Z"
 *                       status: "active"
 *                       proof_documents_url: "https://example.com/documents/education-proof.pdf"
 *                       createdAt: "2023-07-15T10:20:00.000Z"
 *                       updatedAt: "2023-07-20T16:45:00.000Z"
 *               empty_campaigns:
 *                 summary: No campaigns available
 *                 value:
 *                   campaigns: []
 *               single_campaign:
 *                 summary: Single campaign available
 *                 value:
 *                   campaigns:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                       creator:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                         username: "charlie_medical"
 *                         avatar: null
 *                       title: "Emergency Medical Fund for Children"
 *                       description: "Supporting children who need urgent medical treatment but cannot afford it."
 *                       goal_amount: 100000000
 *                       current_amount: 25000000
 *                       start_date: "2023-06-01T00:00:00.000Z"
 *                       end_date: null
 *                       status: "active"
 *                       proof_documents_url: "https://example.com/documents/medical-proof.pdf"
 *                       createdAt: "2023-06-01T08:00:00.000Z"
 *                       updatedAt: "2023-07-25T12:30:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error occurred"
 *             examples:
 *               database_error:
 *                 summary: Database connection or query error
 *                 value:
 *                   message: "Database connection failed"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while retrieving campaigns"
 */

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Get a specific campaign by ID
 *     description: Retrieves a single campaign by its unique identifier. The campaign includes populated creator information (username) for display purposes.
 *     tags:
 *       - Campaigns
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier of the campaign to retrieve
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Campaign retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCampaignByIdResponse'
 *             examples:
 *               active_campaign:
 *                 summary: Active fundraising campaign
 *                 value:
 *                   campaign:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     creator:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "alice_charity"
 *                     title: "Help Build Clean Water Wells in Rural Vietnam"
 *                     description: "We are raising funds to build clean water wells in remote villages in Vietnam. Your donation will directly help provide access to clean drinking water for families in need."
 *                     goal_amount: 50000000
 *                     current_amount: 15000000
 *                     start_date: "2023-08-01T00:00:00.000Z"
 *                     end_date: "2023-12-31T23:59:59.000Z"
 *                     status: "active"
 *                     proof_documents_url: "https://example.com/documents/water-wells-proof.pdf"
 *                     createdAt: "2023-07-25T14:30:00.000Z"
 *                     updatedAt: "2023-07-25T14:30:00.000Z"
 *               completed_campaign:
 *                 summary: Successfully completed campaign
 *                 value:
 *                   campaign:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     creator:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                       username: "bob_education"
 *                     title: "Scholarships for Underprivileged Students"
 *                     description: "Providing educational opportunities for students from low-income families."
 *                     goal_amount: 30000000
 *                     current_amount: 30000000
 *                     start_date: "2023-07-15T00:00:00.000Z"
 *                     end_date: "2023-11-30T23:59:59.000Z"
 *                     status: "completed"
 *                     proof_documents_url: "https://example.com/documents/education-proof.pdf"
 *                     createdAt: "2023-07-15T10:20:00.000Z"
 *                     updatedAt: "2023-11-25T18:30:00.000Z"
 *       400:
 *         description: Bad request - Invalid campaign ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid campaign ID format"
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"Campaign\""
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign not found"
 *             examples:
 *               campaign_not_found:
 *                 summary: Campaign with given ID doesn't exist
 *                 value:
 *                   message: "Campaign not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error occurred"
 *             examples:
 *               database_error:
 *                 summary: Database connection or query error
 *                 value:
 *                   message: "Database connection failed"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while retrieving the campaign"
 */

/**
 * @swagger
 * /api/campaigns/:
 *   post:
 *     summary: Create a new campaign
 *     description: Creates a new fundraising campaign. The authenticated user becomes the creator of the campaign. All required fields must be provided.
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCampaignRequest'
 *           examples:
 *             water_wells_campaign:
 *               summary: Clean water wells campaign
 *               value:
 *                 title: "Help Build Clean Water Wells in Rural Vietnam"
 *                 description: "We are raising funds to build clean water wells in remote villages in Vietnam. Your donation will directly help provide access to clean drinking water for families in need."
 *                 goal_amount: 50000000
 *                 current_amount: 0
 *                 start_date: "2023-08-01"
 *                 end_date: "2023-12-31"
 *                 status: "active"
 *                 proof_documents_url: "https://example.com/documents/water-wells-proof.pdf"
 *             education_campaign:
 *               summary: Education scholarship campaign
 *               value:
 *                 title: "Scholarships for Underprivileged Students"
 *                 description: "Providing educational opportunities for students from low-income families through scholarships and educational support."
 *                 goal_amount: 30000000
 *                 current_amount: 0
 *                 start_date: "2023-09-01"
 *                 end_date: "2024-06-30"
 *                 proof_documents_url: "https://example.com/documents/education-proof.pdf"
 *             medical_campaign:
 *               summary: Emergency medical fund campaign
 *               value:
 *                 title: "Emergency Medical Fund for Children"
 *                 description: "Supporting children who need urgent medical treatment but cannot afford it. Every donation saves lives."
 *                 goal_amount: 100000000
 *                 current_amount: 0
 *                 start_date: "2023-08-15"
 *                 proof_documents_url: "https://example.com/documents/medical-proof.pdf"
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateCampaignResponse'
 *             examples:
 *               successful_creation:
 *                 summary: Campaign created successfully
 *                 value:
 *                   campaign:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     creator: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     title: "Help Build Clean Water Wells in Rural Vietnam"
 *                     description: "We are raising funds to build clean water wells in remote villages in Vietnam."
 *                     goal_amount: 50000000
 *                     current_amount: 0
 *                     start_date: "2023-08-01T00:00:00.000Z"
 *                     end_date: "2023-12-31T00:00:00.000Z"
 *                     status: "active"
 *                     proof_documents_url: "https://example.com/documents/water-wells-proof.pdf"
 *                     createdAt: "2023-07-25T14:30:00.000Z"
 *                     updatedAt: "2023-07-25T14:30:00.000Z"
 *       400:
 *         description: Bad request - Missing required fields or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Validation error: required fields missing"
 *             examples:
 *               missing_title:
 *                 summary: Missing campaign title
 *                 value:
 *                   message: "Campaign validation failed: title: Path `title` is required."
 *               missing_goal_amount:
 *                 summary: Missing goal amount
 *                 value:
 *                   message: "Campaign validation failed: goal_amount: Path `goal_amount` is required."
 *               invalid_status:
 *                 summary: Invalid status value
 *                 value:
 *                   message: "Campaign validation failed: status: `invalid_status` is not a valid enum value for path `status`."
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Invalid or expired token"
 *             examples:
 *               missing_token:
 *                 summary: Missing Authorization header
 *                 value:
 *                   message: "Unauthorized: Invalid or expired token"
 *               invalid_token:
 *                 summary: Invalid JWT token
 *                 value:
 *                   message: "Invalid or expired token"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error occurred"
 *             examples:
 *               database_error:
 *                 summary: Database connection or query error
 *                 value:
 *                   message: "Database connection failed"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while creating the campaign"
 */

/**
 * @swagger
 * /api/campaigns/{id}:
 *   patch:
 *     summary: Update a specific campaign by ID
 *     description: Updates an existing campaign by its unique identifier. Only the campaign creator or authorized users can update the campaign. Partial updates are supported.
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier of the campaign to update
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCampaignRequest'
 *           examples:
 *             update_description:
 *               summary: Update campaign description and goal
 *               value:
 *                 description: "Updated description with more details about the project progress and impact."
 *                 goal_amount: 60000000
 *             update_status:
 *               summary: Mark campaign as completed
 *               value:
 *                 status: "completed"
 *                 current_amount: 50000000
 *             extend_deadline:
 *               summary: Extend campaign deadline
 *               value:
 *                 end_date: "2024-06-30"
 *             add_proof_documents:
 *               summary: Add proof documents
 *               value:
 *                 proof_documents_url: "https://example.com/documents/updated-proof.pdf"
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignResponse'
 *             examples:
 *               successful_update:
 *                 summary: Campaign updated successfully
 *                 value:
 *                   _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                   creator: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                   title: "Help Build Clean Water Wells in Rural Vietnam"
 *                   description: "Updated description with more details about the project progress and impact."
 *                   goal_amount: 60000000
 *                   current_amount: 15000000
 *                   start_date: "2023-08-01T00:00:00.000Z"
 *                   end_date: "2024-06-30T00:00:00.000Z"
 *                   status: "active"
 *                   proof_documents_url: "https://example.com/documents/updated-proof.pdf"
 *                   createdAt: "2023-07-25T14:30:00.000Z"
 *                   updatedAt: "2023-08-15T10:45:00.000Z"
 *               completed_campaign:
 *                 summary: Campaign marked as completed
 *                 value:
 *                   _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                   creator: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                   title: "Scholarships for Underprivileged Students"
 *                   description: "Providing educational opportunities for students from low-income families."
 *                   goal_amount: 30000000
 *                   current_amount: 30000000
 *                   start_date: "2023-07-15T00:00:00.000Z"
 *                   end_date: "2023-11-30T23:59:59.000Z"
 *                   status: "completed"
 *                   proof_documents_url: "https://example.com/documents/education-proof.pdf"
 *                   createdAt: "2023-07-15T10:20:00.000Z"
 *                   updatedAt: "2023-11-25T18:30:00.000Z"
 *       400:
 *         description: Bad request - Invalid campaign ID format or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"Campaign\""
 *               invalid_status:
 *                 summary: Invalid status value
 *                 value:
 *                   message: "Campaign validation failed: status: `invalid_status` is not a valid enum value for path `status`."
 *               negative_amount:
 *                 summary: Invalid amount value
 *                 value:
 *                   message: "Campaign validation failed: goal_amount: Path `goal_amount` must be a positive number."
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Invalid or expired token"
 *             examples:
 *               missing_token:
 *                 summary: Missing Authorization header
 *                 value:
 *                   message: "Unauthorized: Invalid or expired token"
 *               invalid_token:
 *                 summary: Invalid JWT token
 *                 value:
 *                   message: "Invalid or expired token"
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign not found"
 *             examples:
 *               campaign_not_found:
 *                 summary: Campaign with given ID doesn't exist
 *                 value:
 *                   message: "Campaign not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error occurred"
 *             examples:
 *               database_error:
 *                 summary: Database connection or query error
 *                 value:
 *                   message: "Database connection failed"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while updating the campaign"
 */

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Delete a specific campaign by ID
 *     description: Deletes a campaign by its unique identifier. Only the campaign creator or authorized users can delete the campaign. This operation is irreversible.
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier of the campaign to delete
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign deleted"
 *             examples:
 *               successful_deletion:
 *                 summary: Campaign deleted successfully
 *                 value:
 *                   message: "Campaign deleted"
 *       400:
 *         description: Bad request - Invalid campaign ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid campaign ID format"
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"Campaign\""
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Invalid or expired token"
 *             examples:
 *               missing_token:
 *                 summary: Missing Authorization header
 *                 value:
 *                   message: "Unauthorized: Invalid or expired token"
 *               invalid_token:
 *                 summary: Invalid JWT token
 *                 value:
 *                   message: "Invalid or expired token"
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign not found"
 *             examples:
 *               campaign_not_found:
 *                 summary: Campaign with given ID doesn't exist
 *                 value:
 *                   message: "Campaign not found"
 *               already_deleted:
 *                 summary: Campaign was already deleted
 *                 value:
 *                   message: "Campaign not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error occurred"
 *             examples:
 *               database_error:
 *                 summary: Database connection or query error
 *                 value:
 *                   message: "Database connection failed"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while deleting the campaign"
 */

export default campaignRoutes;
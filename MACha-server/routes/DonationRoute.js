import { Router } from "express";
import { createDonation, getDonationsByCampaign } from "../controllers/DonationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const donationRoutes = Router();

donationRoutes.post('/:campaignId/donate', authMiddleware, createDonation);
donationRoutes.get('/:campaignId/donations', getDonationsByCampaign);

/**
 * @swagger
 * components:
 *   schemas:
 *     DonorInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Donor's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e9"
 *         username:
 *           type: string
 *           description: Donor's username
 *           example: "john_donor"
 *         avatar_url:
 *           type: string
 *           description: Donor's avatar URL
 *           example: "https://example.com/john-avatar.jpg"
 *     
 *     CreateDonationRequest:
 *       type: object
 *       required:
 *         - amount
 *         - donation_method
 *       properties:
 *         amount:
 *           type: number
 *           description: Donation amount
 *           minimum: 1
 *           example: 500000
 *         currency:
 *           type: string
 *           description: Currency code
 *           default: "VND"
 *           example: "VND"
 *         donation_method:
 *           type: string
 *           enum: ["bank_transfer", "crypto", "cash"]
 *           description: Method of donation
 *           example: "bank_transfer"
 *         blockchain_tx_hash:
 *           type: string
 *           description: Blockchain transaction hash (required for crypto donations)
 *           example: "0x1234567890abcdef1234567890abcdef12345678"
 *         is_anonymous:
 *           type: boolean
 *           description: Whether the donation should be anonymous
 *           default: false
 *           example: false
 *       additionalProperties: false
 *     
 *     DonationResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Donation's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         campaign:
 *           type: string
 *           description: Campaign ID that received the donation
 *           example: "64a7b8c9d1e2f3a4b5c6d7ea"
 *         donor:
 *           oneOf:
 *             - type: string
 *               description: Donor ID (when not populated)
 *               example: "64a7b8c9d1e2f3a4b5c6d7e9"
 *             - $ref: '#/components/schemas/DonorInfo'
 *         amount:
 *           type: number
 *           description: Donation amount
 *           example: 500000
 *         currency:
 *           type: string
 *           description: Currency code
 *           example: "VND"
 *         donation_method:
 *           type: string
 *           enum: ["bank_transfer", "crypto", "cash"]
 *           description: Method of donation
 *           example: "bank_transfer"
 *         blockchain_tx_hash:
 *           type: string
 *           description: Blockchain transaction hash (for crypto donations)
 *           example: "0x1234567890abcdef1234567890abcdef12345678"
 *         is_anonymous:
 *           type: boolean
 *           description: Whether the donation is anonymous
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Donation creation timestamp
 *           example: "2023-07-25T14:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Donation last update timestamp
 *           example: "2023-07-25T14:30:00.000Z"
 *     
 *     CreateDonationResponse:
 *       type: object
 *       properties:
 *         donation:
 *           $ref: '#/components/schemas/DonationResponse'
 *     
 *     GetDonationsResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/DonationResponse'
 *       description: List of donations for a campaign sorted by creation date (newest first)
 */

/**
 * @swagger
 * /api/donations/{campaignId}/donate:
 *   post:
 *     summary: Create a new donation for a campaign
 *     description: Creates a new donation for the specified campaign. The authenticated user becomes the donor. The campaign's current_amount will be automatically updated with the donation amount.
 *     tags:
 *       - Donations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         description: The unique identifier of the campaign to donate to
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "64a7b8c9d1e2f3a4b5c6d7ea"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDonationRequest'
 *           examples:
 *             bank_transfer_donation:
 *               summary: Bank transfer donation
 *               value:
 *                 amount: 500000
 *                 currency: "VND"
 *                 donation_method: "bank_transfer"
 *                 is_anonymous: false
 *             crypto_donation:
 *               summary: Cryptocurrency donation
 *               value:
 *                 amount: 1000000
 *                 currency: "VND"
 *                 donation_method: "crypto"
 *                 blockchain_tx_hash: "0x1234567890abcdef1234567890abcdef12345678"
 *                 is_anonymous: false
 *             anonymous_donation:
 *               summary: Anonymous cash donation
 *               value:
 *                 amount: 200000
 *                 currency: "VND"
 *                 donation_method: "cash"
 *                 is_anonymous: true
 *             large_donation:
 *               summary: Large bank transfer donation
 *               value:
 *                 amount: 5000000
 *                 currency: "VND"
 *                 donation_method: "bank_transfer"
 *                 is_anonymous: false
 *     responses:
 *       201:
 *         description: Donation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateDonationResponse'
 *             examples:
 *               successful_donation:
 *                 summary: Donation created successfully
 *                 value:
 *                   donation:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     amount: 500000
 *                     currency: "VND"
 *                     donation_method: "bank_transfer"
 *                     blockchain_tx_hash: null
 *                     is_anonymous: false
 *                     createdAt: "2023-07-25T14:30:00.000Z"
 *                     updatedAt: "2023-07-25T14:30:00.000Z"
 *               crypto_donation_success:
 *                 summary: Crypto donation created successfully
 *                 value:
 *                   donation:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     amount: 1000000
 *                     currency: "VND"
 *                     donation_method: "crypto"
 *                     blockchain_tx_hash: "0x1234567890abcdef1234567890abcdef12345678"
 *                     is_anonymous: false
 *                     createdAt: "2023-07-25T15:45:00.000Z"
 *                     updatedAt: "2023-07-25T15:45:00.000Z"
 *               anonymous_donation_success:
 *                 summary: Anonymous donation created successfully
 *                 value:
 *                   donation:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     amount: 200000
 *                     currency: "VND"
 *                     donation_method: "cash"
 *                     blockchain_tx_hash: null
 *                     is_anonymous: true
 *                     createdAt: "2023-07-25T16:20:00.000Z"
 *                     updatedAt: "2023-07-25T16:20:00.000Z"
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
 *               missing_amount:
 *                 summary: Missing donation amount
 *                 value:
 *                   message: "Donation validation failed: amount: Path `amount` is required."
 *               missing_donation_method:
 *                 summary: Missing donation method
 *                 value:
 *                   message: "Donation validation failed: donation_method: Path `donation_method` is required."
 *               invalid_donation_method:
 *                 summary: Invalid donation method
 *                 value:
 *                   message: "Donation validation failed: donation_method: `invalid_method` is not a valid enum value for path `donation_method`."
 *               invalid_amount:
 *                 summary: Invalid donation amount
 *                 value:
 *                   message: "Donation validation failed: amount: Path `amount` must be a positive number."
 *               invalid_campaign_id:
 *                 summary: Invalid campaign ID format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"campaign\" for model \"Donation\""
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
 *               expired_token:
 *                 summary: Expired JWT token
 *                 value:
 *                   message: "Token has expired"
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
 *               deleted_campaign:
 *                 summary: Campaign was deleted or cancelled
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
 *               campaign_update_error:
 *                 summary: Error updating campaign amount
 *                 value:
 *                   message: "Failed to update campaign current_amount"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while processing the donation"
 */

/**
 * @swagger
 * /api/donations/{campaignId}/donations:
 *   get:
 *     summary: Get all donations for a specific campaign
 *     description: Retrieves all donations made to a specific campaign. Donations are sorted by creation date (newest first). Each donation includes populated donor information (username and avatar) unless the donation is anonymous.
 *     tags:
 *       - Donations
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         description: The unique identifier of the campaign to get donations for
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "64a7b8c9d1e2f3a4b5c6d7ea"
 *     responses:
 *       200:
 *         description: Donations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetDonationsResponse'
 *             examples:
 *               multiple_donations:
 *                 summary: Multiple donations with various methods
 *                 value:
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "alice_generous"
 *                       avatar_url: "https://example.com/alice-avatar.jpg"
 *                     amount: 1000000
 *                     currency: "VND"
 *                     donation_method: "bank_transfer"
 *                     blockchain_tx_hash: null
 *                     is_anonymous: false
 *                     createdAt: "2023-07-25T16:30:00.000Z"
 *                     updatedAt: "2023-07-25T16:30:00.000Z"
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                       username: "bob_crypto"
 *                       avatar_url: "https://example.com/bob-avatar.jpg"
 *                     amount: 2000000
 *                     currency: "VND"
 *                     donation_method: "crypto"
 *                     blockchain_tx_hash: "0x1234567890abcdef1234567890abcdef12345678"
 *                     is_anonymous: false
 *                     createdAt: "2023-07-25T15:45:00.000Z"
 *                     updatedAt: "2023-07-25T15:45:00.000Z"
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7ef"
 *                       username: "charlie_helper"
 *                       avatar_url: null
 *                     amount: 500000
 *                     currency: "VND"
 *                     donation_method: "cash"
 *                     blockchain_tx_hash: null
 *                     is_anonymous: true
 *                     createdAt: "2023-07-25T14:20:00.000Z"
 *                     updatedAt: "2023-07-25T14:20:00.000Z"
 *               no_donations:
 *                 summary: No donations found for campaign
 *                 value: []
 *               single_donation:
 *                 summary: Single donation for campaign
 *                 value:
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7ee"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7f0"
 *                       username: "diana_supporter"
 *                       avatar_url: "https://example.com/diana-avatar.jpg"
 *                     amount: 750000
 *                     currency: "VND"
 *                     donation_method: "bank_transfer"
 *                     blockchain_tx_hash: null
 *                     is_anonymous: false
 *                     createdAt: "2023-07-25T13:15:00.000Z"
 *                     updatedAt: "2023-07-25T13:15:00.000Z"
 *               anonymous_donations:
 *                 summary: Mix of anonymous and public donations
 *                 value:
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7f1"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7f2"
 *                       username: "eve_public"
 *                       avatar_url: "https://example.com/eve-avatar.jpg"
 *                     amount: 300000
 *                     currency: "VND"
 *                     donation_method: "bank_transfer"
 *                     blockchain_tx_hash: null
 *                     is_anonymous: false
 *                     createdAt: "2023-07-25T12:30:00.000Z"
 *                     updatedAt: "2023-07-25T12:30:00.000Z"
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7f3"
 *                     campaign: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     donor:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7f4"
 *                       username: "frank_anonymous"
 *                       avatar_url: "https://example.com/frank-avatar.jpg"
 *                     amount: 1500000
 *                     currency: "VND"
 *                     donation_method: "crypto"
 *                     blockchain_tx_hash: "0xabcdef1234567890abcdef1234567890abcdef12"
 *                     is_anonymous: true
 *                     createdAt: "2023-07-25T11:45:00.000Z"
 *                     updatedAt: "2023-07-25T11:45:00.000Z"
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
 *               invalid_campaign_id:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"campaign\" for model \"Donation\""
 *               malformed_id:
 *                 summary: Malformed ID parameter
 *                 value:
 *                   message: "Invalid campaign ID format"
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
 *               population_error:
 *                 summary: Error populating donor information
 *                 value:
 *                   message: "Failed to populate donor information"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while retrieving donations"
 */

export default donationRoutes;
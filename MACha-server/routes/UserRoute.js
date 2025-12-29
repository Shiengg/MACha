import { Router } from "express";
import { 
    getAllUsers,
    getUserById, 
    followUser, 
    unfollowUser, 
    getFollowers, 
    getFollowing, 
    searchUsers
} from "../controllers/UserController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const userRoutes = Router();

userRoutes.get('/', authMiddleware, checkRole('admin'), getAllUsers);
userRoutes.get('/search', authMiddleware, searchUsers);
userRoutes.get('/:id', authMiddleware, getUserById);
userRoutes.post('/:id/follow', authMiddleware, followUser);
userRoutes.post('/:id/unfollow', authMiddleware, unfollowUser);
userRoutes.get('/:id/follower', authMiddleware, getFollowers);
userRoutes.get('/:id/following', authMiddleware, getFollowing);

/**
 * @swagger
 * components:
 *   schemas:
 *     FollowUserResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: "Followed successfully."
 *         following:
 *           type: string
 *           description: ID of the user that was followed
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     
 *     FollowErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: "You can't follow your own account."
 *     
 *     UnfollowUserResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: "Successfully unfollowed."
 *     
 *     UnfollowErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: "We couldn't find the user you want to unfollow."
 *     
 *     FollowerInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Follower's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         username:
 *           type: string
 *           description: Follower's username
 *           example: "john_doe"
 *         full_name:
 *           type: string
 *           description: Follower's full name
 *           example: "John Doe"
 *         avatar:
 *           type: string
 *           description: Follower's avatar URL
 *           example: "https://example.com/avatar.jpg"
 *     
 *     GetFollowersResponse:
 *       type: object
 *       properties:
 *         count:
 *           type: number
 *           description: Total number of followers
 *           example: 150
 *         followers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FollowerInfo'
 *           description: List of followers with basic information
 *     
 *     FollowingInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Following user's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         username:
 *           type: string
 *           description: Following user's username
 *           example: "jane_doe"
 *         full_name:
 *           type: string
 *           description: Following user's full name
 *           example: "Jane Doe"
 *         avatar:
 *           type: string
 *           description: Following user's avatar URL
 *           example: "https://example.com/jane-avatar.jpg"
 *     
 *     GetFollowingResponse:
 *       type: object
 *       properties:
 *         count:
 *           type: number
 *           description: Total number of users being followed
 *           example: 75
 *         following:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FollowingInfo'
 *           description: List of users being followed with basic information
 *     
 *     SearchUserResult:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         username:
 *           type: string
 *           description: User's username
 *           example: "john_doe"
 *         full_name:
 *           type: string
 *           description: User's full name
 *           example: "John Doe"
 *         avatar:
 *           type: string
 *           description: User's avatar URL
 *           example: "https://example.com/john-avatar.jpg"
 *         bio:
 *           type: string
 *           description: User's biography
 *           example: "Software developer passionate about AI"
 *     
 *     SearchUsersResponse:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SearchUserResult'
 *           description: List of users matching the search query
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     KYCDocuments:
 *       type: object
 *       properties:
 *         identity_front_url:
 *           type: string
 *           description: URL to identity card front image
 *           example: "https://s3.amazonaws.com/bucket/user123/cccd_front.jpg"
 *         identity_back_url:
 *           type: string
 *           description: URL to identity card back image
 *           example: "https://s3.amazonaws.com/bucket/user123/cccd_back.jpg"
 *         selfie_url:
 *           type: string
 *           description: URL to selfie with identity card
 *           example: "https://s3.amazonaws.com/bucket/user123/selfie.jpg"
 *         tax_document_url:
 *           type: string
 *           description: URL to tax document
 *           example: "https://s3.amazonaws.com/bucket/user123/tax.pdf"
 *         bank_statement_url:
 *           type: string
 *           description: URL to bank statement
 *           example: "https://s3.amazonaws.com/bucket/user123/bank.pdf"
 *     
 *     SubmitKYCRequest:
 *       type: object
 *       required:
 *         - identity_verified_name
 *         - identity_card_last4
 *       properties:
 *         identity_verified_name:
 *           type: string
 *           description: Full name from identity card
 *           example: "Nguyễn Văn A"
 *         identity_card_last4:
 *           type: string
 *           description: Last 4 digits of identity card
 *           example: "1234"
 *         tax_code:
 *           type: string
 *           description: Tax identification number
 *           example: "0123456789"
 *         address:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *               example: "Hà Nội"
 *             district:
 *               type: string
 *               example: "Hoàn Kiếm"
 *         bank_account:
 *           type: object
 *           properties:
 *             bank_name:
 *               type: string
 *               example: "Vietcombank"
 *             account_number_last4:
 *               type: string
 *               example: "5678"
 *             account_holder_name:
 *               type: string
 *               example: "NGUYEN VAN A"
 *         kyc_documents:
 *           $ref: '#/components/schemas/KYCDocuments'
 *     
 *     KYCStatusResponse:
 *       type: object
 *       properties:
 *         kyc_status:
 *           type: string
 *           enum: ["unverified", "pending", "verified", "rejected"]
 *           example: "pending"
 *         kyc_submitted_at:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         kyc_verified_at:
 *           type: string
 *           format: date-time
 *           example: "2024-01-16T14:20:00.000Z"
 *         kyc_rejection_reason:
 *           type: string
 *           example: "Identity card image is not clear"

/**
 * @swagger
 * /api/users/kyc/submit:
 *   post:
 *     summary: Submit KYC verification
 *     description: User submits KYC documents and information for admin verification. Rate limited to 5 submissions per hour.
 *     tags:
 *       - Users
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitKYCRequest'
 *     responses:
 *       200:
 *         description: KYC submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "KYC submitted successfully. Please wait for admin review."
 *                 user:
 *                   type: object
 *       400:
 *         description: Bad request - Already verified, pending, or missing fields
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/kyc/status:
 *   get:
 *     summary: Get own KYC status
 *     description: Retrieve the current KYC verification status for the authenticated user
 *     tags:
 *       - Users
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KYCStatusResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/kyc/pending:
 *   get:
 *     summary: Get all pending KYC submissions (Admin only)
 *     description: Retrieve list of all users with pending KYC verification
 *     tags:
 *       - Users
 *       - KYC
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending KYCs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   example: 5
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/kyc/{id}/details:
 *   get:
 *     summary: Get KYC details for specific user (Admin only)
 *     description: Retrieve detailed KYC information including documents for a specific user
 *     tags:
 *       - Users
 *       - KYC
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: KYC details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 kyc_info:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found or no KYC data
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/kyc/{id}/approve:
 *   post:
 *     summary: Approve KYC verification (Admin only)
 *     description: Admin approves a pending KYC submission, allowing user to create campaigns
 *     tags:
 *       - Users
 *       - KYC
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: KYC approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "KYC approved successfully"
 *                 user:
 *                   type: object
 *       400:
 *         description: Invalid status - Can only approve pending KYCs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/kyc/{id}/reject:
 *   post:
 *     summary: Reject KYC verification (Admin only)
 *     description: Admin rejects a pending KYC submission with a reason
 *     tags:
 *       - Users
 *       - KYC
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *                 example: "Identity card image is not clear, please upload again"
 *     responses:
 *       200:
 *         description: KYC rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "KYC rejected successfully"
 *                 user:
 *                   type: object
 *       400:
 *         description: Invalid status or missing reason
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/{id}/follow:
 *   post:
 *     summary: Follow a user
 *     description: Allows the authenticated user to follow another user by their ID. Updates both users' following/followers lists and counts.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the user to follow
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: User followed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowUserResponse'
 *             examples:
 *               successful_follow:
 *                 summary: Successfully followed a user
 *                 value:
 *                   message: "Followed successfully."
 *                   following: "64a7b8c9d1e2f3a4b5c6d7e8"
 *       400:
 *         description: Bad request - Various validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowErrorResponse'
 *             examples:
 *               self_follow:
 *                 summary: Trying to follow own account
 *                 value:
 *                   message: "You can't follow your own account.."
 *               user_not_found:
 *                 summary: Target user does not exist
 *                 value:
 *                   message: "We couldn't find the user you want to follow."
 *               already_following:
 *                 summary: Already following this user
 *                 value:
 *                   message: "You're already following this person."
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
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
 *               server_error:
 *                 summary: Database or server error
 *                 value:
 *                   message: "Database connection failed"
 */

/**
 * @swagger
 * /api/users/{id}/unfollow:
 *   post:
 *     summary: Unfollow a user
 *     description: Allows the authenticated user to unfollow a previously followed user by their ID. Updates both users' following/followers lists and decreases counts.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the user to unfollow
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: User unfollowed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnfollowUserResponse'
 *             examples:
 *               successful_unfollow:
 *                 summary: Successfully unfollowed a user
 *                 value:
 *                   message: "Successfully unfollowed."
 *       400:
 *         description: Bad request - Various validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnfollowErrorResponse'
 *             examples:
 *               user_not_found:
 *                 summary: Target user does not exist
 *                 value:
 *                   message: "We couldn't find the user you want to unfollow."
 *               not_following:
 *                 summary: Not currently following this user
 *                 value:
 *                   message: "You're not following this person."
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
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
 *               server_error:
 *                 summary: Database or server error
 *                 value:
 *                   message: "Database connection failed"
 */

/**
 * @swagger
 * /api/users/{id}/follower:
 *   get:
 *     summary: Get user's followers list
 *     description: Retrieves the list of followers for a specific user by their ID. Returns follower count and detailed information about each follower including username, full name, and avatar.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the user whose followers to retrieve
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Followers list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetFollowersResponse'
 *             examples:
 *               with_followers:
 *                 summary: User with multiple followers
 *                 value:
 *                   count: 3
 *                   followers:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "alice_smith"
 *                       full_name: "Alice Smith"
 *                       avatar: "https://example.com/alice-avatar.jpg"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                       username: "bob_jones"
 *                       full_name: "Bob Jones"
 *                       avatar: "https://example.com/bob-avatar.jpg"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                       username: "charlie_brown"
 *                       full_name: "Charlie Brown"
 *                       avatar: null
 *               no_followers:
 *                 summary: User with no followers
 *                 value:
 *                   count: 0
 *                   followers: []
 *               popular_user:
 *                 summary: Popular user with many followers
 *                 value:
 *                   count: 1250
 *                   followers:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                       username: "fan_user_1"
 *                       full_name: "Fan User One"
 *                       avatar: "https://example.com/fan1-avatar.jpg"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                       username: "fan_user_2"
 *                       full_name: "Fan User Two"
 *                       avatar: "https://example.com/fan2-avatar.jpg"
 *       400:
 *         description: Bad request - Invalid user ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not Found"
 *             examples:
 *               user_not_found:
 *                 summary: User with specified ID does not exist
 *                 value:
 *                   message: "Not Found"
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
 *               server_error:
 *                 summary: Database or server error
 *                 value:
 *                   message: "Database connection failed"
 */

/**
 * @swagger
 * /api/users/{id}/following:
 *   get:
 *     summary: Get user's following list
 *     description: Retrieves the list of users that a specific user is following by their ID. Returns following count and detailed information about each followed user including username, full name, and avatar.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the user whose following list to retrieve
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Following list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetFollowingResponse'
 *             examples:
 *               with_following:
 *                 summary: User following multiple people
 *                 value:
 *                   count: 4
 *                   following:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "tech_guru"
 *                       full_name: "Tech Guru"
 *                       avatar: "https://example.com/tech-guru-avatar.jpg"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                       username: "design_master"
 *                       full_name: "Design Master"
 *                       avatar: "https://example.com/design-master-avatar.jpg"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                       username: "startup_ceo"
 *                       full_name: "Startup CEO"
 *                       avatar: null
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                       username: "ai_researcher"
 *                       full_name: "AI Researcher"
 *                       avatar: "https://example.com/ai-researcher-avatar.jpg"
 *               no_following:
 *                 summary: User not following anyone
 *                 value:
 *                   count: 0
 *                   following: []
 *               selective_follower:
 *                 summary: User following only a few selected accounts
 *                 value:
 *                   count: 2
 *                   following:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                       username: "best_friend"
 *                       full_name: "Best Friend"
 *                       avatar: "https://example.com/best-friend-avatar.jpg"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ee"
 *                       username: "family_member"
 *                       full_name: "Family Member"
 *                       avatar: "https://example.com/family-avatar.jpg"
 *       400:
 *         description: Bad request - Invalid user ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not Found"
 *             examples:
 *               user_not_found:
 *                 summary: User with specified ID does not exist
 *                 value:
 *                   message: "Not Found"
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
 *               server_error:
 *                 summary: Database or server error
 *                 value:
 *                   message: "Database connection failed"
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieve a list of all users in the system. Admin access required.
 *     tags:
 *       - Users
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   example: 150
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                       username:
 *                         type: string
 *                         example: "john_doe"
 *                       email:
 *                         type: string
 *                         example: "john@example.com"
 *                       fullname:
 *                         type: string
 *                         example: "John Doe"
 *                       avatar:
 *                         type: string
 *                         example: "https://example.com/avatar.jpg"
 *                       role:
 *                         type: string
 *                         enum: ["user", "admin"]
 *                         example: "user"
 *                       kyc_status:
 *                         type: string
 *                         enum: ["unverified", "pending", "verified", "rejected"]
 *                         example: "verified"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       followers_count:
 *                         type: number
 *                         example: 150
 *                       following_count:
 *                         type: number
 *                         example: 75
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search for users
 *     description: Search for users by username or email using a query parameter. Returns a list of users that match the search criteria with basic profile information.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search keyword to match against username or email (case-insensitive)
 *         examples:
 *           username_search:
 *             summary: Search by username
 *             value: "john"
 *           email_search:
 *             summary: Search by email
 *             value: "john@example.com"
 *           partial_search:
 *             summary: Partial match search
 *             value: "doe"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchUsersResponse'
 *             examples:
 *               multiple_results:
 *                 summary: Multiple users found
 *                 value:
 *                   results:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                       username: "john_doe"
 *                       full_name: "John Doe"
 *                       avatar: "https://example.com/john-avatar.jpg"
 *                       bio: "Software developer passionate about AI"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "jane_doe"
 *                       full_name: "Jane Doe"
 *                       avatar: "https://example.com/jane-avatar.jpg"
 *                       bio: "UX Designer with 5 years experience"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                       username: "johnny_smith"
 *                       full_name: "Johnny Smith"
 *                       avatar: null
 *                       bio: "Entrepreneur and startup founder"
 *               single_result:
 *                 summary: Single user found
 *                 value:
 *                   results:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                       username: "unique_user"
 *                       full_name: "Unique User"
 *                       avatar: "https://example.com/unique-avatar.jpg"
 *                       bio: "One of a kind profile"
 *               no_results:
 *                 summary: No users found
 *                 value:
 *                   results: []
 *               email_match:
 *                 summary: Search by email found user
 *                 value:
 *                   results:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                       username: "contact_user"
 *                       full_name: "Contact User"
 *                       avatar: "https://example.com/contact-avatar.jpg"
 *                       bio: "Found by email search"
 *       400:
 *         description: Bad request - Missing or invalid query parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Search keyword is missing."
 *             examples:
 *               missing_query:
 *                 summary: Query parameter is missing
 *                 value:
 *                   message: "Search keyword is missing."
 *               empty_query:
 *                 summary: Empty query parameter
 *                 value:
 *                   message: "Search keyword is missing."
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
 *               server_error:
 *                 summary: Database or server error
 *                 value:
 *                   message: "Database connection failed"
 */

export default userRoutes;
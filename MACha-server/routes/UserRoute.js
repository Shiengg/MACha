import { Router } from "express";
import { getUserById, followUser, unfollowUser, getFollowers, getFollowing, searchUsers } from "../controllers/UserController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";

const userRoutes = Router();

userRoutes.get('/:id', authMiddleware, getUserById);
userRoutes.post('/:id/follow', authMiddleware, followUser);
userRoutes.post('/:id/unfollow', authMiddleware, unfollowUser);
userRoutes.get('/:id/follower', authMiddleware, getFollowers);
userRoutes.get('/:id/following', authMiddleware, getFollowing);
userRoutes.get('/search', authMiddleware, searchUsers);

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
 *           examples:
 *             - "You can't follow your own account.."
 *             - "We couldn't find the user you want to follow."
 *             - "You're already following this person."
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
 *           examples:
 *             - "We couldn't find the user you want to unfollow."
 *             - "You're not following this person."
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
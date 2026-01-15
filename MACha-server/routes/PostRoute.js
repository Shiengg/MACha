import { Router } from "express";
import {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    getPostsByHashtag,
    searchPostsByHashtag,
    searchPostsByTitle
} from "../controllers/PostController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { rateLimitByIP, rateLimitByUserId } from "../middlewares/rateLimitMiddleware.js";

const postRoutes = Router();

// Write operations – rate limit per user
// SECURITY FIX: Chỉ cho phép USER và ORGANIZATION tạo/sửa/xóa post, không cho OWNER và ADMIN
postRoutes.post('/', authMiddleware, checkRole('user', 'organization'), rateLimitByUserId(120, 60), createPost);
postRoutes.put('/:id', authMiddleware, checkRole('user', 'organization'), rateLimitByUserId(120, 60), updatePost);
postRoutes.delete('/:id', authMiddleware, checkRole('user', 'organization'), rateLimitByUserId(60, 60), deletePost);

// Authenticated feed
postRoutes.get('/', authMiddleware, rateLimitByUserId(300, 60), getPosts);
postRoutes.get('/:id', authMiddleware, rateLimitByUserId(300, 60), getPostById);

// Public / search endpoints – IP-based limit
postRoutes.get('/search', rateLimitByIP(300, 60), searchPostsByHashtag);
postRoutes.get('/search/title', rateLimitByIP(300, 60), searchPostsByTitle);
postRoutes.get('/hashtag/:name', rateLimitByIP(300, 60), getPostsByHashtag);

/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePostRequest:
 *       type: object
 *       required:
 *         - content_text
 *       properties:
 *         content_text:
 *           type: string
 *           description: The main text content of the post
 *           example: "Just finished an amazing project! Excited to share it with everyone. #coding #webdev"
 *         media_url:
 *           type: string
 *           description: Optional URL to media content (image, video, etc.)
 *           example: "https://example.com/media/project-screenshot.jpg"
 *       additionalProperties: false
 *     
 *     HashtagInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Hashtag's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7f0"
 *         name:
 *           type: string
 *           description: Hashtag name (lowercase, without #)
 *           example: "coding"
 *     
 *     UserInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e9"
 *         username:
 *           type: string
 *           description: User's username
 *           example: "john_doe"
 *         avatar:
 *           type: string
 *           description: User's avatar URL
 *           example: "https://example.com/avatar.jpg"
 *     
 *     PostResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Post's unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         user:
 *           oneOf:
 *             - type: string
 *               description: User ID (when not populated)
 *               example: "64a7b8c9d1e2f3a4b5c6d7e9"
 *             - $ref: '#/components/schemas/UserInfo'
 *         content_text:
 *           type: string
 *           description: The text content of the post
 *           example: "Just finished an amazing project! Excited to share it with everyone. #coding #webdev"
 *         media_url:
 *           type: string
 *           nullable: true
 *           description: URL to media content if provided
 *           example: "https://example.com/media/project-screenshot.jpg"
 *         hashtags:
 *           type: array
 *           items:
 *             oneOf:
 *               - type: string
 *                 description: Hashtag ID (when not populated)
 *                 example: "64a7b8c9d1e2f3a4b5c6d7f0"
 *               - $ref: '#/components/schemas/HashtagInfo'
 *           description: List of hashtags associated with the post
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Post creation timestamp
 *           example: "2023-07-25T14:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Post last update timestamp
 *           example: "2023-07-25T14:30:00.000Z"
 *     
 *     CreatePostResponse:
 *       type: object
 *       properties:
 *         populatedPost:
 *           $ref: '#/components/schemas/PostResponse'
 *     
 *     GetPostsResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/PostResponse'
 *       description: List of posts sorted by creation date (newest first)
 */

/**
 * @swagger
 * /api/posts/:
 *   post:
 *     summary: Create a new post
 *     description: Creates a new post with text content and optional media. The authenticated user becomes the author of the post.
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostRequest'
 *           examples:
 *             text_only_post:
 *               summary: Text-only post
 *               value:
 *                 content_text: "Just had an amazing day at the beach! The weather was perfect and the sunset was breathtaking. #beach #sunset #goodvibes"
 *             post_with_media:
 *               summary: Post with media attachment
 *               value:
 *                 content_text: "Check out my latest artwork! Spent hours perfecting this digital painting. What do you think? #art #digitalart #creative"
 *                 media_url: "https://example.com/media/artwork-painting.jpg"
 *             short_post:
 *               summary: Short announcement post
 *               value:
 *                 content_text: "Excited to announce my new job! 🎉"
 *             technical_post:
 *               summary: Technical/coding post
 *               value:
 *                 content_text: "Just deployed my React app to production! The performance improvements are incredible. Here's what I learned about optimization... #react #webdev #performance"
 *                 media_url: "https://example.com/media/performance-chart.png"
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePostResponse'
 *             examples:
 *               successful_creation:
 *                 summary: Post created successfully with hashtags
 *                 value:
 *                   populatedPost:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     user:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "john_doe"
 *                       avatar_url: "https://example.com/john-avatar.jpg"
 *                     content_text: "Just finished an amazing project! Excited to share it with everyone. #coding #webdev"
 *                     media_url: "https://example.com/media/project-screenshot.jpg"
 *                     hashtags:
 *                       - _id: "64a7b8c9d1e2f3a4b5c6d7f0"
 *                         name: "coding"
 *                       - _id: "64a7b8c9d1e2f3a4b5c6d7f1"
 *                         name: "webdev"
 *                     createdAt: "2023-07-25T14:30:00.000Z"
 *                     updatedAt: "2023-07-25T14:30:00.000Z"
 *               text_only_creation:
 *                 summary: Text-only post without hashtags
 *                 value:
 *                   populatedPost:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     user:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "john_doe"
 *                       avatar_url: "https://example.com/john-avatar.jpg"
 *                     content_text: "Beautiful sunset today! Nature never fails to amaze me."
 *                     media_url: null
 *                     hashtags: []
 *                     createdAt: "2023-07-25T15:45:00.000Z"
 *                     updatedAt: "2023-07-25T15:45:00.000Z"
 *       400:
 *         description: Bad request - Missing required content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Content is required"
 *             examples:
 *               missing_content:
 *                 summary: Content text is missing
 *                 value:
 *                   message: "Content is required"
 *               empty_content:
 *                 summary: Empty content text
 *                 value:
 *                   message: "Content is required"
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
 * /api/posts/:
 *   get:
 *     summary: Get all posts
 *     description: Retrieves all posts from the platform sorted by creation date (newest first). Each post includes populated user information (username and avatar) for display purposes.
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostsResponse'
 *             examples:
 *               multiple_posts:
 *                 summary: Multiple posts with various content types
 *                 value:
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     user:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                       username: "alice_dev"
 *                       avatar: "https://example.com/alice-avatar.jpg"
 *                     content_text: "Just deployed my new React app! The performance improvements are incredible. #react #webdev #performance"
 *                     media_url: "https://example.com/media/react-app-screenshot.jpg"
 *                     hashtags: ["64a7b8c9d1e2f3a4b5c6d7f0", "64a7b8c9d1e2f3a4b5c6d7f1", "64a7b8c9d1e2f3a4b5c6d7f2"]
 *                     createdAt: "2023-07-25T16:30:00.000Z"
 *                     updatedAt: "2023-07-25T16:30:00.000Z"
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     user:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                       username: "bob_designer"
 *                       avatar: "https://example.com/bob-avatar.jpg"
 *                     content_text: "Beautiful sunset at the beach today! Sometimes you need to step away from the screen and enjoy nature. 🌅"
 *                     media_url: null
 *                     hashtags: []
 *                     createdAt: "2023-07-25T15:45:00.000Z"
 *                     updatedAt: "2023-07-25T15:45:00.000Z"
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                     user:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                       username: "charlie_startup"
 *                       avatar: null
 *                     content_text: "Excited to announce our Series A funding! Thanks to all our supporters. Big things coming! #startup #funding #entrepreneur"
 *                     media_url: "https://example.com/media/funding-announcement.png"
 *                     hashtags: ["64a7b8c9d1e2f3a4b5c6d7f3", "64a7b8c9d1e2f3a4b5c6d7f4", "64a7b8c9d1e2f3a4b5c6d7f5"]
 *                     createdAt: "2023-07-25T14:20:00.000Z"
 *                     updatedAt: "2023-07-25T14:20:00.000Z"
 *               empty_feed:
 *                 summary: No posts available
 *                 value: []
 *               single_post:
 *                 summary: Single post in feed
 *                 value:
 *                   - _id: "64a7b8c9d1e2f3a4b5c6d7ee"
 *                     user:
 *                       _id: "64a7b8c9d1e2f3a4b5c6d7ef"
 *                       username: "diana_writer"
 *                       avatar: "https://example.com/diana-avatar.jpg"
 *                     content_text: "Working on my first novel! The creative process is both challenging and rewarding. Any fellow writers here? #writing #novel #creativity"
 *                     media_url: null
 *                     hashtags: ["64a7b8c9d1e2f3a4b5c6d7f6", "64a7b8c9d1e2f3a4b5c6d7f7", "64a7b8c9d1e2f3a4b5c6d7f8"]
 *                     createdAt: "2023-07-25T13:15:00.000Z"
 *                     updatedAt: "2023-07-25T13:15:00.000Z"
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
 * /api/posts/{id}:
 *   get:
 *     summary: Get a specific post by ID
 *     description: Retrieves a single post by its unique identifier. The post includes populated user information (username and avatar) for display purposes.
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier of the post to retrieve
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponse'
 *             examples:
 *               post_with_media:
 *                 summary: Post with media and hashtags
 *                 value:
 *                   _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     username: "alice_dev"
 *                     avatar: "https://example.com/alice-avatar.jpg"
 *                   content_text: "Just deployed my new React app! The performance improvements are incredible. Check out the live demo! #react #webdev #performance"
 *                   media_url: "https://example.com/media/react-app-demo.jpg"
 *                   hashtags: ["64a7b8c9d1e2f3a4b5c6d7f0", "64a7b8c9d1e2f3a4b5c6d7f1", "64a7b8c9d1e2f3a4b5c6d7f2"]
 *                   createdAt: "2023-07-25T16:30:00.000Z"
 *                   updatedAt: "2023-07-25T16:30:00.000Z"
 *               text_only_post:
 *                 summary: Simple text-only post
 *                 value:
 *                   _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                     username: "bob_writer"
 *                     avatar: null
 *                   content_text: "Beautiful morning! Sometimes the simple moments are the most precious. Hope everyone has a wonderful day ahead! ☀️"
 *                   media_url: null
 *                   hashtags: []
 *                   createdAt: "2023-07-25T08:15:00.000Z"
 *                   updatedAt: "2023-07-25T08:15:00.000Z"
 *               startup_announcement:
 *                 summary: Business/startup related post
 *                 value:
 *                   _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                     username: "charlie_ceo"
 *                     avatar: "https://example.com/charlie-avatar.jpg"
 *                   content_text: "Excited to share that we've reached 10,000 users! Thank you to our amazing community for the support. Big updates coming soon! 🚀 #startup #milestone #community"
 *                   media_url: "https://example.com/media/milestone-celebration.png"
 *                   hashtags: ["64a7b8c9d1e2f3a4b5c6d7f3", "64a7b8c9d1e2f3a4b5c6d7f4", "64a7b8c9d1e2f3a4b5c6d7f5"]
 *                   createdAt: "2023-07-25T12:45:00.000Z"
 *                   updatedAt: "2023-07-25T12:45:00.000Z"
 *       400:
 *         description: Bad request - Invalid post ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid post ID format"
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"Post\""
 *               malformed_id:
 *                 summary: Malformed ID parameter
 *                 value:
 *                   message: "Invalid post ID format"
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
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not Found"
 *             examples:
 *               post_not_found:
 *                 summary: Post with given ID doesn't exist
 *                 value:
 *                   message: "Not Found"
 *               deleted_post:
 *                 summary: Post was deleted or never existed
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
 *               database_error:
 *                 summary: Database connection or query error
 *                 value:
 *                   message: "Database connection failed"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while processing the request"
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a specific post by ID
 *     description: Deletes a post by its unique identifier. Only the post author can delete their own post. This operation also removes all associated likes and comments in a cascade manner.
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier of the post to delete
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post deleted successfully"
 *             examples:
 *               successful_deletion:
 *                 summary: Post and related data deleted successfully
 *                 value:
 *                   message: "Post deleted successfully"
 *               cascade_deletion:
 *                 summary: Post with likes and comments deleted
 *                 value:
 *                   message: "Post deleted successfully"
 *       400:
 *         description: Bad request - Invalid post ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid post ID format"
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"Post\""
 *               malformed_id:
 *                 summary: Malformed ID parameter
 *                 value:
 *                   message: "Invalid post ID format"
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
 *       403:
 *         description: Forbidden - User is not the post author
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Forbidden"
 *             examples:
 *               not_post_owner:
 *                 summary: User trying to delete someone else's post
 *                 value:
 *                   message: "Forbidden"
 *               insufficient_permissions:
 *                 summary: User lacks permission to delete this post
 *                 value:
 *                   message: "Forbidden"
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not Found"
 *             examples:
 *               post_not_found:
 *                 summary: Post with given ID doesn't exist
 *                 value:
 *                   message: "Not Found"
 *               already_deleted:
 *                 summary: Post was already deleted
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
 *               database_error:
 *                 summary: Database operation failed
 *                 value:
 *                   message: "Database connection failed"
 *               cascade_delete_error:
 *                 summary: Error during cascade deletion
 *                 value:
 *                   message: "Failed to delete associated likes and comments"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while deleting the post"
 */

/**
 * @swagger
 * /api/posts/hashtag/{name}:
 *   get:
 *     summary: Get posts by specific hashtag
 *     description: Retrieves all posts that contain a specific hashtag. The hashtag name should be provided without the '#' symbol and is case-insensitive.
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: The hashtag name to search for (without # symbol)
 *         schema:
 *           type: string
 *           example: "coding"
 *         examples:
 *           coding_hashtag:
 *             summary: Search for coding posts
 *             value: "coding"
 *           webdev_hashtag:
 *             summary: Search for web development posts
 *             value: "webdev"
 *           startup_hashtag:
 *             summary: Search for startup posts
 *             value: "startup"
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of posts found with this hashtag
 *                   example: 5
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PostResponse'
 *                   description: Array of posts containing the specified hashtag
 *             examples:
 *               posts_found:
 *                 summary: Multiple posts found with hashtag
 *                 value:
 *                   count: 3
 *                   posts:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                       user:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                         username: "alice_dev"
 *                         avatar: "https://example.com/alice-avatar.jpg"
 *                       content_text: "Just deployed my new React app! The performance improvements are incredible. #coding #webdev #performance"
 *                       media_url: "https://example.com/media/react-app-screenshot.jpg"
 *                       hashtags:
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f0"
 *                           name: "coding"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f1"
 *                           name: "webdev"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f2"
 *                           name: "performance"
 *                       createdAt: "2023-07-25T16:30:00.000Z"
 *                       updatedAt: "2023-07-25T16:30:00.000Z"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                       user:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                         username: "bob_programmer"
 *                         avatar: "https://example.com/bob-avatar.jpg"
 *                       content_text: "Learning new algorithms today! Data structures are fascinating. #coding #algorithms #learning"
 *                       media_url: null
 *                       hashtags:
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f0"
 *                           name: "coding"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f3"
 *                           name: "algorithms"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f4"
 *                           name: "learning"
 *                       createdAt: "2023-07-25T14:20:00.000Z"
 *                       updatedAt: "2023-07-25T14:20:00.000Z"
 *               single_post:
 *                 summary: Single post found with hashtag
 *                 value:
 *                   count: 1
 *                   posts:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                       user:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                         username: "charlie_startup"
 *                         avatar: null
 *                       content_text: "Excited to announce our Series A funding! Thanks to all our supporters. Big things coming! #startup #funding #entrepreneur"
 *                       media_url: "https://example.com/media/funding-announcement.png"
 *                       hashtags:
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f5"
 *                           name: "startup"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f6"
 *                           name: "funding"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f7"
 *                           name: "entrepreneur"
 *                       createdAt: "2023-07-25T12:45:00.000Z"
 *                       updatedAt: "2023-07-25T12:45:00.000Z"
 *       404:
 *         description: Hashtag not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Hashtag not found"
 *             examples:
 *               hashtag_not_found:
 *                 summary: No hashtag exists with the given name
 *                 value:
 *                   message: "Hashtag not found"
 *               nonexistent_hashtag:
 *                 summary: Hashtag has never been used
 *                 value:
 *                   message: "Hashtag not found"
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
 *                   message: "An unexpected error occurred while retrieving posts"
 */

/**
 * @swagger
 * /api/posts/search:
 *   get:
 *     summary: Search posts by hashtag keyword
 *     description: Search for posts containing hashtags that match the provided keyword. The search is case-insensitive and supports partial matching using regex. You can use either 'hashtag' or 'query' parameter.
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: hashtag
 *         required: false
 *         description: The hashtag keyword to search for (without # symbol)
 *         schema:
 *           type: string
 *           example: "cod"
 *         examples:
 *           partial_match:
 *             summary: Partial hashtag search
 *             value: "cod"
 *           full_match:
 *             summary: Full hashtag search
 *             value: "coding"
 *       - in: query
 *         name: query
 *         required: false
 *         description: Alternative parameter name for hashtag keyword search
 *         schema:
 *           type: string
 *           example: "web"
 *         examples:
 *           web_search:
 *             summary: Search for web-related hashtags
 *             value: "web"
 *           startup_search:
 *             summary: Search for startup-related hashtags
 *             value: "start"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of posts found matching the search criteria
 *                   example: 7
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PostResponse'
 *                   description: Array of posts containing hashtags that match the search keyword
 *                 message:
 *                   type: string
 *                   description: Optional message when no results found
 *                   example: "No matching hashtags found"
 *             examples:
 *               multiple_matches:
 *                 summary: Multiple posts found with matching hashtags
 *                 value:
 *                   count: 4
 *                   posts:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                       user:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                         username: "alice_dev"
 *                         avatar_url: "https://example.com/alice-avatar.jpg"
 *                       content_text: "Just deployed my new React app! The performance improvements are incredible. #coding #webdev #performance"
 *                       media_url: "https://example.com/media/react-app-screenshot.jpg"
 *                       hashtags:
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f0"
 *                           name: "coding"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f1"
 *                           name: "webdev"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f2"
 *                           name: "performance"
 *                       created_at: "2023-07-25T16:30:00.000Z"
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                       user:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7eb"
 *                         username: "bob_programmer"
 *                         avatar_url: "https://example.com/bob-avatar.jpg"
 *                       content_text: "Learning new algorithms today! Data structures are fascinating. #coding #algorithms #learning"
 *                       media_url: null
 *                       hashtags:
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f0"
 *                           name: "coding"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f3"
 *                           name: "algorithms"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f4"
 *                           name: "learning"
 *                       created_at: "2023-07-25T14:20:00.000Z"
 *               no_matches:
 *                 summary: No posts found with matching hashtags
 *                 value:
 *                   message: "No matching hashtags found"
 *                   posts: []
 *               partial_match:
 *                 summary: Posts found with partial hashtag match
 *                 value:
 *                   count: 2
 *                   posts:
 *                     - _id: "64a7b8c9d1e2f3a4b5c6d7ec"
 *                       user:
 *                         _id: "64a7b8c9d1e2f3a4b5c6d7ed"
 *                         username: "charlie_webdev"
 *                         avatar_url: "https://example.com/charlie-avatar.jpg"
 *                       content_text: "Building responsive websites with modern CSS techniques. #webdev #css #responsive"
 *                       media_url: "https://example.com/media/responsive-design.jpg"
 *                       hashtags:
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f1"
 *                           name: "webdev"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f5"
 *                           name: "css"
 *                         - _id: "64a7b8c9d1e2f3a4b5c6d7f6"
 *                           name: "responsive"
 *                       created_at: "2023-07-25T13:15:00.000Z"
 *       400:
 *         description: Bad request - Missing search keyword
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Search keyword is required"
 *             examples:
 *               missing_parameter:
 *                 summary: No search keyword provided
 *                 value:
 *                   message: "Search keyword is required"
 *               empty_parameter:
 *                 summary: Empty search keyword
 *                 value:
 *                   message: "Search keyword is required"
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
 *               regex_error:
 *                 summary: Invalid regex pattern error
 *                 value:
 *                   message: "Invalid search pattern provided"
 *               server_error:
 *                 summary: Unexpected server error
 *                 value:
 *                   message: "An unexpected error occurred while searching posts"
 */

export default postRoutes;
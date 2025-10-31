import { Router } from "express";
import { likePost, unlikePost, getPostLikes } from "../controllers/likeController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const likeRoutes = Router();

likeRoutes.post('/:postId/like', authMiddleware, likePost);
likeRoutes.post('/:postId/unlike', authMiddleware, unlikePost);
likeRoutes.get('/:postId/likes', authMiddleware, getPostLikes);

/**
 * @swagger
 * components:
 *   schemas:
 *     Like:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Like ID
 *         post:
 *           type: string
 *           description: Post ID that was liked
 *         user:
 *           type: string
 *           description: User ID who liked the post
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Like creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Like update timestamp
 *     LikeResponse:
 *       type: object
 *       properties:
 *         totalLikes:
 *           type: number
 *           description: Total number of likes
 *         users:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: User ID
 *               username:
 *                 type: string
 *                 description: Username
 *               avatar_url:
 *                 type: string
 *                 description: User avatar URL
 */

/**
 * @swagger
 * /api/likes/{postId}/like:
 *   post:
 *     summary: Like a post
 *     description: Add a like to a specific post
 *     tags: [Likes]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to like
 *     responses:
 *       201:
 *         description: Post liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post liked"
 *       400:
 *         description: Post already liked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Already liked"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * /api/likes/{postId}/unlike:
 *   post:
 *     summary: Unlike a post
 *     description: Remove like from a specific post
 *     tags: [Likes]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to unlike
 *     responses:
 *       200:
 *         description: Post unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post unliked"
 *       404:
 *         description: Like not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Like not found"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * /api/likes/{postId}/likes:
 *   get:
 *     summary: Get post likes
 *     description: Retrieve total likes count and list of users who liked the post
 *     tags: [Likes]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to get likes for
 *     responses:
 *       200:
 *         description: Post likes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LikeResponse'
 *             example:
 *               totalLikes: 5
 *               users:
 *                 - _id: "507f1f77bcf86cd799439011"
 *                   username: "john_doe"
 *                   avatar_url: "https://example.com/avatar1.jpg"
 *                 - _id: "507f1f77bcf86cd799439012"
 *                   username: "jane_smith"
 *                   avatar_url: "https://example.com/avatar2.jpg"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

export default likeRoutes;
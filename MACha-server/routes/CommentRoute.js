import { Router } from "express";
import { addComment, getComments, deleteComment } from "../controllers/CommentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { rateLimitByIP, rateLimitByUserId } from "../middlewares/rateLimitMiddleware.js";

const commentRoutes = Router();

commentRoutes.post('/:postId/comments', authMiddleware, rateLimitByUserId(120, 60), addComment);
commentRoutes.delete('/comments/:commentId', authMiddleware, rateLimitByUserId(60, 60), deleteComment);

// Read: per IP, rộng để không siết người dùng thật
commentRoutes.get('/:postId/comments', rateLimitByIP(300, 60), getComments);

/**
 * @swagger
 * /comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Delete a specific comment. Only the user who created the comment can delete it. Requires authentication.
 *     tags:
 *       - Comments
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the comment to delete
 *         example: "64f5b8c9e1234567890abcde"
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: "Comment deleted"
 *             examples:
 *               success:
 *                 summary: Comment deleted successfully
 *                 value:
 *                   message: "Comment deleted"
 *       401:
 *         description: Unauthorized access (not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: Not logged in
 *                 value:
 *                   message: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - User doesn't own this comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 summary: Not the comment owner
 *                 value:
 *                   message: "Forbidden"
 *       404:
 *         description: Comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               comment_not_found:
 *                 summary: Comment does not exist
 *                 value:
 *                   message: "Comment not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Server error
 *                 value:
 *                   message: "Internal server error"
 */

/**
 * @swagger
 * /{postId}/comments:
 *   get:
 *     summary: Get all comments for a post
 *     description: Retrieve all comments for the specified post, including user information. Comments are sorted by creation date (newest first).
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to get comments for
 *         example: "64f5b8c9e1234567890abcdf"
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Comment'
 *                   - type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: User ID
 *                             example: "64f5b8c9e1234567890abce0"
 *                           username:
 *                             type: string
 *                             description: Username of the commenter
 *                             example: "john_doe"
 *                           avatar_url:
 *                             type: string
 *                             description: User's avatar URL
 *                             example: "https://example.com/avatar.jpg"
 *             examples:
 *               success:
 *                 summary: List of comments with user info
 *                 value:
 *                   - _id: "64f5b8c9e1234567890abcde"
 *                     post: "64f5b8c9e1234567890abcdf"
 *                     user:
 *                       _id: "64f5b8c9e1234567890abce0"
 *                       username: "john_doe"
 *                       avatar_url: "https://example.com/avatar.jpg"
 *                     content_text: "This is a great post!"
 *                     createdAt: "2023-09-04T10:30:00.000Z"
 *                     updatedAt: "2023-09-04T10:30:00.000Z"
 *                   - _id: "64f5b8c9e1234567890abcdf"
 *                     post: "64f5b8c9e1234567890abcdf"
 *                     user:
 *                       _id: "64f5b8c9e1234567890abce1"
 *                       username: "jane_smith"
 *                       avatar_url: "https://example.com/avatar2.jpg"
 *                     content_text: "Thanks for sharing!"
 *                     createdAt: "2023-09-04T09:15:00.000Z"
 *                     updatedAt: "2023-09-04T09:15:00.000Z"
 *               empty:
 *                 summary: No comments found
 *                 value: []
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               post_not_found:
 *                 summary: Post does not exist
 *                 value:
 *                   message: "Post not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Server error
 *                 value:
 *                   message: "Internal server error"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Comment ID
 *           example: "64f5b8c9e1234567890abcde"
 *         post:
 *           type: string
 *           description: ID of the post being commented on
 *           example: "64f5b8c9e1234567890abcdf"
 *         user:
 *           type: string
 *           description: ID of the user who created the comment
 *           example: "64f5b8c9e1234567890abce0"
 *         content_text:
 *           type: string
 *           description: Content of the comment
 *           example: "This is a great comment!"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Comment creation timestamp
 *           example: "2023-09-04T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Comment last update timestamp
 *           example: "2023-09-04T10:30:00.000Z"
 *     CommentInput:
 *       type: object
 *       required:
 *         - content_text
 *       properties:
 *         content_text:
 *           type: string
 *           description: Content of the comment
 *           example: "This is a great comment!"
 *           minLength: 1
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: "Comment text required"
 */

/**
 * @swagger
 * /{postId}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     description: Create a new comment for the specified post. Requires user authentication.
 *     tags:
 *       - Comments
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to comment on
 *         example: "64f5b8c9e1234567890abcdf"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentInput'
 *           examples:
 *             example1:
 *               summary: Regular comment
 *               value:
 *                 content_text: "This post is very informative and helpful!"
 *             example2:
 *               summary: Long comment
 *               value:
 *                 content_text: "Thank you for sharing such useful information. I learned a lot of new things from this post."
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *             examples:
 *               success:
 *                 summary: Comment created successfully
 *                 value:
 *                   _id: "64f5b8c9e1234567890abcde"
 *                   post: "64f5b8c9e1234567890abcdf"
 *                   user: "64f5b8c9e1234567890abce0"
 *                   content_text: "This post is very informative and helpful!"
 *                   createdAt: "2023-09-04T10:30:00.000Z"
 *                   updatedAt: "2023-09-04T10:30:00.000Z"
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_content:
 *                 summary: Missing comment content
 *                 value:
 *                   message: "Comment text required"
 *       401:
 *         description: Unauthorized access (not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: Not logged in
 *                 value:
 *                   message: "Access denied. No token provided."
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               post_not_found:
 *                 summary: Post does not exist
 *                 value:
 *                   message: "Post not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Server error
 *                 value:
 *                   message: "Internal server error"
 */

export default commentRoutes;
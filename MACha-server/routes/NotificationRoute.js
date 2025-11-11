import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from "../controllers/NotificationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const notificationRoute = Router();

notificationRoute.get('/', authMiddleware, getNotifications);
notificationRoute.patch('/:id/read', authMiddleware, markAsRead);
notificationRoute.patch('/read-all', authMiddleware, markAllAsRead);
notificationRoute.delete("/:id", authMiddleware, deleteNotification);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Notification unique identifier
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         receiver:
 *           type: string
 *           description: ID of the user receiving the notification
 *           example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *         sender:
 *           type: object
 *           description: User who triggered the notification
 *           properties:
 *             _id:
 *               type: string
 *               example: "64a7b8c9d1e2f3a4b5c6d7e9"
 *             username:
 *               type: string
 *               example: "john_doe"
 *             avatar:
 *               type: string
 *               example: "https://example.com/avatar.jpg"
 *         type:
 *           type: string
 *           enum: [follow, like, comment, mention, donation, campaign_update, system]
 *           description: Type of notification
 *           example: "like"
 *         message:
 *           type: string
 *           description: Notification message content
 *           example: "John liked your post"
 *         post:
 *           type: object
 *           description: Related post (if applicable)
 *           properties:
 *             _id:
 *               type: string
 *               example: "64a7b8c9d1e2f3a4b5c6d7ea"
 *             content_text:
 *               type: string
 *               example: "This is my post content"
 *         campaign:
 *           type: object
 *           description: Related campaign (if applicable)
 *           properties:
 *             _id:
 *               type: string
 *               example: "64a7b8c9d1e2f3a4b5c6d7eb"
 *             title:
 *               type: string
 *               example: "Help Children in Need"
 *         is_read:
 *           type: boolean
 *           description: Whether the notification has been read
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when notification was created
 *           example: "2024-01-15T10:30:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when notification was last updated
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     GetNotificationsResponse:
 *       type: object
 *       properties:
 *         count:
 *           type: number
 *           description: Total number of notifications
 *           example: 25
 *         notifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *           description: List of notifications sorted by creation date (newest first)
 *     
 *     MarkAsReadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: "Marked as read"
 *         notification:
 *           $ref: '#/components/schemas/Notification'
 *     
 *     MarkAllAsReadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: "All notifications marked as read"
 *         modifiedCount:
 *           type: number
 *           description: Number of notifications that were marked as read
 *           example: 10
 *     
 *     DeleteNotificationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: "Notification deleted successfully"
 *     
 *     NotificationErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           examples:
 *             - "Notification not found"
 *             - "Notification not found or not authorized"
 *             - "Internal server error"
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo
 *     description: Lấy tất cả thông báo của người dùng hiện tại, được sắp xếp theo thời gian tạo (mới nhất trước)
 *     tags:
 *       - Notifications
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetNotificationsResponse'
 *             example:
 *               count: 3
 *               notifications:
 *                 - _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                   receiver: "64a7b8c9d1e2f3a4b5c6d7e7"
 *                   sender:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     username: "john_doe"
 *                     avatar: "https://example.com/avatar.jpg"
 *                   type: "like"
 *                   message: "John liked your post"
 *                   post:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     content_text: "This is my post"
 *                   is_read: false
 *                   created_at: "2024-01-15T10:30:00.000Z"
 *                   updated_at: "2024-01-15T10:30:00.000Z"
 *                 - _id: "64a7b8c9d1e2f3a4b5c6d7e1"
 *                   receiver: "64a7b8c9d1e2f3a4b5c6d7e7"
 *                   sender:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e2"
 *                     username: "jane_smith"
 *                     avatar: "https://example.com/avatar2.jpg"
 *                   type: "follow"
 *                   message: "Jane started following you"
 *                   is_read: true
 *                   created_at: "2024-01-14T15:20:00.000Z"
 *                   updated_at: "2024-01-14T15:20:00.000Z"
 *       401:
 *         description: Không được xác thực (chưa đăng nhập)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Unauthorized"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Internal server error"
 */

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu thông báo đã đọc
 *     description: Đánh dấu một thông báo cụ thể là đã đọc
 *     tags:
 *       - Notifications
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông báo cần đánh dấu đã đọc
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Đánh dấu đã đọc thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkAsReadResponse'
 *             example:
 *               message: "Marked as read"
 *               notification:
 *                 _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                 receiver: "64a7b8c9d1e2f3a4b5c6d7e7"
 *                 sender: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                 type: "like"
 *                 message: "John liked your post"
 *                 is_read: true
 *                 created_at: "2024-01-15T10:30:00.000Z"
 *                 updated_at: "2024-01-15T10:35:00.000Z"
 *       400:
 *         description: Không tìm thấy thông báo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Notification not found"
 *       401:
 *         description: Không được xác thực (chưa đăng nhập)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Unauthorized"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Internal server error"
 */

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     description: Đánh dấu tất cả thông báo chưa đọc của người dùng hiện tại là đã đọc
 *     tags:
 *       - Notifications
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đánh dấu tất cả thông báo đã đọc thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkAllAsReadResponse'
 *             example:
 *               message: "All notifications marked as read"
 *               modifiedCount: 15
 *       401:
 *         description: Không được xác thực (chưa đăng nhập)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Unauthorized"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Internal server error"
 */

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Xóa thông báo
 *     description: Xóa một thông báo cụ thể của người dùng hiện tại
 *     tags:
 *       - Notifications
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông báo cần xóa
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: Xóa thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteNotificationResponse'
 *             example:
 *               message: "Notification deleted successfully"
 *       404:
 *         description: Không tìm thấy thông báo hoặc không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Notification not found or not authorized"
 *       401:
 *         description: Không được xác thực (chưa đăng nhập)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Unauthorized"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationErrorResponse'
 *             example:
 *               message: "Internal server error"
 */


export default notificationRoute;
/**
 * Notification Routes
 * Phase PD-7: Automation & Notification Foundation
 */

import { Router } from 'express';
import { param, query } from 'express-validator';
import { NotificationController } from '../controllers/NotificationController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router: Router = Router();
const notificationController = new NotificationController();

// Validation middleware
const validateNotificationId = [
  param('id').isUUID().withMessage('Notification ID must be a valid UUID')
];

const validateListQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean'),
  query('type').optional().isString().withMessage('type must be a string'),
  query('channel').optional().isIn(['in_app', 'email']).withMessage('channel must be in_app or email')
];

// Routes

/**
 * @swagger
 * /api/v2/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of notifications per page
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [order.new, order.status_changed, settlement.new_pending, settlement.paid, price.changed, stock.low, role.approved, role.application_submitted, custom]
 *         description: Filter by notification type
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [in_app, email]
 *         description: Filter by notification channel
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, validateListQuery, asyncHandler(notificationController.getNotifications));

/**
 * @swagger
 * /api/v2/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [in_app, email]
 *         description: Filter by channel
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', authenticate, asyncHandler(notificationController.getUnreadCount));

/**
 * @swagger
 * /api/v2/notifications/recent:
 *   get:
 *     summary: Get recent notifications (for dashboard widgets)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Number of notifications to retrieve (default: 5)
 *     responses:
 *       200:
 *         description: Recent notifications retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/recent', authenticate, asyncHandler(notificationController.getRecentNotifications));

/**
 * @swagger
 * /api/v2/notifications/stats:
 *   get:
 *     summary: Get notification statistics
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days to look back (default: 30)
 *     responses:
 *       200:
 *         description: Notification statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, asyncHandler(notificationController.getNotificationStats));

/**
 * @swagger
 * /api/v2/notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.post('/read-all', authenticate, asyncHandler(notificationController.markAllAsRead));

/**
 * @swagger
 * /api/v2/notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/read', authenticate, validateNotificationId, asyncHandler(notificationController.markAsRead));

export default router;

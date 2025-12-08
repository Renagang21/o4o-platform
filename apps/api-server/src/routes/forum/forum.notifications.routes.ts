/**
 * Forum Notification Routes
 * Phase 13: Forum Notification System
 *
 * Routes: /api/v1/forum/notifications/*
 */

import { Router } from 'express';
import { ForumNotificationController } from '../../controllers/forum/ForumNotificationController.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new ForumNotificationController();

/**
 * Forum Notification Routes - /api/v1/forum/notifications/*
 *
 * All routes require authentication
 *
 * Endpoints:
 * - GET /notifications - Get user's notifications
 * - GET /notifications/unread-count - Get unread count
 * - POST /notifications/read/:id - Mark single notification as read
 * - POST /notifications/read-all - Mark all notifications as read
 * - DELETE /notifications/:id - Delete/dismiss notification
 */

// All notification routes require authentication
router.use(authenticate);

// ============================================================================
// Notification Endpoints
// ============================================================================

// Get notifications for current user
router.get('/', controller.getNotifications.bind(controller));

// Get unread notification count
router.get('/unread-count', controller.getUnreadCount.bind(controller));

// Mark single notification as read
router.post('/read/:id', controller.markAsRead.bind(controller));

// Mark all notifications as read
router.post('/read-all', controller.markAllAsRead.bind(controller));

// Delete/dismiss notification
router.delete('/:id', controller.deleteNotification.bind(controller));

export default router;

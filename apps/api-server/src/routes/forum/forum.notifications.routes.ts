/**
 * Forum Notification Routes
 * Phase 13: Forum Notification System
 * Phase 15-B: SSE Realtime Stream
 *
 * Routes: /api/v1/forum/notifications/*
 */

import { Router, Request, Response } from 'express';
import { ForumNotificationController } from '../../controllers/forum/ForumNotificationController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { notificationEventHub } from '../../services/forum/NotificationEventHub.js';
import { v4 as uuidv4 } from 'uuid';

const router: Router = Router();
const controller = new ForumNotificationController();

/**
 * Forum Notification Routes - /api/v1/forum/notifications/*
 *
 * All routes require authentication
 *
 * Endpoints:
 * - GET /notifications/stream - SSE stream for realtime notifications (Phase 15-B)
 * - GET /notifications - Get user's notifications
 * - GET /notifications/unread-count - Get unread count
 * - POST /notifications/read/:id - Mark single notification as read
 * - POST /notifications/read-all - Mark all notifications as read
 * - DELETE /notifications/:id - Delete/dismiss notification
 */

// All notification routes require authentication
router.use(authenticate);

// ============================================================================
// SSE Stream Endpoint (Phase 15-B)
// ============================================================================

/**
 * GET /notifications/stream
 *
 * Server-Sent Events stream for realtime notifications.
 * Client receives notification events as they occur.
 *
 * Query params:
 * - organizationId: Optional org filter for yaksa multi-tenant
 *
 * Events:
 * - heartbeat: Keepalive every 30s
 * - notification: New notification
 */
router.get('/stream', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const clientId = uuidv4();
  const userId = user.id;
  const organizationId = req.query.organizationId as string | undefined;

  console.log(`[SSE] New connection request from user ${userId}`);

  // Subscribe to notification events
  notificationEventHub.subscribe(clientId, userId, res, organizationId);

  // Handle request abort
  req.on('close', () => {
    notificationEventHub.unsubscribe(clientId);
  });
});

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

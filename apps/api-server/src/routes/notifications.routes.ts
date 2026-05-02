/**
 * Common Notification Routes
 * WO-O4O-NOTIFICATION-CORE-BASELINE-V1
 *
 * Routes: /api/v1/notifications/*
 *
 * Endpoints:
 * - GET    /notifications/stream         — SSE stream for realtime notifications
 * - GET    /notifications                — Get user's notifications (paginated)
 * - GET    /notifications/unread-count   — Get unread count
 * - POST   /notifications/read           — Mark one or many notifications as read
 *
 * All routes require authentication.
 *
 * Forum-domain notifications still live under /api/v1/forum/notifications/* —
 * this set covers everything else (LMS, commerce, settlement, member events, …).
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.middleware.js';
import { notificationService } from '../services/NotificationService.js';
import { notificationEventHub } from '../services/forum/NotificationEventHub.js';
import logger from '../utils/logger.js';

const router: Router = Router();

router.use(authenticate);

// ============================================================================
// SSE Stream Endpoint
// ============================================================================

router.get('/stream', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) {
    res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return;
  }

  const clientId = uuidv4();
  const userId = user.id;
  const serviceKey = (req.query.serviceKey as string | undefined) || undefined;
  const organizationId = (req.query.organizationId as string | undefined) || undefined;

  logger.debug(`[Notifications SSE] connection from user ${userId} (serviceKey=${serviceKey})`);

  notificationEventHub.subscribe(clientId, userId, res, { serviceKey, organizationId });

  req.on('close', () => {
    notificationEventHub.unsubscribe(clientId);
  });
});

// ============================================================================
// Notification Endpoints
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const isReadParam = req.query.isRead;
    const isRead =
      isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;
    const serviceKey = (req.query.serviceKey as string | undefined) || undefined;
    const organizationId = (req.query.organizationId as string | undefined) || undefined;

    const result = await notificationService.listNotifications({
      userId: user.id,
      page,
      limit,
      isRead,
      serviceKey,
      organizationId,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('[Notifications] list failed', { error: error?.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      code: 'NOTIFICATION_LIST_FAILED',
    });
  }
});

router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const serviceKey = (req.query.serviceKey as string | undefined) || undefined;
    const organizationId = (req.query.organizationId as string | undefined) || undefined;

    const count = await notificationService.getUnreadCount(user.id, {
      serviceKey,
      organizationId,
    });

    res.json({ success: true, data: { count } });
  } catch (error: any) {
    logger.error('[Notifications] unread-count failed', { error: error?.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count',
      code: 'NOTIFICATION_UNREAD_COUNT_FAILED',
    });
  }
});

/**
 * POST /notifications/read
 *
 * Body:
 *   { notificationIds: string[] }   — mark these as read
 *   { all: true }                   — mark all as read for current user
 */
router.post('/read', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const body = req.body ?? {};

    if (body.all === true) {
      const updated = await notificationService.markAllAsRead(user.id);
      res.json({ success: true, data: { updated } });
      return;
    }

    const ids = Array.isArray(body.notificationIds) ? body.notificationIds : [];
    if (ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'notificationIds[] or { all: true } required',
        code: 'NOTIFICATION_READ_INVALID_BODY',
      });
      return;
    }

    const updated = await notificationService.markManyAsRead(ids, user.id);
    res.json({ success: true, data: { updated } });
  } catch (error: any) {
    logger.error('[Notifications] read failed', { error: error?.message });
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      code: 'NOTIFICATION_READ_FAILED',
    });
  }
});

export default router;

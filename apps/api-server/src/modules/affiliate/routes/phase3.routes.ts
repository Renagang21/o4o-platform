import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { adminAuth } from '../../../middleware/admin.middleware';
import { rateLimitMiddleware } from '../../../middleware/rateLimit.middleware';

const router: Router = Router();

// Initialize controllers
const analyticsController = new AnalyticsController();
const notificationController = new NotificationController();

// Analytics Routes
router.get(
  '/analytics/clicks',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 60 }),
  analyticsController.getClickAnalytics
);

router.get(
  '/analytics/performance',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 60 }),
  analyticsController.getPerformanceAnalytics
);

router.get(
  '/analytics/funnel',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 60 }),
  analyticsController.getFunnelAnalytics
);

router.get(
  '/analytics/realtime',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 120 }), // Higher limit for real-time
  analyticsController.getRealtimeAnalytics
);

router.get(
  '/analytics/predictions',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 30 }),
  analyticsController.getPredictiveAnalytics
);

router.get(
  '/dashboard/realtime',
  authenticate,
  adminAuth,
  rateLimitMiddleware({ windowMs: 60000, max: 120 }),
  analyticsController.getRealtimeDashboard
);

router.post(
  '/reports/generate',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  analyticsController.generateReport
);

// Notification Routes
router.get(
  '/notifications',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 60 }),
  notificationController.getNotifications
);

router.patch(
  '/notifications/:id/read',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  notificationController.markAsRead
);

router.patch(
  '/notifications/read-all',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 20 }),
  notificationController.markAllAsRead
);

router.get(
  '/notifications/stats',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 60 }),
  notificationController.getNotificationStats
);

router.post(
  '/notifications/broadcast',
  authenticate,
  adminAuth,
  rateLimitMiddleware({ windowMs: 60000, max: 5 }),
  notificationController.broadcastNotification
);

export default router;
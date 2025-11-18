/**
 * NotificationController
 * Phase PD-7: Automation & Notification Foundation
 *
 * API endpoints for managing user notifications
 */

import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/NotificationService.js';
import { NotificationChannel } from '../entities/Notification.js';
import logger from '../utils/logger.js';

export class NotificationController {
  /**
   * GET /api/v2/notifications
   * List notifications with pagination and filtering
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      const type = req.query.type as string | undefined;
      const channel = req.query.channel as NotificationChannel | undefined;

      const result = await notificationService.listNotifications({
        userId,
        page,
        limit,
        isRead,
        type: type as any,
        channel,
      });

      res.json({
        success: true,
        data: result.notifications,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      logger.error('[PD-7] Error getting notifications:', error);
      next(error);
    }
  };

  /**
   * GET /api/v2/notifications/unread-count
   * Get unread notification count for current user
   */
  getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const channel = req.query.channel as NotificationChannel | undefined;
      const count = await notificationService.getUnreadCount(userId, channel);

      res.json({
        success: true,
        data: {
          count,
          channel: channel || 'all',
        },
      });
    } catch (error) {
      logger.error('[PD-7] Error getting unread count:', error);
      next(error);
    }
  };

  /**
   * POST /api/v2/notifications/:id/read
   * Mark a notification as read
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, userId);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found or does not belong to user'
        });
        return;
      }

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } catch (error) {
      logger.error('[PD-7] Error marking notification as read:', error);
      next(error);
    }
  };

  /**
   * POST /api/v2/notifications/read-all
   * Mark all notifications as read for current user
   */
  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const count = await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        data: {
          markedCount: count,
        },
        message: `${count} notifications marked as read`,
      });
    } catch (error) {
      logger.error('[PD-7] Error marking all notifications as read:', error);
      next(error);
    }
  };

  /**
   * GET /api/v2/notifications/recent
   * Get recent notifications (for dashboard widgets)
   */
  getRecentNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const notifications = await notificationService.getRecentNotificationsSummary(userId, limit);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      logger.error('[PD-7] Error getting recent notifications:', error);
      next(error);
    }
  };

  /**
   * GET /api/v2/notifications/stats
   * Get notification statistics
   */
  getNotificationStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const stats = await notificationService.getNotificationStats(userId, days);

      res.json({
        success: true,
        data: {
          stats,
          period: `Last ${days} days`,
        },
      });
    } catch (error) {
      logger.error('[PD-7] Error getting notification stats:', error);
      next(error);
    }
  };
}

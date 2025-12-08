/**
 * ForumNotificationController
 * Phase 13: Forum Notification System
 *
 * API Controller for forum notifications
 */

import { Request, Response } from 'express';
import { forumNotificationService } from '../../services/forum/ForumNotificationService.js';
import { ForumNotificationType } from '../../entities/ForumNotification.js';

export class ForumNotificationController {
  /**
   * GET /notifications
   * Get notifications for the current user
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const type = req.query.type as ForumNotificationType | undefined;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      const organizationId = req.query.organizationId as string | undefined;

      const result = await forumNotificationService.getNotifications(userId, {
        page,
        limit,
        type,
        isRead,
        organizationId,
      });

      // Add message to each notification
      const notificationsWithMessages = result.notifications.map((notification) => ({
        ...notification,
        message: notification.getMessage(),
      }));

      res.json({
        success: true,
        data: notificationsWithMessages,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  }

  /**
   * GET /notifications/unread-count
   * Get unread notification count for the current user
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const organizationId = req.query.organizationId as string | undefined;
      const count = await forumNotificationService.getUnreadCount(userId, organizationId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  }

  /**
   * POST /notifications/read/:id
   * Mark a notification as read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const notificationId = req.params.id;
      const notification = await forumNotificationService.markAsRead(notificationId, userId);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  /**
   * POST /notifications/read-all
   * Mark all notifications as read for the current user
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const organizationId = req.body.organizationId as string | undefined;
      const count = await forumNotificationService.markAllAsRead(userId, organizationId);

      res.json({
        success: true,
        data: { markedCount: count },
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }

  /**
   * DELETE /notifications/:id
   * Delete a notification (optional endpoint)
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // For now, just mark as read instead of actually deleting
      // This preserves notification history
      const notificationId = req.params.id;
      const notification = await forumNotificationService.markAsRead(notificationId, userId);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Notification removed',
      });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
}

// Export singleton instance
export const forumNotificationController = new ForumNotificationController();

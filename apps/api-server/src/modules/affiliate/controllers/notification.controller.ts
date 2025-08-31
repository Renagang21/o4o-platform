import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../dto/response.dto';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * GET /api/v1/affiliate/notifications
   * Get notifications with pagination
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const params = {
        affiliateUserId: user.role === 'admin' && req.query.affiliateUserId ? 
          req.query.affiliateUserId as string : 
          user.affiliateId,
        read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
        type: req.query.type as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      // Non-admin can only view their own notifications
      if (user.role !== 'admin' && params.affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own notifications',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.notificationService.getNotifications(params);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Notifications retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get notifications',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * PATCH /api/v1/affiliate/notifications/:id/read
   * Mark notification as read
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      await this.notificationService.markAsRead(id, user.affiliateId);

      const response: ApiResponse = {
        success: true,
        message: 'Notification marked as read',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to mark notification as read',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('not found') ? 404 : 500).json(response);
    }
  };

  /**
   * PATCH /api/v1/affiliate/notifications/read-all
   * Mark all notifications as read
   */
  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;

      await this.notificationService.markAllAsRead(user.affiliateId);

      const response: ApiResponse = {
        success: true,
        message: 'All notifications marked as read',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to mark all notifications as read',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/notifications/stats
   * Get notification statistics
   */
  getNotificationStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const affiliateUserId = user.role === 'admin' && req.query.affiliateUserId ? 
        req.query.affiliateUserId as string : 
        user.affiliateId;

      if (user.role !== 'admin' && affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own notification stats',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const stats = await this.notificationService.getNotificationStats(affiliateUserId);

      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'Notification stats retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get notification stats',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * POST /api/v1/affiliate/notifications/broadcast
   * Send broadcast notification to multiple affiliates (admin only)
   */
  broadcastNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      
      // Admin only
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { affiliateUserIds, type, title, message, priority, actionUrl, actionText } = req.body;

      if (!affiliateUserIds || !Array.isArray(affiliateUserIds) || affiliateUserIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Affiliate user IDs are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!type || !title || !message) {
        res.status(400).json({
          success: false,
          error: 'Type, title, and message are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await this.notificationService.createBulkNotifications(
        affiliateUserIds,
        { type, title, message, priority, actionUrl, actionText, data: {} }
      );

      const response: ApiResponse = {
        success: true,
        message: `Broadcast sent to ${affiliateUserIds.length} affiliates`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to send broadcast notification',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };
}
import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../dto/response.dto';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * GET /api/v1/partner/notifications
   * Get notifications with pagination
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const params = {
        partnerUserId: user.role === 'admin' && req.query.partnerUserId ? 
          req.query.partnerUserId as string : 
          user.partnerId,
        read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
        type: req.query.type as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      // Non-admin can only view their own notifications
      if (user.role !== 'admin' && params.partnerUserId !== user.partnerId) {
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
   * PATCH /api/v1/partner/notifications/:id/read
   * Mark notification as read
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      await this.notificationService.markAsRead(id, user.partnerId);

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
   * PATCH /api/v1/partner/notifications/read-all
   * Mark all notifications as read
   */
  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;

      await this.notificationService.markAllAsRead(user.partnerId);

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
   * GET /api/v1/partner/notifications/stats
   * Get notification statistics
   */
  getNotificationStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const partnerUserId = user.role === 'admin' && req.query.partnerUserId ? 
        req.query.partnerUserId as string : 
        user.partnerId;

      if (user.role !== 'admin' && partnerUserId !== user.partnerId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own notification stats',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const stats = await this.notificationService.getNotificationStats(partnerUserId);

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
   * POST /api/v1/partner/notifications/broadcast
   * Send broadcast notification to multiple partners (admin only)
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

      const { partnerUserIds, type, title, message, priority, actionUrl, actionText } = req.body;

      if (!partnerUserIds || !Array.isArray(partnerUserIds) || partnerUserIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Partner user IDs are required',
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
        partnerUserIds,
        { type, title, message, priority, actionUrl, actionText, data: {} }
      );

      const response: ApiResponse = {
        success: true,
        message: `Broadcast sent to ${partnerUserIds.length} partners`,
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
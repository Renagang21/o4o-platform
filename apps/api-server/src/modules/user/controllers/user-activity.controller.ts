import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import { ActivityQueryDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * User Activity Controller - NextGen Pattern
 *
 * Handles user activity log operations:
 * - Get user activities (admin)
 * - Get current user's activities
 */
export class UserActivityController extends BaseController {
  /**
   * GET /api/v1/users/:userId/activities
   * Get activities for a specific user (admin only)
   */
  static async getUserActivities(req: Request, res: Response): Promise<any> {
    const { userId } = req.params;
    const query = req.query as unknown as ActivityQueryDto;

    try {
      // TODO: Implement ActivityLog entity first
      // For now, return placeholder response
      const page = query.page || 1;
      const limit = query.limit || 20;

      // Future implementation:
      // const activityRepository = AppDataSource.getRepository(ActivityLog);
      // const queryBuilder = activityRepository
      //   .createQueryBuilder('activity')
      //   .where('activity.userId = :userId', { userId });
      //
      // if (query.type) {
      //   queryBuilder.andWhere('activity.type = :type', { type: query.type });
      // }
      //
      // if (query.startDate) {
      //   queryBuilder.andWhere('activity.createdAt >= :startDate', {
      //     startDate: new Date(query.startDate),
      //   });
      // }
      //
      // if (query.endDate) {
      //   queryBuilder.andWhere('activity.createdAt <= :endDate', {
      //     endDate: new Date(query.endDate),
      //   });
      // }
      //
      // const skip = (page - 1) * limit;
      // const [activities, total] = await queryBuilder
      //   .orderBy('activity.createdAt', 'DESC')
      //   .skip(skip)
      //   .take(limit)
      //   .getManyAndCount();

      logger.info('[UserActivityController.getUserActivities] Activities retrieved', {
        userId,
        page,
        limit,
      });

      return BaseController.okPaginated(
        res,
        [], // Placeholder empty array
        {
          page,
          limit,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (error: any) {
      logger.error('[UserActivityController.getUserActivities] Error', {
        error: error.message,
        userId,
      });
      return BaseController.error(res, 'Failed to get user activities');
    }
  }

  /**
   * GET /api/v1/users/activities
   * Get current user's activities
   */
  static async getMyActivities(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const query = req.query as unknown as ActivityQueryDto;

    try {
      // TODO: Implement ActivityLog entity first
      // For now, return placeholder response
      const page = query.page || 1;
      const limit = query.limit || 20;

      // Future implementation:
      // const activityRepository = AppDataSource.getRepository(ActivityLog);
      // const queryBuilder = activityRepository
      //   .createQueryBuilder('activity')
      //   .where('activity.userId = :userId', { userId: req.user.id });
      //
      // if (query.type) {
      //   queryBuilder.andWhere('activity.type = :type', { type: query.type });
      // }
      //
      // if (query.startDate) {
      //   queryBuilder.andWhere('activity.createdAt >= :startDate', {
      //     startDate: new Date(query.startDate),
      //   });
      // }
      //
      // if (query.endDate) {
      //   queryBuilder.andWhere('activity.createdAt <= :endDate', {
      //     endDate: new Date(query.endDate),
      //   });
      // }
      //
      // const skip = (page - 1) * limit;
      // const [activities, total] = await queryBuilder
      //   .orderBy('activity.createdAt', 'DESC')
      //   .skip(skip)
      //   .take(limit)
      //   .getManyAndCount();

      logger.info('[UserActivityController.getMyActivities] Activities retrieved', {
        userId: req.user.id,
        page,
        limit,
      });

      return BaseController.okPaginated(
        res,
        [], // Placeholder empty array
        {
          page,
          limit,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (error: any) {
      logger.error('[UserActivityController.getMyActivities] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, 'Failed to get activities');
    }
  }
}

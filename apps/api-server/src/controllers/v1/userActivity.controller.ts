import { Request, Response } from 'express';
import AppDataSource from '../../database/data-source';
import { UserActivityLog, ActivityType, ActivityCategory } from '../../entities/UserActivityLog';
import { User } from '../../entities/User';
import { validate } from 'class-validator';
import { Between, FindManyOptions } from 'typeorm';
import { 
  ApiResponse, 
  UserActivityLogResponse, 
  UserActivityLogListResponse,
  CreateUserActivityRequest,
  UserActivitySummaryResponse,
  UserActivityLogParams,
  UserActivityLogQuery,
  UserStatisticsQuery
} from '../../types/userManagement.types';

export class UserActivityController {
  private static userActivityRepository = AppDataSource.getRepository(UserActivityLog);
  private static userRepository = AppDataSource.getRepository(User);

  static async getUserActivityLog(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { 
        page = '1', 
        limit = '20', 
        category, 
        type, 
        startDate, 
        endDate,
        includeSystemGenerated = 'true'
      } = req.query;

      const user = await UserActivityController.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const whereConditions: any = { userId };

      if (category && Object.values(ActivityCategory).includes(category as ActivityCategory)) {
        whereConditions.activityCategory = category;
      }

      if (type && Object.values(ActivityType).includes(type as ActivityType)) {
        whereConditions.activityType = type;
      }

      if (includeSystemGenerated === 'false') {
        whereConditions.isSystemGenerated = false;
      }

      if (startDate && endDate) {
        whereConditions.created_at = Between(new Date(startDate as string), new Date(endDate as string));
      } else if (startDate) {
        whereConditions.created_at = Between(new Date(startDate as string), new Date());
      }

      const findOptions: FindManyOptions<UserActivityLog> = {
        where: whereConditions,
        relations: ['performedBy'],
        order: { createdAt: 'DESC' },
        skip: offset,
        take: limitNum
      };

      const [activities, total] = await UserActivityController.userActivityRepository.findAndCount(findOptions);

      const totalPages = Math.ceil(total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.status(200).json({
        success: true,
        data: {
          activities: activities.map(activity => ({
            id: activity.id,
            activityType: activity.activityType,
            activityCategory: activity.activityCategory,
            title: activity.getDisplayTitle(),
            description: activity.getDisplayDescription(),
            ipAddress: activity.ipAddress,
            userAgent: activity.userAgent,
            metadata: activity.metadata,
            isSystemGenerated: activity.isSystemGenerated,
            isSecurityRelated: activity.isSecurityRelated(),
            isAdminAction: activity.isAdminAction(),
            performedBy: activity.performedBy ? {
              id: activity.performedBy.id,
              email: activity.performedBy.email,
              firstName: activity.performedBy.firstName,
              lastName: activity.performedBy.lastName
            } : null,
            createdAt: activity.created_at
          })),
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems: total,
            itemsPerPage: limitNum,
            hasNextPage,
            hasPrevPage
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async createUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { activityType, title, description, metadata, ipAddress, userAgent } = req.body;

      const user = await UserActivityController.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      if (!Object.values(ActivityType).includes(activityType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid activity type'
        });
        return;
      }

      let activityCategory: ActivityCategory;
      if (activityType.includes('login') || activityType.includes('logout') || activityType.includes('password')) {
        activityCategory = ActivityCategory.AUTHENTICATION;
      } else if (activityType.includes('profile') || activityType.includes('avatar')) {
        activityCategory = ActivityCategory.PROFILE;
      } else if (activityType.includes('admin') || activityType.includes('role') || activityType.includes('permission')) {
        activityCategory = ActivityCategory.ADMIN;
      } else if (activityType.includes('two_factor') || activityType.includes('api_key')) {
        activityCategory = ActivityCategory.SECURITY;
      } else {
        activityCategory = ActivityCategory.SYSTEM;
      }

      const activity = UserActivityController.userActivityRepository.create({
        userId,
        activityType,
        activityCategory,
        title,
        description,
        metadata,
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.get('User-Agent'),
        isSystemGenerated: false,
        performedByUserId: (req as any).user?.id
      });

      const errors = await validate(activity);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints
          }))
        });
        return;
      }

      const savedActivity = await UserActivityController.userActivityRepository.save(activity);

      res.status(201).json({
        success: true,
        data: {
          id: savedActivity.id,
          activityType: savedActivity.activityType,
          activityCategory: savedActivity.activityCategory,
          title: savedActivity.getDisplayTitle(),
          description: savedActivity.getDisplayDescription(),
          createdAt: savedActivity.created_at
        },
        message: 'Activity logged successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getActivityCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = Object.values(ActivityCategory).map(category => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
      }));

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getActivityTypes(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;

      let types = Object.values(ActivityType);

      if (category && Object.values(ActivityCategory).includes(category as ActivityCategory)) {
        const categoryTypes: Record<ActivityCategory, ActivityType[]> = {
          [ActivityCategory.AUTHENTICATION]: [
            ActivityType.LOGIN, 
            ActivityType.LOGOUT, 
            ActivityType.PASSWORD_CHANGE, 
            ActivityType.EMAIL_CHANGE
          ],
          [ActivityCategory.PROFILE]: [
            ActivityType.PROFILE_UPDATE, 
            ActivityType.AVATAR_UPDATE, 
            ActivityType.BUSINESS_INFO_UPDATE
          ],
          [ActivityCategory.SECURITY]: [
            ActivityType.PASSWORD_RESET_REQUEST, 
            ActivityType.PASSWORD_RESET_COMPLETE,
            ActivityType.TWO_FACTOR_ENABLE, 
            ActivityType.TWO_FACTOR_DISABLE,
            ActivityType.API_KEY_CREATE, 
            ActivityType.API_KEY_DELETE, 
            ActivityType.API_ACCESS_DENIED
          ],
          [ActivityCategory.ADMIN]: [
            ActivityType.ROLE_CHANGE, 
            ActivityType.PERMISSION_GRANT, 
            ActivityType.PERMISSION_REVOKE,
            ActivityType.ADMIN_APPROVAL, 
            ActivityType.ADMIN_REJECTION, 
            ActivityType.ADMIN_NOTE_ADD,
            ActivityType.ACCOUNT_ACTIVATION, 
            ActivityType.ACCOUNT_DEACTIVATION,
            ActivityType.ACCOUNT_SUSPENSION, 
            ActivityType.ACCOUNT_UNSUSPENSION
          ],
          [ActivityCategory.SYSTEM]: [
            ActivityType.EMAIL_VERIFICATION, 
            ActivityType.DATA_EXPORT, 
            ActivityType.DATA_DELETION, 
            ActivityType.GDPR_REQUEST
          ]
        };

        types = categoryTypes[category as ActivityCategory] || types;
      }

      const typesWithLabels = types.map(type => ({
        value: type,
        label: type.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      }));

      res.status(200).json({
        success: true,
        data: typesWithLabels
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getActivitySummary(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { days = '30' } = req.query;

      const user = await UserActivityController.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const daysNum = parseInt(days as string, 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const activities = await UserActivityController.userActivityRepository.find({
        where: {
          userId,
          createdAt: Between(startDate, new Date())
        }
      });

      const summary = {
        totalActivities: activities.length,
        securityRelated: activities.filter(a => {
          const temp = new UserActivityLog();
          temp.activityType = a.activityType;
          return temp.isSecurityRelated();
        }).length,
        adminActions: activities.filter(a => a.isAdminAction()).length,
        systemGenerated: activities.filter(a => a.isSystemGenerated).length,
        byCategory: Object.values(ActivityCategory).reduce((acc, category) => {
          acc[category] = activities.filter(a => a.activityCategory === category).length;
          return acc;
        }, {} as Record<ActivityCategory, number>),
        recentActivity: activities
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
          .slice(0, 5)
          .map(activity => ({
            id: activity.id,
            type: activity.activityType,
            title: activity.title,
            createdAt: activity.created_at
          }))
      };

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User, UserRole, UserStatus } from '../../entities/User.js';
import { UserActivityLog, ActivityType, ActivityCategory } from '../../entities/UserActivityLog.js';
import { BetaUser, BetaUserStatus } from '../../entities/BetaUser.js';
import { Between, In } from 'typeorm';

export class UserStatisticsController {
  private static userRepository = AppDataSource.getRepository(User);
  private static activityRepository = AppDataSource.getRepository(UserActivityLog);
  private static betaUserRepository = AppDataSource.getRepository(BetaUser);

  static async getUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { days = '30' } = req.query;
      const daysNum = parseInt(days as string, 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      // User counts by role
      const usersByRole = await Promise.all(
        Object.values(UserRole).map(async (role) => ({
          role,
          count: await UserStatisticsController.userRepository.count({ where: { role } }),
          label: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')
        }))
      );

      // User counts by status
      const usersByStatus = await Promise.all(
        Object.values(UserStatus).map(async (status) => ({
          status,
          count: await UserStatisticsController.userRepository.count({ where: { status } }),
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
        }))
      );

      // Beta user statistics
      const betaUsersByStatus = await Promise.all(
        Object.values(BetaUserStatus).map(async (status) => ({
          status,
          count: await UserStatisticsController.betaUserRepository.count({ where: { status } }),
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
        }))
      );

      // New user registrations over time
      const registrations = await UserStatisticsController.getUserRegistrationStats(daysNum);

      // User activity statistics
      const activityStats = await UserStatisticsController.getActivityStatistics(daysNum);

      // Geographic distribution (based on activity logs)
      const geographicData = await UserStatisticsController.getGeographicDistribution(daysNum);

      // Top active users
      const topActiveUsers = await UserStatisticsController.getTopActiveUsers(daysNum, 10);

      // Security-related statistics
      const securityStats = await UserStatisticsController.getSecurityStatistics(daysNum);

      // Totals
      const totalUsers = await UserStatisticsController.userRepository.count();
      const totalBetaUsers = await UserStatisticsController.betaUserRepository.count();
      const totalActivities = await UserStatisticsController.activityRepository.count({
        where: { createdAt: Between(startDate, new Date()) }
      });

      // Active users (users with activity in the period)
      const activeUserIds = await UserStatisticsController.activityRepository
        .createQueryBuilder('activity')
        .select('DISTINCT activity.userId')
        .where('activity.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate: new Date()
        })
        .getRawMany();

      const activeUsersCount = activeUserIds.length;

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalUsers,
            totalBetaUsers,
            totalActivities,
            activeUsers: activeUsersCount,
            period: `${daysNum} days`
          },
          usersByRole,
          usersByStatus,
          betaUsersByStatus,
          registrations,
          activity: activityStats,
          geographic: geographicData,
          topActiveUsers,
          security: securityStats
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics',
        error: error.message || 'Internal server error'
      });
    }
  }

  static async getUserRegistrationStats(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const registrations = await UserStatisticsController.userRepository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt) as date, COUNT(*) as count')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Fill in missing dates with zero counts
    const filledData = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existing = registrations.find(r => r.date === dateStr);
      
      filledData.push({
        date: dateStr,
        count: existing ? parseInt(existing.count, 10) : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      daily: filledData,
      total: registrations.reduce((sum, r) => sum + parseInt(r.count, 10), 0)
    };
  }

  static async getActivityStatistics(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Activities by category
    const activitiesByCategory = await Promise.all(
      Object.values(ActivityCategory).map(async (category) => ({
        category,
        count: await UserStatisticsController.activityRepository.count({
          where: {
            activityCategory: category,
            createdAt: Between(startDate, new Date())
          }
        }),
        label: category.charAt(0).toUpperCase() + category.slice(1)
      }))
    );

    // Daily activity counts
    const dailyActivity = await UserStatisticsController.activityRepository
      .createQueryBuilder('activity')
      .select('DATE(activity.createdAt) as date, COUNT(*) as count')
      .where('activity.createdAt >= :startDate', { startDate })
      .groupBy('DATE(activity.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Most common activity types
    const topActivityTypes = await UserStatisticsController.activityRepository
      .createQueryBuilder('activity')
      .select('activity.activityType as type, COUNT(*) as count')
      .where('activity.createdAt >= :startDate', { startDate })
      .groupBy('activity.activityType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      byCategory: activitiesByCategory,
      daily: dailyActivity.map(d => ({
        date: d.date,
        count: parseInt(d.count, 10)
      })),
      topTypes: topActivityTypes.map(t => ({
        type: t.type,
        count: parseInt(t.count, 10),
        label: t.type.split('_').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      }))
    };
  }

  static async getGeographicDistribution(days: number) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // PostgreSQL JSON query syntax
      const locations = await UserStatisticsController.activityRepository
        .createQueryBuilder('activity')
        .select("(activity.metadata::json->'location'->>'country') as country, COUNT(*) as count")
        .where('activity.createdAt >= :startDate', { startDate })
        .andWhere("activity.metadata::json->'location'->>'country' IS NOT NULL")
        .groupBy('country')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();

      const cities = await UserStatisticsController.activityRepository
        .createQueryBuilder('activity')
        .select("(activity.metadata::json->'location'->>'city') as city, (activity.metadata::json->'location'->>'country') as country, COUNT(*) as count")
        .where('activity.createdAt >= :startDate', { startDate })
        .andWhere("activity.metadata::json->'location'->>'city' IS NOT NULL")
        .groupBy('city, country')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();

      return {
        countries: locations.map(l => ({
          country: l.country,
          count: parseInt(l.count, 10)
        })),
        cities: cities.map(c => ({
          city: c.city,
          country: c.country,
          count: parseInt(c.count, 10)
        }))
      };
    } catch (error) {
      // Return empty data if JSON queries fail
      return {
        countries: [],
        cities: []
      };
    }
  }

  static async getTopActiveUsers(days: number, limit: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activeUsers = await UserStatisticsController.activityRepository
      .createQueryBuilder('activity')
      .leftJoin('activity.user', 'user')
      .select([
        'user.id as userId',
        'user.email as email', 
        'user.firstName as firstName',
        'user.lastName as lastName',
        'user.role as role',
        'COUNT(*) as activityCount'
      ])
      .where('activity.createdAt >= :startDate', { startDate })
      .groupBy('user.id, user.email, user.firstName, user.lastName, user.role')
      .orderBy('activityCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return activeUsers.map(user => ({
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      activityCount: parseInt(user.activityCount, 10)
    }));
  }

  static async getSecurityStatistics(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const securityActivityTypes = [
      ActivityType.LOGIN,
      ActivityType.LOGOUT, 
      ActivityType.PASSWORD_CHANGE,
      ActivityType.PASSWORD_RESET_REQUEST,
      ActivityType.PASSWORD_RESET_COMPLETE,
      ActivityType.TWO_FACTOR_ENABLE,
      ActivityType.TWO_FACTOR_DISABLE,
      ActivityType.API_ACCESS_DENIED
    ];

    const securityActivities = await UserStatisticsController.activityRepository.count({
      where: {
        activityType: In(securityActivityTypes),
        createdAt: Between(startDate, new Date())
      }
    });

    const failedLogins = await UserStatisticsController.activityRepository
      .createQueryBuilder('activity')
      .where('activity.activityType = :type', { type: ActivityType.LOGIN })
      .andWhere('activity.createdAt >= :startDate', { startDate })
      .andWhere("activity.isError = true OR (activity.metadata::json->>'success') = 'false'")
      .getCount();

    const suspiciousIPs = await UserStatisticsController.activityRepository
      .createQueryBuilder('activity')
      .select('activity.ipAddress as ip, COUNT(DISTINCT activity.userId) as userCount, COUNT(*) as activityCount')
      .where('activity.createdAt >= :startDate', { startDate })
      .andWhere('activity.ipAddress IS NOT NULL')
      .groupBy('activity.ipAddress')
      .having('COUNT(DISTINCT activity.userId) > :threshold', { threshold: 5 })
      .orderBy('userCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalSecurityActivities: securityActivities,
      failedLogins,
      suspiciousIPs: suspiciousIPs.map(ip => ({
        ipAddress: ip.ip,
        userCount: parseInt(ip.userCount, 10),
        activityCount: parseInt(ip.activityCount, 10)
      }))
    };
  }

  static async getUserGrowthTrend(req: Request, res: Response): Promise<void> {
    try {
      const { months = '12' } = req.query;
      const monthsNum = parseInt(months as string, 10);

      // Calculate start date in JavaScript for PostgreSQL compatibility
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsNum);

      const growth = await UserStatisticsController.userRepository
        .createQueryBuilder('user')
        .select('EXTRACT(YEAR FROM user.createdAt) as year, EXTRACT(MONTH FROM user.createdAt) as month, COUNT(*) as count')
        .where("user.createdAt >= :startDate", { startDate })
        .groupBy('EXTRACT(YEAR FROM user.createdAt), EXTRACT(MONTH FROM user.createdAt)')
        .orderBy('year, month', 'ASC')
        .getRawMany();

      const formattedGrowth = growth.map(g => ({
        year: parseInt(g.year, 10),
        month: parseInt(g.month, 10),
        count: parseInt(g.count, 10),
        monthName: new Date(parseInt(g.year, 10), parseInt(g.month, 10) - 1).toLocaleString('default', { month: 'long' })
      }));

      // Calculate cumulative growth
      let cumulative = 0;
      const cumulativeGrowth = formattedGrowth.map(g => ({
        ...g,
        cumulative: cumulative += g.count
      }));

      res.status(200).json({
        success: true,
        data: {
          monthly: formattedGrowth,
          cumulative: cumulativeGrowth,
          period: `${monthsNum} months`
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

  static async getRetentionStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { cohortMonths = '6' } = req.query;
      const monthsNum = parseInt(cohortMonths as string, 10);

      // This is a simplified retention calculation
      // In a production system, you might want to use more sophisticated cohort analysis
      
      const retentionData = [];
      const now = new Date();

      for (let i = 0; i < monthsNum; i++) {
        const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const cohortUsers = await UserStatisticsController.userRepository.count({
          where: {
            createdAt: Between(cohortStart, cohortEnd)
          }
        });

        const activeInPeriod = await UserStatisticsController.activityRepository
          .createQueryBuilder('activity')
          .leftJoin('activity.user', 'user')
          .where('user.createdAt BETWEEN :cohortStart AND :cohortEnd', { cohortStart, cohortEnd })
          .andWhere('activity.createdAt >= :periodStart', { 
            periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          })
          .select('COUNT(DISTINCT activity.userId)')
          .getRawOne();

        const retentionRate = cohortUsers > 0 ? 
          (parseInt(activeInPeriod.count, 10) / cohortUsers) * 100 : 0;

        retentionData.push({
          cohortMonth: cohortStart.toISOString().substring(0, 7),
          totalUsers: cohortUsers,
          activeUsers: parseInt(activeInPeriod.count, 10),
          retentionRate: Math.round(retentionRate * 100) / 100
        });
      }

      res.status(200).json({
        success: true,
        data: {
          cohorts: retentionData.reverse(),
          period: `${monthsNum} months`
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
}
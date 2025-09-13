import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AppDataSource } from '../database/connection';
import { User, UserStatus } from '../entities/User';
import { AuthRequest } from '../types/auth';
import { Like, SelectQueryBuilder } from 'typeorm';

export const getPendingUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, businessType } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const userRepository = AppDataSource.getRepository(User);
    const queryBuilder = userRepository.createQueryBuilder('user');

    // Base filter
    queryBuilder.where('user.status = :status', { status: UserStatus.PENDING });

    // Business type filter
    if (businessType && businessType !== 'all') {
      queryBuilder.andWhere("user.businessInfo->>'businessType' = :businessType", {
        businessType
      });
    }

    // Get users with pagination
    const [users, total] = await queryBuilder
      .select([
        'user.id',
        'user.email', 
        'user.name',
        'user.role',
        'user.status',
        'user.businessInfo',
        'user.createdAt',
        'user.updatedAt',
        'user.approvedAt',
        'user.approvedBy'
      ])
      .orderBy('user.createdAt', 'DESC')
      .offset(offset)
      .limit(Number(limit))
      .getManyAndCount();

    res.json({
      users,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / Number(limit)),
        count: users.length,
        totalUsers: total
      }
    });

  } catch (error) {
    // Error log removed
    res.status(500).json({
      error: 'Internal server error',
      code: 'FETCH_PENDING_USERS_FAILED'
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      businessType, 
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);

    const userRepository = AppDataSource.getRepository(User);
    const queryBuilder = userRepository.createQueryBuilder('user');

    // Status filter
    if (status && status !== 'all') {
      queryBuilder.where('user.status = :status', { status });
    }
    
    // Business type filter
    if (businessType && businessType !== 'all') {
      queryBuilder.andWhere("user.businessInfo->>'businessType' = :businessType", {
        businessType
      });
    }
    
    // Search filter (name, email, business name)
    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.businessInfo->>\'businessName\' ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Get users with pagination
    const [users, total] = await queryBuilder
      .select([
        'user.id',
        'user.email',
        'user.name', 
        'user.role',
        'user.status',
        'user.businessInfo',
        'user.createdAt',
        'user.updatedAt',
        'user.approvedAt',
        'user.approvedBy'
      ])
      .orderBy('user.createdAt', 'DESC')
      .offset(offset)
      .limit(Number(limit))
      .getManyAndCount();

    // Get status statistics
    const statsQuery = userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status');

    const statsResult = await statsQuery.getRawMany();
    const statusCounts = statsResult.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {} as Record<string, number>);

    res.json({
      users,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / Number(limit)),
        count: users.length,
        totalUsers: total
      },
      stats: statusCounts
    });

  } catch (error) {
    // Error log removed
    res.status(500).json({
      error: 'Internal server error',
      code: 'FETCH_USERS_FAILED'
    });
  }
};

export const approveUser = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { notes } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'created_at', 'updated_at']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== UserStatus.PENDING) {
      return res.status(400).json({
        error: 'User is not in pending status',
        code: 'INVALID_STATUS',
        currentStatus: user.status
      });
    }

    // Update user status
    await userRepository.update(userId, {
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: (req.user as any)?.id || (req.user as any)?.userId || 'system'
    });

    // TODO: 승인 이메일 발송

    // Get updated user
    const updatedUser = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'created_at', 'updated_at', 'approvedAt', 'approvedBy']
    });

    res.json({
      message: 'User approved successfully',
      user: updatedUser
    });

  } catch (error) {
    // Error log removed
    res.status(500).json({
      error: 'Internal server error',
      code: 'APPROVE_USER_FAILED'
    });
  }
};

export const rejectUser = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'status']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== UserStatus.PENDING) {
      return res.status(400).json({
        error: 'User is not in pending status',
        code: 'INVALID_STATUS',
        currentStatus: user.status
      });
    }

    // Update user status
    await userRepository.update(userId, {
      status: UserStatus.REJECTED
    });

    // TODO: 거부 이메일 발송 (이유 포함)

    // Get updated user
    const updatedUser = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'created_at', 'updated_at']
    });

    res.json({
      message: 'User rejected successfully',
      user: updatedUser,
      reason
    });

  } catch (error) {
    // Error log removed
    res.status(500).json({
      error: 'Internal server error',
      code: 'REJECT_USER_FAILED'
    });
  }
};

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'status']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status === UserStatus.SUSPENDED) {
      return res.status(400).json({
        error: 'User is already suspended',
        code: 'ALREADY_SUSPENDED'
      });
    }

    // Update user status
    await userRepository.update(userId, {
      status: UserStatus.SUSPENDED
    });

    // TODO: 정지 이메일 발송

    // Get updated user
    const updatedUser = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'created_at', 'updated_at']
    });

    res.json({
      message: 'User suspended successfully',
      user: updatedUser,
      reason
    });

  } catch (error) {
    // Error log removed
    res.status(500).json({
      error: 'Internal server error',
      code: 'SUSPEND_USER_FAILED'
    });
  }
};

export const reactivateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'status']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== UserStatus.SUSPENDED) {
      return res.status(400).json({
        error: 'User is not suspended',
        code: 'NOT_SUSPENDED',
        currentStatus: user.status
      });
    }

    // Update user status
    await userRepository.update(userId, {
      status: UserStatus.APPROVED
    });

    // TODO: 재활성화 이메일 발송

    // Get updated user
    const updatedUser = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'created_at', 'updated_at']
    });

    res.json({
      message: 'User reactivated successfully',
      user: updatedUser
    });

  } catch (error) {
    // Error log removed
    res.status(500).json({
      error: 'Internal server error',
      code: 'REACTIVATE_USER_FAILED'
    });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);

    // Get user status statistics
    const userStatsQuery = userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status');

    const userStatsResult = await userStatsQuery.getRawMany();
    const statusCounts = userStatsResult.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.count, 10);
      return acc;
    }, {} as Record<UserStatus, number>);

    // Get business type statistics for approved users
    const businessTypeStatsQuery = userRepository
      .createQueryBuilder('user')
      .select("user.businessInfo->>'businessType'", 'businessType')
      .addSelect('COUNT(*)', 'count')
      .where('user.status = :status', { status: UserStatus.APPROVED })
      .andWhere("user.businessInfo->>'businessType' IS NOT NULL")
      .groupBy("user.businessInfo->>'businessType'");

    const businessTypeStatsResult = await businessTypeStatsQuery.getRawMany();
    const businessTypeCounts = businessTypeStatsResult.reduce((acc, curr) => {
      if (curr.businessType) {
        acc[curr.businessType] = parseInt(curr.count);
      }
      return acc;
    }, {} as Record<string, number>);

    // Get recent users
    const recentUsers = await userRepository.find({
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'created_at', 'approvedBy'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    const totalUsers = (Object.values(statusCounts) as number[]).reduce((a, b) => a + b, 0);

    res.json({
      userStats: statusCounts,
      businessTypeStats: businessTypeCounts,
      recentUsers,
      totalUsers
    });

  } catch (error) {
    // Error log removed
    res.status(500).json({
      error: 'Internal server error',
      code: 'DASHBOARD_STATS_FAILED'
    });
  }
};

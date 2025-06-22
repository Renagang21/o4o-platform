import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AppDataSource } from '../database/connection';
import { User, UserStatus } from '../entities/User';
import { AuthRequest } from '../middleware/auth';

export const getPendingUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, businessType } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const userRepository = AppDataSource.getRepository(User);
    const queryBuilder = userRepository.createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.name', 'user.role', 'user.status', 'user.businessInfo', 'user.createdAt', 'user.updatedAt'])
      .where('user.status = :status', { status: 'pending' })
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(Number(limit));

    if (businessType && businessType !== 'all') {
      queryBuilder.andWhere('user.businessInfo->>\'businessType\' = :businessType', { businessType });
    }

    const [users, total] = await queryBuilder.getManyAndCount();

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
    console.error('Get pending users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'FETCH_PENDING_USERS_FAILED'
    });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      businessType, 
      search 
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);

    const userRepository = AppDataSource.getRepository(User);
    const queryBuilder = userRepository.createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.name', 'user.role', 'user.status', 'user.businessInfo', 'user.createdAt', 'user.updatedAt'])
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(Number(limit));
    
    if (status && status !== 'all') {
      queryBuilder.andWhere('user.status = :status', { status });
    }
    
    if (businessType && businessType !== 'all') {
      queryBuilder.andWhere('user.businessInfo->>\'businessType\' = :businessType', { businessType });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.businessInfo->>\'businessName\' ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    // 통계 정보
    const statsResult = await userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    const statusCounts = statsResult.reduce((acc: any, curr: any) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

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
    console.error('Get all users error:', error);
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
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        error: 'User is not in pending status',
        code: 'INVALID_STATUS',
        currentStatus: user.status
      });
    }

    user.status = UserStatus.APPROVED;
    user.approvedAt = new Date();
    user.approvedBy = req.user!.id;
    await userRepository.save(user);

    // TODO: 승인 이메일 발송

    const updatedUser = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt']
    });

    res.json({
      message: 'User approved successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'APPROVE_USER_FAILED'
    });
  }
};

export const rejectUser = async (req: AuthRequest, res: Response) => {
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
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        error: 'User is not in pending status',
        code: 'INVALID_STATUS',
        currentStatus: user.status
      });
    }

    user.status = UserStatus.REJECTED;
    await userRepository.save(user);

    // TODO: 거부 이메일 발송 (이유 포함)

    const updatedUser = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt']
    });

    res.json({
      message: 'User rejected successfully',
      user: updatedUser,
      reason
    });

  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REJECT_USER_FAILED'
    });
  }
};

export const suspendUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status === 'suspended') {
      return res.status(400).json({
        error: 'User is already suspended',
        code: 'ALREADY_SUSPENDED'
      });
    }

    user.status = UserStatus.SUSPENDED;
    await userRepository.save(user);

    // TODO: 정지 이메일 발송

    const updatedUser = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt']
    });

    res.json({
      message: 'User suspended successfully',
      user: updatedUser,
      reason
    });

  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SUSPEND_USER_FAILED'
    });
  }
};

export const reactivateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== 'suspended') {
      return res.status(400).json({
        error: 'User is not suspended',
        code: 'NOT_SUSPENDED',
        currentStatus: user.status
      });
    }

    user.status = UserStatus.APPROVED;
    await userRepository.save(user);

    // TODO: 재활성화 이메일 발송

    const updatedUser = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt']
    });

    res.json({
      message: 'User reactivated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REACTIVATE_USER_FAILED'
    });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    
    // 사용자 상태별 통계
    const userStats = await userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    // 승인된 사용자의 비즈니스 타입별 통계
    const businessTypeStats = await userRepository
      .createQueryBuilder('user')
      .select('user.businessInfo->>\'businessType\'', 'businessType')
      .addSelect('COUNT(*)', 'count')
      .where('user.status = :status', { status: 'approved' })
      .andWhere('user.businessInfo->>\'businessType\' IS NOT NULL')
      .groupBy('user.businessInfo->>\'businessType\'')
      .getRawMany();

    // 최근 사용자 5명
    const recentUsers = await userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.name', 'user.role', 'user.status', 'user.businessInfo', 'user.createdAt', 'user.updatedAt', 'user.approvedBy'])
      .orderBy('user.createdAt', 'DESC')
      .limit(5)
      .getMany();

    const statusCounts = userStats.reduce((acc: any, curr: any) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

    const businessTypeCounts = businessTypeStats.reduce((acc: any, curr: any) => {
      acc[curr.businessType] = parseInt(curr.count);
      return acc;
    }, {});

    res.json({
      userStats: statusCounts,
      businessTypeStats: businessTypeCounts,
      recentUsers,
      totalUsers: Object.values(statusCounts).reduce((a: any, b: any) => a + b, 0)
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'DASHBOARD_STATS_FAILED'
    });
  }
};

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { getUserRepository, User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getPendingUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, businessType } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { status: 'pending' };
    if (businessType && businessType !== 'all') {
      filter['businessInfo.businessType'] = businessType;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('approvedBy', 'name email');

    const total = await User.countDocuments(filter);

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

    const filter: any = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (businessType && businessType !== 'all') {
      filter['businessInfo.businessType'] = businessType;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'businessInfo.businessName': { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('approvedBy', 'name email');

    const total = await User.countDocuments(filter);

    // 통계 정보
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
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

    const user = await User.findById(userId);
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

    user.status = 'approved';
    user.approvedAt = new Date();
    user.approvedBy = req.user!._id;
    await user.save();

    // TODO: 승인 이메일 발송

    const updatedUser = await User.findById(userId)
      .select('-password')
      .populate('approvedBy', 'name email');

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

    const user = await User.findById(userId);
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

    user.status = 'rejected';
    await user.save();

    // TODO: 거부 이메일 발송 (이유 포함)

    const updatedUser = await User.findById(userId).select('-password');

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

    const user = await User.findById(userId);
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

    user.status = 'suspended';
    await user.save();

    // TODO: 정지 이메일 발송

    const updatedUser = await User.findById(userId).select('-password');

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

    const user = await User.findById(userId);
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

    user.status = 'approved';
    await user.save();

    // TODO: 재활성화 이메일 발송

    const updatedUser = await User.findById(userId).select('-password');

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
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const businessTypeStats = await User.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$businessInfo.businessType',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('approvedBy', 'name email');

    const statusCounts = userStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const businessTypeCounts = businessTypeStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
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

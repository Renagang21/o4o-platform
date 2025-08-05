import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  getDashboardStats
} from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import securityRoutes from './admin/security';

const router: Router = Router();

// 모든 관리자 라우트는 인증 및 관리자 권한 필요
router.use(authenticateToken);
router.use(requireAdmin);

// 대시보드 통계
router.get('/dashboard/stats', getDashboardStats);

// 대기 중인 사용자 목록
router.get('/users/pending', getPendingUsers);

// 모든 사용자 목록 (필터링 지원)
router.get('/users', getAllUsers);

// 사용자 승인
router.post('/users/:userId/approve', 
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('notes').optional().isString().trim(),
  approveUser
);

// 사용자 거부
router.post('/users/:userId/reject',
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('reason').isLength({ min: 10 }).withMessage('Rejection reason is required (minimum 10 characters)').trim(),
  rejectUser
);

// 사용자 정지
router.post('/users/:userId/suspend',
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('reason').isLength({ min: 10 }).withMessage('Suspension reason is required (minimum 10 characters)').trim(),
  suspendUser
);

// 사용자 재활성화
router.post('/users/:userId/reactivate',
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  reactivateUser
);

// Security management routes
router.use('/security', securityRoutes);

export default router;

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
import { PagesController } from '../controllers/pagesController';

const router: Router = Router();
const pagesController = new PagesController();

// 모든 관리자 라우트는 인증 및 관리자 권한 필요
router.use(authenticateToken);
router.use(requireAdmin);

// 대시보드 통계
router.get('/dashboard/stats', getDashboardStats);

// Pages routes - for backward compatibility
router.get('/pages', pagesController.getPages.bind(pagesController));
router.get('/pages/:id', pagesController.getPage.bind(pagesController));
router.post('/pages', pagesController.createPage.bind(pagesController));
router.put('/pages/:id', pagesController.updatePage.bind(pagesController));
router.delete('/pages/:id', pagesController.deletePage.bind(pagesController));

// 대기 중인 사용자 목록
router.get('/users/pending', getPendingUsers);

// 모든 사용자 목록 (필터링 지원)
router.get('/users', getAllUsers);

// 사용자 승인
router.post('/users/:userId/approve', 
  param('userId').isUUID().withMessage('Valid user ID is required'),
  body('notes').optional().isString().trim(),
  approveUser
);

// 사용자 거부
router.post('/users/:userId/reject',
  param('userId').isUUID().withMessage('Valid user ID is required'),
  body('reason').isLength({ min: 10 }).withMessage('Rejection reason is required (minimum 10 characters)').trim(),
  rejectUser
);

// 사용자 정지
router.post('/users/:userId/suspend',
  param('userId').isUUID().withMessage('Valid user ID is required'),
  body('reason').isLength({ min: 10 }).withMessage('Suspension reason is required (minimum 10 characters)').trim(),
  suspendUser
);

// 사용자 재활성화
router.post('/users/:userId/reactivate',
  param('userId').isUUID().withMessage('Valid user ID is required'),
  reactivateUser
);

// Security management routes
router.use('/security', securityRoutes);

export default router;

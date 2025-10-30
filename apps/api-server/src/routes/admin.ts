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
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import securityRoutes from './admin/security.js';
import { PagesController } from '../controllers/pagesController.js';

const router: Router = Router();
const pagesController = new PagesController();

// Public routes for frontend compatibility (no auth required)
router.get('/custom-field-groups', async (req, res) => {
  try {
    // Mock data for frontend compatibility
    const fieldGroups = [
      {
        id: 'product-fields',
        title: '상품 정보',
        location: 'product',
        fields: [
          {
            key: 'price',
            label: '가격',
            type: 'number',
            required: true
          },
          {
            key: 'sku',
            label: 'SKU',
            type: 'text',
            required: false
          }
        ]
      }
    ];
    
    res.json({
      success: true,
      data: fieldGroups,
      total: fieldGroups.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom field groups'
    });
  }
});

// 모든 관리자 라우트는 인증 및 관리자 권한 필요
router.use(authenticate);
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

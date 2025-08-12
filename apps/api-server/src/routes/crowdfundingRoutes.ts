/**
 * 크라우드펀딩 라우트
 */

import { Router } from 'express';
import { crowdfundingController } from '../controllers/crowdfundingController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateRequest } from '../middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router: Router = Router();

// ==================== Public Routes ====================

// 프로젝트 목록 조회
router.get('/projects',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'pending', 'ongoing', 'successful', 'failed', 'cancelled']),
  query('category').optional().isIn(['tech', 'art', 'design', 'fashion', 'food', 'social', 'other']),
  validateRequest,
  crowdfundingController.getProjects
);

// 프로젝트 상세 조회
router.get('/projects/:projectId',
  param('projectId').isUUID(),
  validateRequest,
  crowdfundingController.getProjectDetails
);

// ==================== Authenticated Routes ====================

// 프로젝트 생성
router.post('/projects',
  authenticateToken,
  body('title').notEmpty().isLength({ max: 255 }),
  body('description').notEmpty(),
  body('shortDescription').notEmpty().isLength({ max: 500 }),
  body('category').isIn(['tech', 'art', 'design', 'fashion', 'food', 'social', 'other']),
  body('targetAmount').isFloat({ min: 0 }),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('story').notEmpty(),
  validateRequest,
  crowdfundingController.createProject
);

// 프로젝트 수정
router.put('/projects/:projectId',
  authenticateToken,
  param('projectId').isUUID(),
  validateRequest,
  crowdfundingController.updateProject
);

// 리워드 생성
router.post('/projects/:projectId/rewards',
  authenticateToken,
  param('projectId').isUUID(),
  body('title').notEmpty().isLength({ max: 255 }),
  body('description').notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('estimatedDeliveryDate').isISO8601(),
  validateRequest,
  crowdfundingController.createReward
);

// 후원하기
router.post('/backings',
  authenticateToken,
  body('projectId').isUUID(),
  body('amount').isFloat({ min: 1000 }), // 최소 1000원
  body('paymentMethod').isIn(['card', 'bank_transfer', 'kakao_pay', 'naver_pay', 'toss', 'paypal']),
  validateRequest,
  crowdfundingController.createBacking
);

// 결제 확인
router.post('/backings/:backingId/confirm',
  authenticateToken,
  param('backingId').isUUID(),
  body('paymentId').notEmpty(),
  validateRequest,
  crowdfundingController.confirmPayment
);

// 프로젝트 업데이트 작성
router.post('/projects/:projectId/updates',
  authenticateToken,
  param('projectId').isUUID(),
  body('title').notEmpty().isLength({ max: 255 }),
  body('content').notEmpty(),
  body('stage').optional().isIn(['idea', 'prototype', 'production', 'shipping']),
  body('progressPercentage').optional().isInt({ min: 0, max: 100 }),
  validateRequest,
  crowdfundingController.createProjectUpdate
);

// 크리에이터 대시보드
router.get('/creator/dashboard',
  authenticateToken,
  crowdfundingController.getCreatorDashboard
);

// 후원자 대시보드
router.get('/backer/dashboard',
  authenticateToken,
  crowdfundingController.getBackerDashboard
);

// ==================== Admin Routes ====================

// 승인 대기 프로젝트 목록
router.get('/admin/pending',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  crowdfundingController.getPendingProjects
);

// 프로젝트 승인
router.post('/admin/projects/:projectId/approve',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  param('projectId').isUUID(),
  validateRequest,
  crowdfundingController.approveProject
);

// 프로젝트 거절
router.post('/admin/projects/:projectId/reject',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  param('projectId').isUUID(),
  body('reason').notEmpty(),
  validateRequest,
  crowdfundingController.rejectProject
);

// 펀딩 종료 (수동)
router.post('/admin/projects/:projectId/end',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  param('projectId').isUUID(),
  validateRequest,
  crowdfundingController.endFunding
);

export default router;
"use strict";
/**
 * 크라우드펀딩 라우트
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crowdfundingController_1 = require("../controllers/crowdfundingController");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const validateRequest_1 = require("../middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
// ==================== Public Routes ====================
// 프로젝트 목록 조회
router.get('/projects', (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }), (0, express_validator_1.query)('status').optional().isIn(['draft', 'pending', 'ongoing', 'successful', 'failed', 'cancelled']), (0, express_validator_1.query)('category').optional().isIn(['tech', 'art', 'design', 'fashion', 'food', 'social', 'other']), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.getProjects);
// 프로젝트 상세 조회
router.get('/projects/:projectId', (0, express_validator_1.param)('projectId').isUUID(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.getProjectDetails);
// ==================== Authenticated Routes ====================
// 프로젝트 생성
router.post('/projects', auth_1.authenticateToken, (0, express_validator_1.body)('title').notEmpty().isLength({ max: 255 }), (0, express_validator_1.body)('description').notEmpty(), (0, express_validator_1.body)('shortDescription').notEmpty().isLength({ max: 500 }), (0, express_validator_1.body)('category').isIn(['tech', 'art', 'design', 'fashion', 'food', 'social', 'other']), (0, express_validator_1.body)('targetAmount').isFloat({ min: 0 }), (0, express_validator_1.body)('startDate').isISO8601(), (0, express_validator_1.body)('endDate').isISO8601(), (0, express_validator_1.body)('story').notEmpty(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.createProject);
// 프로젝트 수정
router.put('/projects/:projectId', auth_1.authenticateToken, (0, express_validator_1.param)('projectId').isUUID(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.updateProject);
// 리워드 생성
router.post('/projects/:projectId/rewards', auth_1.authenticateToken, (0, express_validator_1.param)('projectId').isUUID(), (0, express_validator_1.body)('title').notEmpty().isLength({ max: 255 }), (0, express_validator_1.body)('description').notEmpty(), (0, express_validator_1.body)('price').isFloat({ min: 0 }), (0, express_validator_1.body)('estimatedDeliveryDate').isISO8601(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.createReward);
// 후원하기
router.post('/backings', auth_1.authenticateToken, (0, express_validator_1.body)('projectId').isUUID(), (0, express_validator_1.body)('amount').isFloat({ min: 1000 }), // 최소 1000원
(0, express_validator_1.body)('paymentMethod').isIn(['card', 'bank_transfer', 'kakao_pay', 'naver_pay', 'toss', 'paypal']), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.createBacking);
// 결제 확인
router.post('/backings/:backingId/confirm', auth_1.authenticateToken, (0, express_validator_1.param)('backingId').isUUID(), (0, express_validator_1.body)('paymentId').notEmpty(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.confirmPayment);
// 프로젝트 업데이트 작성
router.post('/projects/:projectId/updates', auth_1.authenticateToken, (0, express_validator_1.param)('projectId').isUUID(), (0, express_validator_1.body)('title').notEmpty().isLength({ max: 255 }), (0, express_validator_1.body)('content').notEmpty(), (0, express_validator_1.body)('stage').optional().isIn(['idea', 'prototype', 'production', 'shipping']), (0, express_validator_1.body)('progressPercentage').optional().isInt({ min: 0, max: 100 }), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.createProjectUpdate);
// 크리에이터 대시보드
router.get('/creator/dashboard', auth_1.authenticateToken, crowdfundingController_1.crowdfundingController.getCreatorDashboard);
// 후원자 대시보드
router.get('/backer/dashboard', auth_1.authenticateToken, crowdfundingController_1.crowdfundingController.getBackerDashboard);
// ==================== Admin Routes ====================
// 승인 대기 프로젝트 목록
router.get('/admin/pending', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'super_admin']), crowdfundingController_1.crowdfundingController.getPendingProjects);
// 프로젝트 승인
router.post('/admin/projects/:projectId/approve', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'super_admin']), (0, express_validator_1.param)('projectId').isUUID(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.approveProject);
// 프로젝트 거절
router.post('/admin/projects/:projectId/reject', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'super_admin']), (0, express_validator_1.param)('projectId').isUUID(), (0, express_validator_1.body)('reason').notEmpty(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.rejectProject);
// 펀딩 종료 (수동)
router.post('/admin/projects/:projectId/end', auth_1.authenticateToken, (0, requireRole_1.requireRole)(['admin', 'super_admin']), (0, express_validator_1.param)('projectId').isUUID(), validateRequest_1.validateRequest, crowdfundingController_1.crowdfundingController.endFunding);
exports.default = router;
//# sourceMappingURL=crowdfundingRoutes.js.map
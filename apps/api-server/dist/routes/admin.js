"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const security_1 = __importDefault(require("./admin/security"));
const router = (0, express_1.Router)();
// 모든 관리자 라우트는 인증 및 관리자 권한 필요
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
// 대시보드 통계
router.get('/dashboard/stats', adminController_1.getDashboardStats);
// 대기 중인 사용자 목록
router.get('/users/pending', adminController_1.getPendingUsers);
// 모든 사용자 목록 (필터링 지원)
router.get('/users', adminController_1.getAllUsers);
// 사용자 승인
router.post('/users/:userId/approve', (0, express_validator_1.param)('userId').isMongoId().withMessage('Valid user ID is required'), (0, express_validator_1.body)('notes').optional().isString().trim(), adminController_1.approveUser);
// 사용자 거부
router.post('/users/:userId/reject', (0, express_validator_1.param)('userId').isMongoId().withMessage('Valid user ID is required'), (0, express_validator_1.body)('reason').isLength({ min: 10 }).withMessage('Rejection reason is required (minimum 10 characters)').trim(), adminController_1.rejectUser);
// 사용자 정지
router.post('/users/:userId/suspend', (0, express_validator_1.param)('userId').isMongoId().withMessage('Valid user ID is required'), (0, express_validator_1.body)('reason').isLength({ min: 10 }).withMessage('Suspension reason is required (minimum 10 characters)').trim(), adminController_1.suspendUser);
// 사용자 재활성화
router.post('/users/:userId/reactivate', (0, express_validator_1.param)('userId').isMongoId().withMessage('Valid user ID is required'), adminController_1.reactivateUser);
// Security management routes
router.use('/security', security_1.default);
exports.default = router;
//# sourceMappingURL=admin.js.map
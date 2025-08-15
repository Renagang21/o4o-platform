"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const performanceController_1 = require("../controllers/performanceController");
const router = (0, express_1.Router)();
/**
 * 성능 최적화 및 스케일링 라우트
 *
 * 모든 엔드포인트는 인증이 필요하며, 관리자 권한을 요구합니다.
 */
// 대시보드 및 상태 조회 (읽기 전용)
router.get('/dashboard', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.getPerformanceDashboard);
router.get('/optimization', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.getOptimizationStatus);
router.get('/scaling', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.getScalingStatus);
router.get('/cdn', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.getCDNStatus);
router.get('/database', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.getDatabaseStatus);
router.get('/metrics/realtime', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.getRealtimeMetrics);
router.get('/alerts', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.getPerformanceAlerts);
// 리포트 생성
router.get('/reports', authMiddleware_1.authMiddleware.verifyToken, performanceController_1.generateReports);
// 수동 최적화 및 스케일링 실행 (관리자만)
router.post('/optimize', authMiddleware_1.authMiddleware.verifyToken, requireAdminRole, performanceController_1.runOptimization);
router.post('/scale', authMiddleware_1.authMiddleware.verifyToken, requireAdminRole, performanceController_1.runScaling);
// 설정 업데이트 (관리자만)
router.put('/settings', authMiddleware_1.authMiddleware.verifyToken, requireAdminRole, performanceController_1.updatePerformanceSettings);
/**
 * 관리자 권한 확인 미들웨어
 */
function requireAdminRole(req, res, next) {
    var _a;
    const authReq = req;
    if (((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin role required for this operation'
        });
    }
    next();
}
exports.default = router;
//# sourceMappingURL=performance.js.map
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { AuthRequest } from '../types/auth';
import {
  getPerformanceDashboard,
  getOptimizationStatus,
  getScalingStatus,
  getCDNStatus,
  getDatabaseStatus,
  runOptimization,
  runScaling,
  generateReports,
  updatePerformanceSettings,
  getRealtimeMetrics,
  getPerformanceAlerts
} from '../controllers/performanceController';

const router = Router();

/**
 * 성능 최적화 및 스케일링 라우트
 * 
 * 모든 엔드포인트는 인증이 필요하며, 관리자 권한을 요구합니다.
 */

// 대시보드 및 상태 조회 (읽기 전용)
router.get('/dashboard', authMiddleware.verifyToken, getPerformanceDashboard);
router.get('/optimization', authMiddleware.verifyToken, getOptimizationStatus);
router.get('/scaling', authMiddleware.verifyToken, getScalingStatus);
router.get('/cdn', authMiddleware.verifyToken, getCDNStatus);
router.get('/database', authMiddleware.verifyToken, getDatabaseStatus);
router.get('/metrics/realtime', authMiddleware.verifyToken, getRealtimeMetrics);
router.get('/alerts', authMiddleware.verifyToken, getPerformanceAlerts);

// 리포트 생성
router.get('/reports', authMiddleware.verifyToken, generateReports);

// 수동 최적화 및 스케일링 실행 (관리자만)
router.post('/optimize', authMiddleware.verifyToken, requireAdminRole, runOptimization);
router.post('/scale', authMiddleware.verifyToken, requireAdminRole, runScaling);

// 설정 업데이트 (관리자만)
router.put('/settings', authMiddleware.verifyToken, requireAdminRole, updatePerformanceSettings);

/**
 * 관리자 권한 확인 미들웨어
 */
function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  if (authReq.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin role required for this operation'
    });
  }
  next();
}

export default router;
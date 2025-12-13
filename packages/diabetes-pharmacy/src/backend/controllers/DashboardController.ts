/**
 * DashboardController
 *
 * 대시보드 관련 API 엔드포인트
 *
 * @package @o4o/diabetes-pharmacy
 */

import type { Router, Request, Response } from 'express';
import { PharmacyDiabetesService } from '../services/PharmacyDiabetesService.js';

/**
 * DashboardController
 *
 * Endpoints:
 * - GET /api/v1/diabetes-pharmacy/dashboard
 * - GET /api/v1/diabetes-pharmacy/dashboard/patients
 * - GET /api/v1/diabetes-pharmacy/dashboard/stats
 */
export class DashboardController {
  private pharmacyService: PharmacyDiabetesService;

  constructor() {
    this.pharmacyService = new PharmacyDiabetesService();
  }

  /**
   * 대시보드 요약 조회
   * GET /api/v1/diabetes-pharmacy/dashboard
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const summary = await this.pharmacyService.getDashboardSummary(pharmacyId);
      res.json(summary);
    } catch (error) {
      console.error('[DashboardController] getDashboard error:', error);
      res.status(500).json({
        error: '대시보드 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 관리 대상자 목록 조회
   * GET /api/v1/diabetes-pharmacy/dashboard/patients
   */
  async getPatients(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.pharmacyService.getPatients(pharmacyId, { page, limit });
      res.json(result);
    } catch (error) {
      console.error('[DashboardController] getPatients error:', error);
      res.status(500).json({
        error: '대상자 목록 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 통계 조회
   * GET /api/v1/diabetes-pharmacy/dashboard/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const [cgmStats, patternStats] = await Promise.all([
        this.pharmacyService.getCGMUploadStats(pharmacyId),
        this.pharmacyService.getPatternStats(pharmacyId),
      ]);

      res.json({
        cgm: cgmStats,
        patterns: patternStats,
      });
    } catch (error) {
      console.error('[DashboardController] getStats error:', error);
      res.status(500).json({
        error: '통계 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 요청에서 약국 ID 추출
   */
  private getPharmacyId(req: Request): string | null {
    // Phase 2: 요청에서 약국 ID 추출
    // 실제 구현 시 JWT 토큰에서 조직 ID 추출
    return (req as any).user?.organizationId || (req as any).pharmacyId || 'mock-pharmacy-id';
  }
}

/**
 * Dashboard 라우트 생성
 */
export function createDashboardRoutes(router: Router): void {
  const controller = new DashboardController();

  router.get('/dashboard', (req, res) => controller.getDashboard(req, res));
  router.get('/dashboard/patients', (req, res) => controller.getPatients(req, res));
  router.get('/dashboard/stats', (req, res) => controller.getStats(req, res));
}

export default DashboardController;

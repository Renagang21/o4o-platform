/**
 * Pharmacy Activity Controller
 *
 * 약국 활동 데이터 조회 API (Read-only)
 * PHARMACEUTICAL 제품은 자동으로 필터링됩니다.
 *
 * ## TODO: Extension 이동 대상
 * 이 컨트롤러는 약국(Pharmacy) 특화 로직을 포함하고 있습니다.
 * Ops 서비스 중립성 원칙에 따라, 향후 다음 중 하나로 이동해야 합니다:
 * - yaksa-partner-extension
 * - pharmacy-partner-extension
 *
 * 현재는 PartnerOps 내부에 위치하여 기능을 제공하지만,
 * 이는 임시 배치이며, 서비스별 특화 로직 분리 Phase에서 정리됩니다.
 *
 * @package @o4o/partnerops
 */

import type { Request, Response } from 'express';
import { pharmacyActivityService } from '../services/PharmacyActivityService.js';

export class PharmacyActivityController {
  /**
   * GET /partnerops/pharmacy-activity
   *
   * 약국 활동 목록 조회
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId || 'default';
      const {
        productType,
        status,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = req.query;

      const result = await pharmacyActivityService.getActivityList(tenantId, {
        productType: productType as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('PharmacyActivityController list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pharmacy activity list',
      });
    }
  }

  /**
   * GET /partnerops/pharmacy-activity/stats
   *
   * 약국 활동 통계 조회
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId || 'default';
      const { startDate, endDate } = req.query;

      const stats = await pharmacyActivityService.getActivityStats(
        tenantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('PharmacyActivityController getStats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pharmacy activity stats',
      });
    }
  }

  /**
   * GET /partnerops/pharmacy-activity/:pharmacyId
   *
   * 특정 약국의 활동 상세 조회
   */
  static async getPharmacyDetail(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId || 'default';
      const { pharmacyId } = req.params;

      if (!pharmacyId) {
        res.status(400).json({
          success: false,
          error: 'pharmacyId is required',
        });
        return;
      }

      const detail = await pharmacyActivityService.getPharmacyDetail(
        tenantId,
        pharmacyId
      );

      if (!detail) {
        res.status(404).json({
          success: false,
          error: 'Pharmacy not found',
        });
        return;
      }

      res.json({
        success: true,
        data: detail,
      });
    } catch (error) {
      console.error('PharmacyActivityController getPharmacyDetail error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pharmacy detail',
      });
    }
  }
}

export default PharmacyActivityController;

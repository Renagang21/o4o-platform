/**
 * PartnerEarningsController
 *
 * 파트너 수익 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { PartnerEarningsService } from '../services/partner-earnings.service';
import type { PartnerProfileService } from '../services/partner-profile.service';

export class PartnerEarningsController {
  constructor(
    private readonly service: PartnerEarningsService,
    private readonly profileService: PartnerProfileService
  ) {}

  /**
   * GET /api/v1/cosmetics-partner/earnings
   * 내 수익 목록 조회
   */
  async getMyEarnings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const { status, earningsType, startDate, endDate, page, limit } = req.query;

      const result = await this.service.findByPartnerId(profile.id, {
        status: status as any,
        earningsType: earningsType as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('[PartnerEarningsController] getMyEarnings error:', error);
      res.status(500).json({ error: 'Failed to get earnings' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/earnings/summary
   * 내 수익 요약 조회
   */
  async getMySummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const summary = await this.service.getEarningsSummary(profile.id);
      res.json(summary);
    } catch (error) {
      console.error('[PartnerEarningsController] getMySummary error:', error);
      res.status(500).json({ error: 'Failed to get earnings summary' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/earnings/monthly
   * 월별 수익 통계 조회
   */
  async getMonthlyStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const { year, month } = req.query;
      const now = new Date();
      const targetYear = year ? parseInt(year as string) : now.getFullYear();
      const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;

      const stats = await this.service.getMonthlyStats(profile.id, targetYear, targetMonth);
      res.json(stats);
    } catch (error) {
      console.error('[PartnerEarningsController] getMonthlyStats error:', error);
      res.status(500).json({ error: 'Failed to get monthly stats' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/log-conversion
   * 전환 수익 기록 (내부 호출용)
   */
  async logConversion(req: Request, res: Response): Promise<void> {
    try {
      const {
        partnerId,
        orderId,
        orderAmount,
        commissionRate,
        linkId,
      } = req.body;

      if (!partnerId || !orderId || !orderAmount || !commissionRate) {
        res.status(400).json({
          error: 'partnerId, orderId, orderAmount, and commissionRate are required',
        });
        return;
      }

      const earnings = await this.service.logCommission(
        partnerId,
        orderId,
        orderAmount,
        commissionRate,
        linkId
      );

      res.status(201).json(earnings);
    } catch (error) {
      console.error('[PartnerEarningsController] logConversion error:', error);
      res.status(500).json({ error: 'Failed to log conversion' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/:id/make-available
   * 수익 상태 변경: pending -> available (관리자)
   */
  async makeAvailable(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const earnings = await this.service.makeAvailable(id);

      if (!earnings) {
        res.status(404).json({ error: 'Earnings not found' });
        return;
      }

      res.json(earnings);
    } catch (error) {
      console.error('[PartnerEarningsController] makeAvailable error:', error);
      res.status(500).json({ error: 'Failed to make earnings available' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/make-available-batch
   * 다건 수익 상태 변경 (관리자)
   */
  async makeAvailableBatch(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ error: 'ids array is required' });
        return;
      }

      await this.service.makeMultipleAvailable(ids);
      res.json({ success: true, count: ids.length });
    } catch (error) {
      console.error('[PartnerEarningsController] makeAvailableBatch error:', error);
      res.status(500).json({ error: 'Failed to make earnings available' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/withdraw
   * 출금 요청
   */
  async requestWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const { amount } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'Valid amount is required' });
        return;
      }

      // 출금 가능 금액 확인
      const summary = await this.service.getEarningsSummary(profile.id);

      if (summary.totalAvailable < amount) {
        res.status(400).json({
          error: 'Insufficient available balance',
          available: summary.totalAvailable,
          requested: amount,
        });
        return;
      }

      // 출금 처리 (실제 구현에서는 결제 시스템 연동 필요)
      const transactionId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const processedEarnings = await this.service.processWithdrawal(
        profile.id,
        amount,
        transactionId
      );

      res.json({
        success: true,
        transactionId,
        processedCount: processedEarnings.length,
        amount,
      });
    } catch (error) {
      console.error('[PartnerEarningsController] requestWithdrawal error:', error);
      res.status(500).json({ error: 'Failed to process withdrawal' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/:id/cancel
   * 수익 취소 (관리자)
   */
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const earnings = await this.service.cancelEarnings(id);

      if (!earnings) {
        res.status(404).json({ error: 'Earnings not found' });
        return;
      }

      res.json(earnings);
    } catch (error) {
      console.error('[PartnerEarningsController] cancel error:', error);
      res.status(500).json({ error: 'Failed to cancel earnings' });
    }
  }
}

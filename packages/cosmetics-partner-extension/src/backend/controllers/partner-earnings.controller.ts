/**
 * PartnerEarningsController
 *
 * 파트너 수익 관리 API 컨트롤러
 * - Commission Engine 통합 (Phase 6-D)
 */

import type { Request, Response } from 'express';
import type {
  PartnerEarningsService,
  CreatePartnerEarningsDto,
  UpdatePartnerEarningsDto,
  RecordCommissionDto,
  EarningsFilter,
} from '../services/partner-earnings.service.js';

export class PartnerEarningsController {
  constructor(private readonly earningsService: PartnerEarningsService) {}

  /**
   * POST /api/v1/cosmetics-partner/earnings
   * 수익 직접 기록 (금액 지정)
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreatePartnerEarningsDto = req.body;
      const earnings = await this.earningsService.logCommission(dto);
      res.status(201).json({ success: true, data: earnings });
    } catch (error: any) {
      console.error('[PartnerEarningsController] create error:', error);
      res.status(400).json({ success: false, message: error.message, errorCode: 'CREATE_ERROR' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/record
   * Commission Engine 연동 수익 기록 (자동 계산)
   */
  async recordCommission(req: Request, res: Response): Promise<void> {
    try {
      const dto: RecordCommissionDto = req.body;

      if (!dto.partnerId || !dto.eventType || dto.eventValue === undefined) {
        res.status(400).json({
          success: false,
          message: 'partnerId, eventType, and eventValue are required',
          errorCode: 'VALIDATION_ERROR',
        });
        return;
      }

      const earnings = await this.earningsService.recordCommission(dto);
      res.status(201).json({ success: true, data: earnings });
    } catch (error: any) {
      console.error('[PartnerEarningsController] recordCommission error:', error);
      res.status(400).json({ success: false, message: error.message, errorCode: 'RECORD_ERROR' });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const earnings = await this.earningsService.findById(id);
      if (!earnings) {
        res.status(404).json({ success: false, message: 'Partner earnings not found' });
        return;
      }
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByPartnerId(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const earnings = await this.earningsService.findByPartnerId(partnerId);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByFilter(req: Request, res: Response): Promise<void> {
    try {
      const filter: EarningsFilter = {
        partnerId: req.query.partnerId as string,
        earningsType: req.query.earningsType as any,
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const earnings = await this.earningsService.findByFilter(filter);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePartnerEarningsDto = req.body;
      const earnings = await this.earningsService.updateEarnings(id, dto);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const earnings = await this.earningsService.approveEarnings(id);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/:partnerId/withdrawal
   * 인출 요청
   */
  async requestWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Valid amount is required',
          errorCode: 'VALIDATION_ERROR',
        });
        return;
      }

      const result = await this.earningsService.processWithdrawal(partnerId, amount);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          errorCode: 'INSUFFICIENT_BALANCE',
        });
        return;
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[PartnerEarningsController] requestWithdrawal error:', error);
      res.status(400).json({ success: false, message: error.message, errorCode: 'WITHDRAWAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/earnings/:partnerId/summary
   * 수익 요약
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const summary = await this.earningsService.getEarningsSummary(partnerId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('[PartnerEarningsController] getSummary error:', error);
      res.status(500).json({ success: false, message: error.message, errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/earnings/:partnerId/balance
   * 인출 가능 잔액 조회
   */
  async getAvailableBalance(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const balance = await this.earningsService.getAvailableBalance(partnerId);
      res.json({ success: true, data: { partnerId, availableBalance: balance } });
    } catch (error: any) {
      console.error('[PartnerEarningsController] getAvailableBalance error:', error);
      res.status(500).json({ success: false, message: error.message, errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/earnings/approve-batch
   * 일괄 승인
   */
  async approveBatch(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'ids array is required',
          errorCode: 'VALIDATION_ERROR',
        });
        return;
      }

      const results = await this.earningsService.approveEarningsBatch(ids);
      res.json({ success: true, data: results, message: `${results.length}건이 승인되었습니다.` });
    } catch (error: any) {
      console.error('[PartnerEarningsController] approveBatch error:', error);
      res.status(400).json({ success: false, message: error.message, errorCode: 'BATCH_APPROVE_ERROR' });
    }
  }

  async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const earnings = await this.earningsService.getPendingApprovals();
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.earningsService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

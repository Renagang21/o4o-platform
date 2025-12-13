/**
 * PartnerOps Settlement Controller
 *
 * Partner-Core 기반 정산 컨트롤러
 *
 * @package @o4o/partnerops
 */

import { Request, Response } from 'express';
import type { SettlementService } from '../services/SettlementService.js';
import type { ApiResponseDto, SettlementQueryDto } from '../dto/index.js';

export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  /**
   * GET /partnerops/settlement/summary
   * 정산 요약 조회
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const summary = await this.settlementService.getSummary(partnerId);

      const response: ApiResponseDto<typeof summary> = {
        success: true,
        data: summary,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get settlement summary error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/settlement/batches
   * 정산 배치 목록 조회
   */
  async getBatches(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const filters: SettlementQueryDto = {
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const batches = await this.settlementService.getBatches(partnerId, filters);

      const response: ApiResponseDto<typeof batches> = {
        success: true,
        data: batches,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get settlement batches error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/settlement/batches/:id
   * 정산 배치 상세 조회
   */
  async getBatchById(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const batchId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const batch = await this.settlementService.getBatchById(partnerId, batchId);

      if (!batch) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Batch not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof batch> = {
        success: true,
        data: batch,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get settlement batch error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }
}

export default SettlementController;

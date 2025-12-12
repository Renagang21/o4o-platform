import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FeeExemptionService, CreateExemptionDto, ExemptionFilters } from '../services/FeeExemptionService.js';
import { ExemptionCategory, ExemptionStatus } from '../entities/FeeExemption.js';

/**
 * FeeExemptionController
 *
 * 회비 감면 관리 API
 */
export function createFeeExemptionController(dataSource: DataSource): Router {
  const router = Router();
  const service = new FeeExemptionService(dataSource);

  /**
   * GET /api/annualfee/exemptions
   * 감면 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        memberId,
        year,
        category,
        status,
        isAutoApplied,
        limit,
        offset,
      } = req.query;

      const filters: ExemptionFilters = {
        memberId: memberId as string,
        year: year ? parseInt(year as string, 10) : undefined,
        category: category as ExemptionCategory,
        status: status as ExemptionStatus,
        isAutoApplied: isAutoApplied === 'true' ? true : isAutoApplied === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await service.findAll(filters);

      res.json({
        success: true,
        data: result.exemptions,
        total: result.total,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/exemptions/pending
   * 승인 대기 감면 목록
   */
  router.get('/pending', async (req: Request, res: Response) => {
    try {
      const { year } = req.query;
      const targetYear = year ? parseInt(year as string, 10) : undefined;

      const exemptions = await service.findPending(targetYear);

      res.json({
        success: true,
        data: exemptions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/exemptions/statistics
   * 감면 통계 조회
   */
  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      const { year, organizationId } = req.query;
      const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();

      const stats = await service.getStatistics(targetYear, organizationId as string);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/exemptions/member/:memberId
   * 회원별 감면 내역
   */
  router.get('/member/:memberId', async (req: Request, res: Response) => {
    try {
      const { year } = req.query;

      let exemptions;
      if (year) {
        exemptions = await service.findByMemberAndYear(
          req.params.memberId,
          parseInt(year as string, 10)
        );
      } else {
        const result = await service.findAll({
          memberId: req.params.memberId,
          limit: 100,
        });
        exemptions = result.exemptions;
      }

      res.json({
        success: true,
        data: exemptions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/exemptions/:id
   * 감면 상세 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const exemption = await service.findById(req.params.id);

      if (!exemption) {
        return res.status(404).json({
          success: false,
          error: 'Exemption not found',
        });
      }

      res.json({
        success: true,
        data: exemption,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/exemptions
   * 감면 신청/등록
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateExemptionDto = req.body;
      const actorId = (req as any).user?.id;

      // 필수 필드 확인
      if (!dto.memberId || !dto.year || !dto.category || !dto.reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: memberId, year, category, reason',
        });
      }

      const exemption = await service.create(dto, actorId);

      res.status(201).json({
        success: true,
        data: exemption,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/exemptions/:id/approve
   * 감면 승인
   */
  router.put('/:id/approve', async (req: Request, res: Response) => {
    try {
      const { note } = req.body;
      const actorId = (req as any).user?.id;
      const actorName = (req as any).user?.name || 'Unknown';

      const exemption = await service.approve(
        req.params.id,
        actorId,
        actorName,
        note
      );

      res.json({
        success: true,
        data: exemption,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/exemptions/:id/reject
   * 감면 반려
   */
  router.put('/:id/reject', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const actorId = (req as any).user?.id;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      const exemption = await service.reject(req.params.id, reason, actorId);

      res.json({
        success: true,
        data: exemption,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/exemptions/calculate
   * 회원의 총 감면 금액 계산
   */
  router.post('/calculate', async (req: Request, res: Response) => {
    try {
      const { memberId, year, originalAmount } = req.body;

      if (!memberId || !year || !originalAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: memberId, year, originalAmount',
        });
      }

      const result = await service.calculateTotalExemption(
        memberId,
        year,
        originalAmount
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

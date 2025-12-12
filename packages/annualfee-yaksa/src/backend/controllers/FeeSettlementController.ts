import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FeeSettlementService, CreateSettlementDto, SettlementFilters } from '../services/FeeSettlementService.js';
import { SettlementStatus } from '../entities/FeeSettlement.js';

/**
 * FeeSettlementController
 *
 * 회비 정산 관리 API
 */
export function createFeeSettlementController(dataSource: DataSource): Router {
  const router = Router();
  const service = new FeeSettlementService(dataSource);

  /**
   * GET /api/annualfee/settlements
   * 정산 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        organizationId,
        organizationType,
        year,
        month,
        status,
        limit,
        offset,
      } = req.query;

      const filters: SettlementFilters = {
        organizationId: organizationId as string,
        organizationType: organizationType as 'branch' | 'division' | 'national',
        year: year ? parseInt(year as string, 10) : undefined,
        month: month ? parseInt(month as string, 10) : undefined,
        status: status as SettlementStatus,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await service.findAll(filters);

      res.json({
        success: true,
        data: result.settlements,
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
   * GET /api/annualfee/settlements/year-summary/:year
   * 연도별 전체 통계
   */
  router.get('/year-summary/:year', async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.params.year, 10);
      const summary = await service.getYearSummary(year);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/settlements/organization/:organizationId
   * 조직별 정산 내역
   */
  router.get('/organization/:organizationId', async (req: Request, res: Response) => {
    try {
      const { year } = req.query;

      let settlements;
      if (year) {
        settlements = await service.findByOrganizationAndYear(
          req.params.organizationId,
          parseInt(year as string, 10)
        );
      } else {
        const result = await service.findAll({
          organizationId: req.params.organizationId,
          limit: 100,
        });
        settlements = result.settlements;
      }

      res.json({
        success: true,
        data: settlements,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/settlements/:id
   * 정산 상세 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const settlement = await service.findById(req.params.id);

      if (!settlement) {
        return res.status(404).json({
          success: false,
          error: 'Settlement not found',
        });
      }

      res.json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/settlements
   * 정산 생성
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateSettlementDto = req.body;
      const actorId = (req as any).user?.id;

      // 필수 필드 확인
      if (!dto.organizationId || !dto.organizationType || !dto.year) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: organizationId, organizationType, year',
        });
      }

      const settlement = await service.create(dto, actorId);

      res.status(201).json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/settlements/generate-bulk
   * 일괄 정산 생성
   */
  router.post('/generate-bulk', async (req: Request, res: Response) => {
    try {
      const { year, organizations } = req.body as {
        year: number;
        organizations: Array<{
          id: string;
          type: 'branch' | 'division' | 'national';
          name: string;
          parentId?: string;
        }>;
      };

      if (!year || !organizations || !organizations.length) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: year, organizations',
        });
      }

      const actorId = (req as any).user?.id;
      const result = await service.generateBulkSettlements(year, organizations, actorId);

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

  /**
   * PUT /api/annualfee/settlements/:id/confirm
   * 정산 확정
   */
  router.put('/:id/confirm', async (req: Request, res: Response) => {
    try {
      const actorId = (req as any).user?.id;
      const actorName = (req as any).user?.name || 'Unknown';

      const settlement = await service.confirm(req.params.id, actorId, actorName);

      res.json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/settlements/:id/remit
   * 송금 완료 처리
   */
  router.put('/:id/remit', async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;
      const actorId = (req as any).user?.id;

      const settlement = await service.markAsRemitted(req.params.id, actorId, reference);

      res.json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/settlements/:id/complete
   * 정산 완료 처리
   */
  router.put('/:id/complete', async (req: Request, res: Response) => {
    try {
      const actorId = (req as any).user?.id;

      const settlement = await service.complete(req.params.id, actorId);

      res.json({
        success: true,
        data: settlement,
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

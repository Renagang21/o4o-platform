import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FeePolicyService, CreateFeePolicyDto, UpdateFeePolicyDto } from '../services/FeePolicyService.js';

/**
 * FeePolicyController
 *
 * 회비 정책 관리 API
 */
export function createFeePolicyController(dataSource: DataSource): Router {
  const router = Router();
  const service = new FeePolicyService(dataSource);

  /**
   * GET /api/annualfee/policies
   * 정책 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { isActive, limit, offset } = req.query;

      const result = await service.findAll({
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.policies,
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
   * GET /api/annualfee/policies/current
   * 현재 연도 정책 조회
   */
  router.get('/current', async (req: Request, res: Response) => {
    try {
      const policy = await service.findCurrentYearPolicy();

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'No active policy found for current year',
        });
      }

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/policies/year/:year
   * 연도별 정책 조회
   */
  router.get('/year/:year', async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.params.year, 10);
      const policy = await service.findByYear(year);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: `Policy not found for year ${year}`,
        });
      }

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/policies/:id
   * 정책 상세 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const policy = await service.findById(req.params.id);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/policies
   * 정책 생성
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateFeePolicyDto = req.body;
      const policy = await service.create(dto);

      res.status(201).json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/policies/:id
   * 정책 수정
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateFeePolicyDto = req.body;
      const policy = await service.update(req.params.id, dto);

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /api/annualfee/policies/:id
   * 정책 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.delete(req.params.id);

      res.json({
        success: true,
        message: 'Policy deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/policies/:id/activate
   * 정책 활성화
   */
  router.put('/:id/activate', async (req: Request, res: Response) => {
    try {
      const policy = await service.setActive(req.params.id, true);

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/policies/:id/deactivate
   * 정책 비활성화
   */
  router.put('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const policy = await service.setActive(req.params.id, false);

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/policies/:year/clone
   * 정책 복제 (다음 연도용)
   */
  router.post('/:year/clone', async (req: Request, res: Response) => {
    try {
      const sourceYear = parseInt(req.params.year, 10);
      const policy = await service.cloneForNextYear(sourceYear);

      res.status(201).json({
        success: true,
        data: policy,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/policies/:id/rules/:ruleType
   * 정책 규칙 업데이트
   */
  router.put('/:id/rules/:ruleType', async (req: Request, res: Response) => {
    try {
      const { id, ruleType } = req.params;
      const rules = req.body.rules;

      if (!['pharmacistType', 'officialRole', 'exemption', 'organization'].includes(ruleType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rule type',
        });
      }

      const policy = await service.updateRules(
        id,
        ruleType as 'pharmacistType' | 'officialRole' | 'exemption' | 'organization',
        rules
      );

      res.json({
        success: true,
        data: policy,
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

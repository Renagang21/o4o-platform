import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FeeInvoiceService, InvoiceFilters } from '../services/FeeInvoiceService.js';
import { FeeCalculationService, MemberFeeContext } from '../services/FeeCalculationService.js';
import { InvoiceStatus } from '../entities/FeeInvoice.js';

/**
 * FeeInvoiceController
 *
 * 회비 청구 관리 API
 */
export function createFeeInvoiceController(dataSource: DataSource): Router {
  const router = Router();
  const service = new FeeInvoiceService(dataSource);
  const calculationService = new FeeCalculationService(dataSource);

  /**
   * GET /api/annualfee/invoices
   * 청구서 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        year,
        memberId,
        organizationId,
        status,
        isOverdue,
        limit,
        offset,
      } = req.query;

      const filters: InvoiceFilters = {
        year: year ? parseInt(year as string, 10) : undefined,
        memberId: memberId as string,
        organizationId: organizationId as string,
        status: status as InvoiceStatus,
        isOverdue: isOverdue === 'true',
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await service.findAll(filters);

      res.json({
        success: true,
        data: result.invoices,
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
   * GET /api/annualfee/invoices/statistics
   * 청구 통계 조회
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
   * GET /api/annualfee/invoices/member/:memberId
   * 회원별 청구서 목록
   */
  router.get('/member/:memberId', async (req: Request, res: Response) => {
    try {
      const invoices = await service.findByMember(req.params.memberId);

      res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/invoices/:id
   * 청구서 상세 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const invoice = await service.findById(req.params.id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/invoices
   * 단일 청구서 생성
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const actorId = (req as any).user?.id;
      const invoice = await service.create(req.body, actorId);

      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/invoices/generate
   * 일괄 청구서 생성
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const { memberContexts, year, policyId, dueDate } = req.body as {
        memberContexts: MemberFeeContext[];
        year: number;
        policyId: string;
        dueDate: string;
      };

      if (!memberContexts || !year || !policyId || !dueDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: memberContexts, year, policyId, dueDate',
        });
      }

      const actorId = (req as any).user?.id;
      const result = await service.generateBulkInvoices(
        memberContexts,
        year,
        policyId,
        dueDate,
        actorId
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

  /**
   * POST /api/annualfee/invoices/calculate
   * 회비 계산 (청구서 생성 전 미리보기)
   */
  router.post('/calculate', async (req: Request, res: Response) => {
    try {
      const { memberContext, year } = req.body as {
        memberContext: MemberFeeContext;
        year?: number;
      };

      if (!memberContext) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: memberContext',
        });
      }

      const result = await calculationService.calculateFee(memberContext, year);

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
   * PUT /api/annualfee/invoices/:id/send
   * 청구서 발송 처리
   */
  router.put('/:id/send', async (req: Request, res: Response) => {
    try {
      const actorId = (req as any).user?.id;
      const invoice = await service.markAsSent(req.params.id, actorId);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/invoices/:id/cancel
   * 청구서 취소
   */
  router.put('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const actorId = (req as any).user?.id;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Cancellation reason is required',
        });
      }

      const invoice = await service.cancel(req.params.id, reason, actorId);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/invoices/update-overdue
   * 연체 상태 일괄 업데이트
   */
  router.post('/update-overdue', async (req: Request, res: Response) => {
    try {
      const count = await service.updateOverdueStatus();

      res.json({
        success: true,
        data: {
          updatedCount: count,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

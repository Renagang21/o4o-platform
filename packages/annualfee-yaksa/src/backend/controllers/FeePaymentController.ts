import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FeePaymentService, CreatePaymentDto, PaymentFilters } from '../services/FeePaymentService.js';
import { PaymentMethod, PaymentStatus } from '../entities/FeePayment.js';

/**
 * FeePaymentController
 *
 * 회비 납부 관리 API
 */
export function createFeePaymentController(dataSource: DataSource): Router {
  const router = Router();
  const service = new FeePaymentService(dataSource);

  /**
   * GET /api/annualfee/payments
   * 납부 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        memberId,
        invoiceId,
        status,
        method,
        year,
        fromDate,
        toDate,
        limit,
        offset,
      } = req.query;

      const filters: PaymentFilters = {
        memberId: memberId as string,
        invoiceId: invoiceId as string,
        status: status as PaymentStatus,
        method: method as PaymentMethod,
        year: year ? parseInt(year as string, 10) : undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await service.findAll(filters);

      res.json({
        success: true,
        data: result.payments,
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
   * GET /api/annualfee/payments/statistics
   * 납부 통계 조회
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
   * GET /api/annualfee/payments/member/:memberId
   * 회원별 납부 내역
   */
  router.get('/member/:memberId', async (req: Request, res: Response) => {
    try {
      const payments = await service.findByMember(req.params.memberId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/payments/receipt/:receiptNumber
   * 영수증 번호로 납부 조회
   */
  router.get('/receipt/:receiptNumber', async (req: Request, res: Response) => {
    try {
      const payment = await service.findByReceiptNumber(req.params.receiptNumber);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/payments/:id
   * 납부 상세 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const payment = await service.findById(req.params.id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/payments
   * 납부 처리 (수동)
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreatePaymentDto = req.body;
      const actorId = (req as any).user?.id;

      // 필수 필드 확인
      if (!dto.invoiceId || !dto.memberId || !dto.amount || !dto.method) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: invoiceId, memberId, amount, method',
        });
      }

      const payment = await service.create(dto, actorId);

      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/payments/:id/refund
   * 환불 처리
   */
  router.put('/:id/refund', async (req: Request, res: Response) => {
    try {
      const { reason, amount } = req.body;
      const actorId = (req as any).user?.id;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Refund reason is required',
        });
      }

      const payment = await service.refund(
        req.params.id,
        reason,
        actorId,
        amount ? parseInt(amount, 10) : undefined
      );

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/annualfee/payments/:id/cancel
   * 납부 취소 (pending 상태만)
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

      const payment = await service.cancel(req.params.id, reason, actorId);

      res.json({
        success: true,
        data: payment,
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

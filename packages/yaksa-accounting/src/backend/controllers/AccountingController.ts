/**
 * AccountingController
 *
 * yaksa-accounting API Controller
 *
 * === 권한 규칙 ===
 * - 지부/분회 관리자만 접근
 * - organizationId는 토큰 컨텍스트에서만 추출
 * - 다른 조직 접근 ❌
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { ExpenseService, ClosingService, SummaryService } from '../services';
import { ExpenseCategory } from '../entities';

/**
 * 인증된 요청 인터페이스
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    organizationName?: string;
    role: string;
  };
}

/**
 * AccountingController 생성
 */
export function createAccountingController(dataSource: DataSource): Router {
  const router = Router();

  const expenseService = new ExpenseService(dataSource);
  const closingService = new ClosingService(dataSource);
  const summaryService = new SummaryService(dataSource);

  /**
   * 인증 미들웨어 (임시)
   * 실제로는 api-server의 인증 미들웨어 사용
   */
  const authMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    // TODO: 실제 인증 로직 연동
    // 임시로 헤더에서 추출
    const userId = req.headers['x-user-id'] as string;
    const organizationId = req.headers['x-organization-id'] as string;
    const role = req.headers['x-user-role'] as string;

    if (!userId || !organizationId) {
      res.status(401).json({ error: '인증이 필요합니다.' });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: userId,
      organizationId,
      role: role || 'member',
    };

    next();
  };

  // 모든 라우트에 인증 적용
  router.use(authMiddleware);

  // ========== Expense Routes ==========

  /**
   * POST /expenses - 지출 생성
   */
  router.post('/expenses', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId, id: userId } = authReq.user!;
      const result = await expenseService.createExpense(organizationId, userId, req.body);
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '지출 생성 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * GET /expenses - 지출 목록 조회
   */
  router.get('/expenses', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const { yearMonth, category, startDate, endDate, page, limit } = req.query;

      const result = await expenseService.listExpenses({
        organizationId,
        yearMonth: yearMonth as string,
        category: category as ExpenseCategory,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '지출 조회 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * GET /expenses/:id - 지출 상세 조회
   */
  router.get('/expenses/:id', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const { id } = req.params;

      const result = await expenseService.getExpense(organizationId, id);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '지출 조회 실패';
      res.status(404).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * PATCH /expenses/:id - 지출 수정
   */
  router.patch('/expenses/:id', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const { id } = req.params;

      const result = await expenseService.updateExpense(organizationId, id, req.body);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '지출 수정 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * DELETE /expenses/:id - 지출 삭제
   */
  router.delete('/expenses/:id', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const { id } = req.params;

      await expenseService.deleteExpense(organizationId, id);
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : '지출 삭제 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  // ========== Closing Routes ==========

  /**
   * POST /close/:yearMonth - 월 마감
   */
  router.post('/close/:yearMonth', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId, id: userId } = authReq.user!;
      const { yearMonth } = req.params;

      const result = await closingService.closeMonth(organizationId, yearMonth, userId);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '마감 처리 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * GET /close/:yearMonth - 마감 상태 조회
   */
  router.get('/close/:yearMonth', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const { yearMonth } = req.params;

      const result = await closingService.getCloseStatus(organizationId, yearMonth);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '마감 상태 조회 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * GET /close - 연간 마감 상태 목록
   */
  router.get('/close', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const year = Number(req.query.year) || new Date().getFullYear();

      const result = await closingService.listCloseStatuses(organizationId, year);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '마감 상태 목록 조회 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  // ========== Summary Routes ==========

  /**
   * GET /summary/monthly - 월별 요약
   */
  router.get('/summary/monthly', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const yearMonth = req.query.yearMonth as string;

      if (!yearMonth) {
        res.status(400).json({ error: 'yearMonth 파라미터가 필요합니다.' });
        return;
      }

      const result = await summaryService.getMonthlySummary(organizationId, yearMonth);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '월별 요약 조회 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * GET /summary/annual - 연간 요약
   */
  router.get('/summary/annual', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId } = authReq.user!;
      const year = Number(req.query.year) || new Date().getFullYear();

      const result = await summaryService.getAnnualSummary(organizationId, year);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '연간 요약 조회 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  /**
   * GET /export - 내보내기용 데이터
   */
  router.get('/export', (async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { organizationId, organizationName } = authReq.user!;
      const year = Number(req.query.year) || new Date().getFullYear();

      const result = await summaryService.getExportData(
        organizationId,
        organizationName || '조직명',
        year
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '내보내기 데이터 조회 실패';
      res.status(400).json({ error: message });
    }
  }) as RequestHandler);

  return router;
}

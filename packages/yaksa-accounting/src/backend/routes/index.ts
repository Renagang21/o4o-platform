/**
 * yaksa-accounting Backend Routes
 *
 * Phase 0: Route skeleton only
 * - 실제 핸들러는 Phase 1 이후 구현
 *
 * Route Structure:
 * /api/yaksa-accounting/expenses    - 지출 기록
 * /api/yaksa-accounting/summary     - 월/연간 요약
 * /api/yaksa-accounting/export      - 엑셀/PDF 내보내기
 *
 * === Scope Fixation Reminder ===
 * DO NOT add routes for:
 * - Double Entry / Debit-Credit
 * - Account Code Tree
 * - Budget Planning / Control
 * - Income Management
 * - Tax / Payroll
 * - Electronic Approval
 * - Bank / Card Sync
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Health check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'yaksa-accounting',
    phase: 0,
    description: 'Digital Cashbook - Phase 0 skeleton',
  });
});

/**
 * Expenses routes (Phase 1)
 * - GET /expenses - 지출 목록 조회
 * - POST /expenses - 지출 기록 생성
 * - GET /expenses/:id - 지출 상세 조회
 */
router.get('/expenses', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Expense listing will be implemented in Phase 1',
  });
});

/**
 * Summary routes (Phase 1)
 * - GET /summary/monthly - 월별 요약
 * - GET /summary/yearly - 연간 요약
 */
router.get('/summary/:type', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Summary will be implemented in Phase 1',
  });
});

/**
 * Export routes (Phase 1)
 * - GET /export/excel - 엑셀 내보내기
 * - GET /export/pdf - PDF 내보내기
 */
router.get('/export/:format', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Export will be implemented in Phase 1',
  });
});

export default router;

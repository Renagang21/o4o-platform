import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/v1/admin/settlements
 * @desc Fetch all settlements (admin view - all roles)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, status, role, date_from, date_to } = req.query;

    logger.info('[AdminSettlements] GET /settlements', {
      userId,
      page,
      limit,
      status,
      role,
      date_from,
      date_to,
    });

    res.status(200).json({
      success: true,
      data: {
        settlements: [],
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          total_pages: 0,
        },
      },
      message: 'Phase 6-5: Admin Settlements - Implementation in progress',
    });
  } catch (error: any) {
    logger.error('[AdminSettlements] Error in GET /settlements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    logger.info('[AdminSettlements] GET /settlements/:id', { userId, settlementId: id });

    res.status(200).json({
      success: true,
      data: {
        id,
        role: 'partner', // Can be partner, supplier, seller
        user_id: 'user-123',
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        status: 'OPEN',
        currency: 'KRW',
        gross_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        memo_internal: '',
        lines: [],
      },
      message: 'Phase 6-5: Admin Settlements - Implementation in progress',
    });
  } catch (error: any) {
    logger.error('[AdminSettlements] Error in GET /settlements/:id', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { role, user_id, period_start, period_end, memo_internal } = req.body;

    logger.info('[AdminSettlements] POST /settlements', {
      userId,
      role,
      user_id,
      period_start,
      period_end,
    });

    const newSettlement = {
      id: `stl-${Date.now()}`,
      role,
      user_id,
      period_start,
      period_end,
      status: 'OPEN',
      currency: 'KRW',
      gross_amount: 0,
      adjustment_amount: 0,
      net_payout_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      memo_internal: memo_internal || '',
      lines: [],
    };

    res.status(201).json({
      success: true,
      data: newSettlement,
      message: '정산이 성공적으로 생성되었습니다.',
    });
  } catch (error: any) {
    logger.error('[AdminSettlements] Error in POST /settlements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { status, memo_internal } = req.body;

    logger.info('[AdminSettlements] PATCH /settlements/:id/status', {
      userId,
      settlementId: id,
      status,
    });

    res.status(200).json({
      success: true,
      data: {
        id,
        status,
        updated_at: new Date().toISOString(),
      },
      message: '정산 상태가 업데이트되었습니다.',
    });
  } catch (error: any) {
    logger.error('[AdminSettlements] Error in PATCH /settlements/:id/status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.patch('/:id/internal-note', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { memo_internal } = req.body;

    logger.info('[AdminSettlements] PATCH /settlements/:id/internal-note', {
      userId,
      settlementId: id,
    });

    res.status(200).json({
      success: true,
      data: {
        id,
        memo_internal,
        updated_at: new Date().toISOString(),
      },
      message: '메모가 저장되었습니다.',
    });
  } catch (error: any) {
    logger.error('[AdminSettlements] Error in PATCH /settlements/:id/internal-note', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;

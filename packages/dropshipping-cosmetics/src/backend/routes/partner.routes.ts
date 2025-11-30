import { Router, Request, Response } from 'express';
import { InfluencerRoutineService } from '../services/InfluencerRoutineService.js';

const router = Router();

/**
 * Partner Dashboard & Performance Endpoints
 */

/**
 * GET /api/v1/partner/dashboard
 * Get partner dashboard summary
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // TODO: Get partnerId from auth context
    const partnerId = req.query.partnerId as string || 'mock-partner-id';

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    const performance = await routineService.getPartnerPerformance(partnerId);

    // Mock commission data (TODO: integrate with Commission API)
    const commissionSummary = {
      thisMonth: 92500,
      lastMonth: 68000,
      totalEarned: 520000,
      nextSettlementDate: '2025-12-15',
      partnerTier: 'silver',
      commissionRate: 15,
    };

    res.json({
      success: true,
      data: {
        performance,
        commission: commissionSummary,
      },
    });
  } catch (error) {
    console.error('Error fetching partner dashboard:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to fetch partner dashboard',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * GET /api/v1/partner/routines
 * Get all routines for a partner
 */
router.get('/routines', async (req: Request, res: Response) => {
  try {
    // TODO: Get partnerId from auth context
    const partnerId = req.query.partnerId as string || 'mock-partner-id';

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    const routines = await routineService.getPartnerRoutines(partnerId);

    res.json({
      success: true,
      data: {
        routines,
        totalCount: routines.length,
      },
    });
  } catch (error) {
    console.error('Error fetching partner routines:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ROUTINES_ERROR',
        message: 'Failed to fetch partner routines',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * GET /api/v1/partner/commission-summary
 * Get partner commission summary
 */
router.get('/commission-summary', async (req: Request, res: Response) => {
  try {
    // TODO: Get partnerId from auth context
    const partnerId = req.query.partnerId as string || 'mock-partner-id';

    // TODO: Integrate with actual Commission API
    const commissionSummary = {
      partnerId,
      thisMonth: 92500,
      lastMonth: 68000,
      totalEarned: 520000,
      totalPaid: 420000,
      pending: 100000,
      nextSettlementDate: '2025-12-15',
      partnerTier: 'silver',
      commissionRate: 15,
      recentTransactions: [
        {
          date: '2025-11-28',
          amount: 15000,
          routineTitle: '여드름 진정 루틴',
          type: 'conversion',
        },
        {
          date: '2025-11-27',
          amount: 8500,
          routineTitle: '미백 루틴',
          type: 'conversion',
        },
        {
          date: '2025-11-26',
          amount: 12000,
          routineTitle: '보습 루틴',
          type: 'conversion',
        },
      ],
    };

    res.json({
      success: true,
      data: commissionSummary,
    });
  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'COMMISSION_ERROR',
        message: 'Failed to fetch commission summary',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * GET /api/v1/partner/engagement
 * Get partner engagement metrics
 */
router.get('/engagement', async (req: Request, res: Response) => {
  try {
    // TODO: Get partnerId from auth context
    const partnerId = req.query.partnerId as string || 'mock-partner-id';

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    const routines = await routineService.getPartnerRoutines(partnerId);

    // Aggregate skin type and concern popularity
    const skinTypeCount: Record<string, number> = {};
    const concernCount: Record<string, number> = {};

    routines.forEach((routine) => {
      routine.skinType?.forEach((type: string) => {
        skinTypeCount[type] = (skinTypeCount[type] || 0) + routine.viewCount;
      });
      routine.concerns?.forEach((concern: string) => {
        concernCount[concern] = (concernCount[concern] || 0) + routine.viewCount;
      });
    });

    const topSkinTypes = Object.entries(skinTypeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type, views]) => ({ type, views }));

    const topConcerns = Object.entries(concernCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([concern, views]) => ({ concern, views }));

    res.json({
      success: true,
      data: {
        topSkinTypes,
        topConcerns,
        totalEngagement: routines.reduce((sum, r) => sum + r.viewCount + r.recommendCount, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ENGAGEMENT_ERROR',
        message: 'Failed to fetch engagement metrics',
        details: (error as Error).message,
      },
    });
  }
});

export default router;

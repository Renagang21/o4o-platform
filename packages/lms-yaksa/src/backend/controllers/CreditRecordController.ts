import { Router, Request, Response } from 'express';
import type { CreditRecordService } from '../services/CreditRecordService.js';
import { CreditType } from '../entities/CreditRecord.entity.js';

/**
 * CreditRecordController
 *
 * REST API endpoints for managing credit records.
 * Base path: /lms/yaksa/credits
 */
export function createCreditRecordRoutes(
  creditRecordService: CreditRecordService
): Router {
  const router = Router();

  /**
   * GET /:userId
   * Get all credit records for a user
   */
  router.get('/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { year } = req.query;

      let credits;
      if (year && typeof year === 'string') {
        credits = await creditRecordService.getCreditsByYear(userId, parseInt(year, 10));
      } else {
        credits = await creditRecordService.getCredits(userId);
      }

      return res.json({
        success: true,
        data: credits,
      });
    } catch (error) {
      console.error('Error fetching credit records:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch credit records',
      });
    }
  });

  /**
   * GET /:userId/summary
   * Get credit summary for a user
   */
  router.get('/:userId/summary', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const summary = await creditRecordService.getCreditSummary(userId);

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching credit summary:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch credit summary',
      });
    }
  });

  /**
   * GET /:userId/aggregate
   * Get aggregated credits by year for a user
   */
  router.get('/:userId/aggregate', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { groupBy } = req.query;

      let aggregated;
      if (groupBy === 'type') {
        aggregated = await creditRecordService.aggregateCreditsByType(userId);
      } else {
        aggregated = await creditRecordService.aggregateCreditsByYear(userId);
      }

      return res.json({
        success: true,
        data: aggregated,
        groupBy: groupBy || 'year',
      });
    } catch (error) {
      console.error('Error aggregating credits:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to aggregate credits',
      });
    }
  });

  /**
   * POST /
   * Add a new credit record
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        courseId,
        credits,
        certificateId,
        creditType,
        courseTitle,
        enrollmentId,
        earnedAt,
        note,
        metadata,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required',
        });
      }

      if (credits === undefined || credits === null) {
        return res.status(400).json({
          success: false,
          error: 'credits is required',
        });
      }

      const record = await creditRecordService.addCreditRecord(
        userId,
        courseId || null,
        Number(credits),
        certificateId,
        {
          creditType: creditType as CreditType,
          courseTitle,
          enrollmentId,
          earnedAt: earnedAt ? new Date(earnedAt) : undefined,
          note,
          metadata,
        }
      );

      return res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error('Error adding credit record:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add credit record',
      });
    }
  });

  /**
   * POST /external
   * Add an external credit record (requires verification)
   */
  router.post('/external', async (req: Request, res: Response) => {
    try {
      const { userId, credits, note, metadata } = req.body;

      if (!userId || credits === undefined || !note) {
        return res.status(400).json({
          success: false,
          error: 'userId, credits, and note are required',
        });
      }

      const record = await creditRecordService.addExternalCredit(
        userId,
        Number(credits),
        note,
        metadata
      );

      return res.status(201).json({
        success: true,
        data: record,
        message: 'External credit added. Verification required.',
      });
    } catch (error) {
      console.error('Error adding external credit:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add external credit',
      });
    }
  });

  /**
   * POST /manual-adjustment
   * Add a manual credit adjustment
   */
  router.post('/manual-adjustment', async (req: Request, res: Response) => {
    try {
      const { userId, credits, note, verifiedBy } = req.body;

      if (!userId || credits === undefined || !note || !verifiedBy) {
        return res.status(400).json({
          success: false,
          error: 'userId, credits, note, and verifiedBy are required',
        });
      }

      const record = await creditRecordService.addManualAdjustment(
        userId,
        Number(credits),
        note,
        verifiedBy
      );

      return res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error('Error adding manual adjustment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add manual adjustment',
      });
    }
  });

  /**
   * POST /:id/verify
   * Verify a credit record
   */
  router.post('/:id/verify', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { verifiedBy } = req.body;

      if (!verifiedBy) {
        return res.status(400).json({
          success: false,
          error: 'verifiedBy is required',
        });
      }

      const record = await creditRecordService.verifyCredit(id, verifiedBy);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Credit record not found',
        });
      }

      return res.json({
        success: true,
        data: record,
        message: 'Credit verified successfully',
      });
    } catch (error) {
      console.error('Error verifying credit:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify credit',
      });
    }
  });

  /**
   * POST /:id/reject
   * Reject a credit record
   */
  router.post('/:id/reject', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { note } = req.body;

      if (!note) {
        return res.status(400).json({
          success: false,
          error: 'note is required for rejection',
        });
      }

      const record = await creditRecordService.rejectCredit(id, note);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Credit record not found',
        });
      }

      return res.json({
        success: true,
        data: record,
        message: 'Credit rejected',
      });
    } catch (error) {
      console.error('Error rejecting credit:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reject credit',
      });
    }
  });

  /**
   * GET /admin/unverified
   * Get all unverified credit records (admin only)
   */
  router.get('/admin/unverified', async (req: Request, res: Response) => {
    try {
      const unverified = await creditRecordService.getUnverifiedCredits();

      return res.json({
        success: true,
        data: unverified,
        count: unverified.length,
      });
    } catch (error) {
      console.error('Error fetching unverified credits:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch unverified credits',
      });
    }
  });

  /**
   * PATCH /:id
   * Update a credit record
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const record = await creditRecordService.updateCreditRecord(id, data);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Credit record not found',
        });
      }

      return res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error('Error updating credit record:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update credit record',
      });
    }
  });

  /**
   * DELETE /:id
   * Delete a credit record
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await creditRecordService.deleteCreditRecord(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Credit record not found',
        });
      }

      return res.json({
        success: true,
        message: 'Credit record deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting credit record:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete credit record',
      });
    }
  });

  return router;
}

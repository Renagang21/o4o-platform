/**
 * Payout Admin Routes
 *
 * WO-O4O-PAYOUT-ENGINE-V1
 *
 * POST /admin/payouts/supplier/create — Supplier payout batch 생성
 * POST /admin/payouts/partner/create  — Partner payout batch 생성
 * GET  /admin/payouts                 — Payout batch 목록
 * GET  /admin/payouts/:id             — Payout batch 상세
 * PATCH /admin/payouts/:id/paid       — 지급 완료 처리
 *
 * 인증: requireAuth + requireNetureScope('neture:admin')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { RequestHandler } from 'express';
import { PayoutService } from './services/payout.service.js';
import logger from '../../utils/logger.js';

export function createPayoutRoutes(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireAdminScope: RequestHandler,
): Router {
  const router = Router();
  const payoutService = new PayoutService(dataSource);

  // ─── POST /admin/payouts/supplier/create ──────────────────────
  router.post(
    '/admin/payouts/supplier/create',
    requireAuth,
    requireAdminScope,
    async (req: Request, res: Response) => {
      try {
        const { periodStart, periodEnd, notes } = req.body;
        if (!periodStart || !periodEnd) {
          res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'periodStart and periodEnd are required (YYYY-MM-DD)',
          });
          return;
        }

        const result = await payoutService.createSupplierPayoutBatch(periodStart, periodEnd, notes);
        if (!result.success) {
          res.status(400).json({ success: false, error: result.error });
          return;
        }

        res.status(201).json({
          success: true,
          data: result.data,
          itemCount: result.itemCount,
        });
      } catch (error) {
        logger.error('[Payout API] Error creating supplier payout batch:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  );

  // ─── POST /admin/payouts/partner/create ───────────────────────
  router.post(
    '/admin/payouts/partner/create',
    requireAuth,
    requireAdminScope,
    async (req: Request, res: Response) => {
      try {
        const { periodStart, periodEnd, notes } = req.body;
        if (!periodStart || !periodEnd) {
          res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'periodStart and periodEnd are required (YYYY-MM-DD)',
          });
          return;
        }

        const result = await payoutService.createPartnerPayoutBatch(periodStart, periodEnd, notes);
        if (!result.success) {
          res.status(400).json({ success: false, error: result.error });
          return;
        }

        res.status(201).json({
          success: true,
          data: result.data,
          itemCount: result.itemCount,
        });
      } catch (error) {
        logger.error('[Payout API] Error creating partner payout batch:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  );

  // ─── GET /admin/payouts ───────────────────────────────────────
  router.get(
    '/admin/payouts',
    requireAuth,
    requireAdminScope,
    async (req: Request, res: Response) => {
      try {
        const { payoutType, status } = req.query;
        const batches = await payoutService.listPayoutBatches({
          payoutType: payoutType as string | undefined,
          status: status as string | undefined,
        });
        res.json({ success: true, data: batches });
      } catch (error) {
        logger.error('[Payout API] Error listing payout batches:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  );

  // ─── GET /admin/payouts/:id ───────────────────────────────────
  router.get(
    '/admin/payouts/:id',
    requireAuth,
    requireAdminScope,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const result = await payoutService.getPayoutBatch(id);
        if (!result.success) {
          res.status(404).json({ success: false, error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Payout API] Error fetching payout batch:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  );

  // ─── PATCH /admin/payouts/:id/paid ────────────────────────────
  router.patch(
    '/admin/payouts/:id/paid',
    requireAuth,
    requireAdminScope,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { notes } = req.body || {};
        const result = await payoutService.markPaid(id, notes);
        if (!result.success) {
          const statusCode = result.error === 'BATCH_NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ success: false, error: result.error });
          return;
        }
        res.json({ success: true, message: 'Payout batch marked as paid' });
      } catch (error) {
        logger.error('[Payout API] Error marking payout batch paid:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  );

  return router;
}

/**
 * KPA Branch Member Controller
 *
 * WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from kpa.routes.ts lines 185-558 — branch member workflow + district hierarchy
 *
 * Endpoints:
 * 1. GET    /branches/:branchId/pending-members                     — dual-query pending list
 * 2. PATCH  /branches/:branchId/pending-members/:requestId/approve  — approve (TRANSACTION)
 * 3. PATCH  /branches/:branchId/pending-members/:requestId/reject   — reject
 * 4. GET    /district/:districtId/branches-summary                  — district branch summary
 * 5. GET    /district/:districtId/overview-summary                  — district KPI overview
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { BranchMemberService } from '../services/branch-member.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createBranchMemberController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireKpaScope: (scope: string) => RequestHandler,
): Router {
  const router = Router();
  const service = new BranchMemberService(dataSource);

  // ─── 1) GET /branches/:branchId/pending-members ───────────────────
  // WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: dual-query
  router.get(
    '/branches/:branchId/pending-members',
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } });
        return;
      }
      if (!(await service.verifyBranchAdmin(user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } });
        return;
      }

      const data = await service.getPendingMembers(branchId);
      res.json({ success: true, data });
    }),
  );

  // ─── 2) PATCH /branches/:branchId/pending-members/:requestId/approve
  // dual-table lookup, TRANSACTION
  router.patch(
    '/branches/:branchId/pending-members/:requestId/approve',
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, requestId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } });
        return;
      }
      if (!(await service.verifyBranchAdmin(user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } });
        return;
      }

      const result = await service.approveMember(branchId, requestId, user.id);
      if (!result) {
        res.status(409).json({ success: false, error: { code: 'NOT_PENDING', message: 'Request not found or already processed' } });
        return;
      }
      res.json({ success: true, data: result });
    }),
  );

  // ─── 3) PATCH /branches/:branchId/pending-members/:requestId/reject
  // dual-table lookup
  router.patch(
    '/branches/:branchId/pending-members/:requestId/reject',
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, requestId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } });
        return;
      }
      if (!(await service.verifyBranchAdmin(user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } });
        return;
      }

      const result = await service.rejectMember(branchId, requestId, user.id);
      if (!result) {
        res.status(409).json({ success: false, error: { code: 'NOT_PENDING', message: 'Request not found or already processed' } });
        return;
      }
      res.json({ success: true, data: result });
    }),
  );

  // ──────────────────────────────────────────────────────────────────
  // WO-KPA-B-ORG-HIERARCHY-VISUALIZATION-V1
  // District hierarchy — 산하 분회 요약 (district:admin 전용)
  // ──────────────────────────────────────────────────────────────────

  // ─── 4) GET /district/:districtId/branches-summary ────────────────
  router.get(
    '/district/:districtId/branches-summary',
    requireAuth,
    requireKpaScope('kpa:admin'),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { districtId } = req.params;

      if (!UUID_RE.test(districtId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid district ID' } });
        return;
      }

      const result = await service.getBranchesSummary(districtId);
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'District not found' } });
        return;
      }

      res.json({
        success: true,
        data: {
          districtId: result.district.id,
          districtName: result.district.name,
          branches: result.branches,
          totalBranches: result.totalBranches,
        },
      });
    }),
  );

  // ──────────────────────────────────────────────────────────────────
  // WO-KPA-B-DISTRICT-OVERVIEW-KPI-V1
  // District overview — 지부 통합 관제 KPI (district:admin 전용)
  // ──────────────────────────────────────────────────────────────────

  // ─── 5) GET /district/:districtId/overview-summary ────────────────
  router.get(
    '/district/:districtId/overview-summary',
    requireAuth,
    requireKpaScope('kpa:admin'),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { districtId } = req.params;

      if (!UUID_RE.test(districtId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid district ID' } });
        return;
      }

      const result = await service.getOverviewSummary(districtId);
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'District not found' } });
        return;
      }

      res.json({
        success: true,
        data: {
          district: result.district,
          totals: result.totals,
        },
      });
    }),
  );

  return router;
}

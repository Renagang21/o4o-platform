/**
 * GlycopharmMemberController
 *
 * WO-GLYCOPHARM-MEMBER-REGISTER-FLOW-V1
 * 약사 회원 가입 신청 / 운영자 승인·거절 API
 *
 * Routes:
 *   POST   /api/v1/glycopharm/members/apply        — 가입 신청 (인증 필요)
 *   GET    /api/v1/glycopharm/members/me            — 내 신청 상태 (인증 필요)
 *   GET    /api/v1/glycopharm/members               — 회원 목록 (운영자)
 *   PATCH  /api/v1/glycopharm/members/:id/approve  — 승인 (운영자)
 *   PATCH  /api/v1/glycopharm/members/:id/reject   — 거절 (운영자)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { body, query, validationResult } from 'express-validator';
import { GlycopharmMemberService } from '../services/glycopharm-member.service.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';

interface AuthRequest extends Request {
  user?: {
    userId?: string;
    id?: string;
    roles?: string[];
  };
}

function isOperatorOrAdmin(roles: string[] = []): boolean {
  return hasAnyServiceRole(roles, [
    'glycopharm:admin',
    'glycopharm:operator',
    'platform:admin',
    'platform:super_admin',
  ]);
}

function getUserId(req: AuthRequest): string | null {
  return req.user?.userId ?? req.user?.id ?? null;
}

export function createGlycopharmMemberController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const memberService = new GlycopharmMemberService(dataSource);

  // ─── POST /members/apply ───────────────────────────────────────
  router.post(
    '/members/apply',
    requireAuth,
    body('subRole').isIn(['pharmacy_owner', 'staff_pharmacist']).withMessage('subRole은 pharmacy_owner 또는 staff_pharmacist 이어야 합니다.'),
    body('licenseNumber').optional({ nullable: true }).isString().trim(),
    body('organizationId').optional({ nullable: true }).isUUID().withMessage('organizationId는 UUID 형식이어야 합니다.'),
    body('pharmacyName').optional({ nullable: true }).isString().trim().isLength({ max: 200 }),
    body('pharmacyAddress').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: '입력 값이 올바르지 않습니다.', details: errors.array() });
        return;
      }

      const userId = getUserId(req as AuthRequest);
      if (!userId) {
        res.status(401).json({ success: false, error: '인증이 필요합니다.' });
        return;
      }

      const { subRole, licenseNumber, organizationId, pharmacyName, pharmacyAddress } = req.body;

      try {
        const member = await memberService.applyMembership(userId, {
          subRole,
          licenseNumber: licenseNumber || undefined,
          organizationId: organizationId || undefined,
          pharmacyName: pharmacyName || undefined,
          pharmacyAddress: pharmacyAddress || undefined,
        });
        res.status(201).json({ success: true, data: member });
      } catch (err: any) {
        if (err.code === 'ALREADY_APPLIED') {
          res.status(409).json({ success: false, error: '이미 신청하신 내역이 있습니다.', code: 'ALREADY_APPLIED' });
        } else if (err.code === 'PHARMACY_INFO_REQUIRED') {
          res.status(400).json({ success: false, error: '약국경영자는 약국명이 필요합니다.', code: 'PHARMACY_INFO_REQUIRED' });
        } else {
          res.status(500).json({ success: false, error: '신청 처리 중 오류가 발생했습니다.' });
        }
      }
    },
  );

  // ─── GET /members/me ───────────────────────────────────────────
  router.get('/members/me', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    const member = await memberService.getMyMembership(userId);
    res.json({ success: true, data: member });
  });

  // ─── GET /members (operator) ───────────────────────────────────
  router.get(
    '/members',
    requireAuth,
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended', 'withdrawn']),
    query('subRole').optional().isIn(['pharmacy_owner', 'staff_pharmacist']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    async (req: Request, res: Response) => {
      const authReq = req as AuthRequest;
      if (!isOperatorOrAdmin(authReq.user?.roles ?? [])) {
        res.status(403).json({ success: false, error: '운영자 또는 관리자 권한이 필요합니다.' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: '잘못된 파라미터입니다.', details: errors.array() });
        return;
      }

      const status = req.query.status as string | undefined;
      const subRole = req.query.subRole as string | undefined;
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const limit = parseInt(String(req.query.limit ?? '20'), 10);

      const result = await memberService.listMembers({ status, subRole, page, limit });
      res.json({ success: true, data: result });
    },
  );

  // ─── PATCH /members/:id/approve ───────────────────────────────
  router.patch('/members/:id/approve', requireAuth, async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const operatorId = getUserId(authReq);

    if (!operatorId || !isOperatorOrAdmin(authReq.user?.roles ?? [])) {
      res.status(403).json({ success: false, error: '운영자 또는 관리자 권한이 필요합니다.' });
      return;
    }

    try {
      const member = await memberService.approveMember(req.params.id, operatorId);
      res.json({ success: true, data: member });
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({ success: false, error: '신청을 찾을 수 없습니다.' });
      } else if (err.code === 'NOT_PENDING') {
        res.status(400).json({ success: false, error: '승인 대기 상태가 아닙니다.' });
      } else {
        res.status(500).json({ success: false, error: '처리 중 오류가 발생했습니다.' });
      }
    }
  });

  // ─── PATCH /members/:id/reject ────────────────────────────────
  router.patch(
    '/members/:id/reject',
    requireAuth,
    body('reason').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
    async (req: Request, res: Response) => {
      const authReq = req as AuthRequest;
      const operatorId = getUserId(authReq);

      if (!operatorId || !isOperatorOrAdmin(authReq.user?.roles ?? [])) {
        res.status(403).json({ success: false, error: '운영자 또는 관리자 권한이 필요합니다.' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: '잘못된 파라미터입니다.', details: errors.array() });
        return;
      }

      const { reason } = req.body;

      try {
        const member = await memberService.rejectMember(req.params.id, operatorId, reason || undefined);
        res.json({ success: true, data: member });
      } catch (err: any) {
        if (err.code === 'NOT_FOUND') {
          res.status(404).json({ success: false, error: '신청을 찾을 수 없습니다.' });
        } else if (err.code === 'NOT_PENDING') {
          res.status(400).json({ success: false, error: '승인 대기 상태가 아닙니다.' });
        } else {
          res.status(500).json({ success: false, error: '처리 중 오류가 발생했습니다.' });
        }
      }
    },
  );

  return router;
}

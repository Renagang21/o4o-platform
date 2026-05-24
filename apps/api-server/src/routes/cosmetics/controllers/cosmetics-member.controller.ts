/**
 * CosmeticsMemberController
 *
 * WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1
 *   K-Cosmetics 회원 프로필 분류 (sub_role: store_owner / store_staff) Operator PATCH endpoint.
 *
 * Routes (mounted at /api/v1/cosmetics):
 *   GET   /members              — 회원 목록 (operator)
 *   GET   /members/me           — 내 sub_role 조회 (인증 필요)
 *   GET   /members/:userId      — 특정 회원의 sub_role 조회 (operator)
 *   PATCH /members/:userId      — sub_role 설정 / 변경 (operator)
 *
 * 권한 (operator-only PATCH):
 *   - cosmetics:operator
 *   - cosmetics:admin
 *   - platform:admin
 *   - platform:super_admin
 *
 * 패턴: GlycopharmMemberController (apps/api-server/src/routes/glycopharm/controllers/glycopharm-member.controller.ts) mirror.
 *
 * 본 controller 는 profile classification 만 다룬다. 권한 role (cosmetics:store_owner) 변경은
 * 별도 endpoint (operator/members PUT 의 role_assignments) 와 분리 유지.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { body, query, validationResult } from 'express-validator';
import { CosmeticsMember } from '../entities/cosmetics-member.entity.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';

interface AuthRequest extends Request {
  user?: {
    userId?: string;
    id?: string;
    roles?: string[];
  };
}

const SUB_ROLE_VALUES = ['store_owner', 'store_staff'] as const;
type CosmeticsMemberSubRole = (typeof SUB_ROLE_VALUES)[number];

function isOperatorOrAdmin(roles: string[] = []): boolean {
  return hasAnyServiceRole(roles, [
    'cosmetics:admin',
    'cosmetics:operator',
    'platform:admin',
    'platform:super_admin',
  ]);
}

function getUserId(req: AuthRequest): string | null {
  return req.user?.userId ?? req.user?.id ?? null;
}

export function createCosmeticsMemberController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const repo = dataSource.getRepository(CosmeticsMember);

  // ─── GET /members/me ────────────────────────────────────────
  router.get('/members/me', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }
    const member = await repo.findOne({ where: { userId } });
    res.json({ success: true, data: member });
  });

  // ─── GET /members (operator) ────────────────────────────────
  router.get(
    '/members',
    requireAuth,
    query('status').optional().isIn(['active', 'suspended', 'withdrawn']),
    query('subRole').optional().isIn(SUB_ROLE_VALUES as unknown as string[]),
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

      const qb = repo.createQueryBuilder('m').orderBy('m.createdAt', 'DESC');
      if (status) qb.andWhere('m.status = :status', { status });
      if (subRole) qb.andWhere('m.subRole = :subRole', { subRole });
      qb.skip((page - 1) * limit).take(limit);

      const [items, total] = await qb.getManyAndCount();
      res.json({ success: true, data: { items, total, page, limit } });
    },
  );

  // ─── GET /members/:userId (operator) ────────────────────────
  router.get('/members/:userId', requireAuth, async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    if (!isOperatorOrAdmin(authReq.user?.roles ?? [])) {
      res.status(403).json({ success: false, error: '운영자 또는 관리자 권한이 필요합니다.' });
      return;
    }
    const member = await repo.findOne({ where: { userId: req.params.userId } });
    if (!member) {
      res.status(404).json({ success: false, error: '회원 프로필이 없습니다.', code: 'NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: member });
  });

  // ─── PATCH /members/:userId (operator) ──────────────────────
  //   profile classification (sub_role) upsert. 없으면 신규 row 생성, 있으면 update.
  router.patch(
    '/members/:userId',
    requireAuth,
    body('subRole')
      .isIn(SUB_ROLE_VALUES as unknown as string[])
      .withMessage(`subRole 은 ${SUB_ROLE_VALUES.join(' 또는 ')} 이어야 합니다.`),
    async (req: Request, res: Response) => {
      const authReq = req as AuthRequest;
      const operatorId = getUserId(authReq);

      if (!operatorId || !isOperatorOrAdmin(authReq.user?.roles ?? [])) {
        res.status(403).json({ success: false, error: '운영자 또는 관리자 권한이 필요합니다.' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: '입력 값이 올바르지 않습니다.',
          code: 'INVALID_SUB_ROLE',
          details: errors.array(),
        });
        return;
      }

      const { userId } = req.params;
      const { subRole } = req.body as { subRole: CosmeticsMemberSubRole };

      try {
        let member = await repo.findOne({ where: { userId } });
        if (!member) {
          member = repo.create({
            userId,
            subRole,
            status: 'active',
            membershipType: 'cosmetics_member',
          });
        } else {
          member.subRole = subRole;
        }
        const saved = await repo.save(member);
        res.json({ success: true, data: saved });
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: 'sub_role 저장 중 오류가 발생했습니다.',
          code: 'INTERNAL_ERROR',
        });
      }
    },
  );

  return router;
}

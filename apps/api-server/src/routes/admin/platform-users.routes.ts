/**
 * Admin Platform Users — 전체 사용자 read-only 조회 (additive)
 * WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1
 * 선행 조사: IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1 (권장안 B — read-only + PII 투영)
 *
 * frozen AdminUserController / users.routes (WO-O4O-CORE-FREEZE-V1) 를 수정하지 않고,
 * platform-admin 거버넌스용 "전체 사용자 식별" read-only 목록만 격리 제공한다.
 *
 * 보안 원칙 (platform-accounts 투영 패턴 동일):
 *   - User 엔티티 전체 spread 금지 / password 만 제거 방식 금지.
 *   - 안전 필드만 명시적 pick: id, email, name, roles[], status, isActive, createdAt, lastLoginAt.
 *   - 제외(절대 미반환): password, refreshTokenFamily, phone, businessInfo, lastLoginIp,
 *     provider/provider_id, kakao URL, avatar, 동의 타임스탬프 등 PII/보안 토큰.
 *   - read-only: mutation(상태변경/삭제/파기/role편집) 없음 — 기존 service admin/operator 경계 유지.
 *   - guard: platform:admin / platform:super_admin.
 *
 * 재사용(중복 0): User 엔티티, role_assignments(RBAC SSOT) 배치 조회. AdminUserController 의
 * 목록 쿼리(pagination/search/role·status filter) 패턴 복제하되 투영만 적용.
 */
import { Router, type Request, type Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

// 접근 권한: platform admin 이상 (서비스 admin/operator 비허용)
const ADMIN_ACCESS_ROLES = ['platform:super_admin', 'platform:admin'];
const MAX_LIMIT = 100;

router.use(authenticate);

// GET /api/v1/admin/platform-users — 전체 사용자 목록(안전 필드 투영, read-only)
router.get('/', requireRole(ADMIN_ACCESS_ROLES), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;

    const userRepo = AppDataSource.getRepository(User);
    const qb = userRepo.createQueryBuilder('user');

    if (search) {
      // WO-O4O-PLATFORM-USERS-SEARCH-COMPANY-FIELD-FIX-V1: User 엔티티에 company 없음 → 제거(500 원인).
      qb.where(
        '(user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    // role filter via role_assignments (RBAC SSOT)
    if (role && role !== 'all') {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = user.id AND ra.is_active = true AND ra.role = :filterRole)`,
        { filterRole: role },
      );
    }
    if (status && status !== 'all') {
      qb.andWhere('user.status = :status', { status });
    }

    qb.orderBy('user.createdAt', 'DESC');

    const take = Math.min(Math.max(Number(limit) || 20, 1), MAX_LIMIT);
    const pageNum = Math.max(Number(page) || 1, 1);
    qb.skip((pageNum - 1) * take).take(take);

    const [users, total] = await qb.getManyAndCount();

    // roles 배치 조회 (role_assignments active)
    const ids = users.map((u) => u.id);
    const roleMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      const rows: Array<{ user_id: string; roles: string[] }> = await AppDataSource.query(
        `SELECT user_id, ARRAY_AGG(role ORDER BY role) as roles
         FROM role_assignments
         WHERE user_id = ANY($1) AND is_active = true
         GROUP BY user_id`,
        [ids],
      );
      for (const row of rows) roleMap[row.user_id] = row.roles || [];
    }

    // ⚠️ 안전 필드만 명시적 pick (spread 금지)
    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
      roles: roleMap[u.id] || [],
      status: u.status,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt ?? null,
    }));

    res.json({
      success: true,
      data,
      pagination: { page: pageNum, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    logger.error('[platform-users] list failed:', error);
    res.status(500).json({ success: false, error: '사용자 목록 조회 실패', code: 'LIST_FAILED' });
  }
});

export default router;

/**
 * Admin Platform Accounts — 최고 관리자 계정 안전 유지관리 (additive)
 * WO-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1
 *
 * frozen AdminUserController / users.routes (WO-O4O-CORE-FREEZE-V1) 를 수정하지 않고,
 * admin 계정의 목록 조회 · 활성 토글만 격리 제공한다.
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 비밀번호 재설정 경로는 은퇴했다.
 *
 * 재사용(중복 0): User 엔티티, roleAssignmentService(RBAC SSOT).
 * 서버측 보호(frontend 차단에 의존하지 않음):
 *   - 본인 계정 비활성 차단(SELF_LOCK)
 *   - 마지막 활성 super_admin 비활성 차단(LAST_SUPER_ADMIN)
 *   - super_admin 대상 변경은 super_admin 만 가능(SUPER_ADMIN_ONLY)
 *   - 응답에 password 등 민감 필드 미포함
 * V1 범위: 역할 편집 없음(역할 변경은 RBAC Role Assignment 화면에서 관리).
 *
 * WO-O4O-SINGLE-GOOGLE-ACCOUNT-ADMIN-OPERATOR-ENROLLMENT-V1:
 *   `platform:super_admin` **부여**의 정식 경로를 여기에 둔다(아래 POST /:id/super-admin).
 *   종전에는 부여 경로가 어디에도 없었고, 유일하게 열려 있던 것은 범용 역할 API
 *   (`POST /operator/members/:id/roles`)가 platform admin 요청자에게 assignability 검사를
 *   건너뛰는 틈이었다. 그 틈으로 주는 것은 `operator-assignments` allowlist 가
 *   `platform:*` 을 **의도적으로 제외한** 경계를 우회하는 것이므로 채택하지 않는다.
 *   플랫폼 계정은 이 화면 소관이라는 기존 선언(`/settings/admin-accounts`)에 맞춰
 *   **관리자 전용 경로를 명시적으로 신설**한다.
 *
 *   회수는 이 WO 범위가 아니다 — 기존 관리자 계정의 역할을 건드리지 않는다.
 */
import { Router, type Request, type Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

// 접근 권한: platform admin 이상
const ADMIN_ACCESS_ROLES = ['platform:super_admin'];
// 목록에 표시할 관리자성 역할
const ADMIN_ACCOUNT_ROLES = ['platform:super_admin', 'neture:admin', 'neture:operator'];
const SUPER_ADMIN_ROLE = 'platform:super_admin';

router.use(authenticate);

/** 현재 활성(isActive) super_admin user id 목록 — role active + user.isActive */
async function activeSuperAdminIds(): Promise<string[]> {
  const ids = await roleAssignmentService.getUsersWithRole(SUPER_ADMIN_ROLE);
  if (ids.length === 0) return [];
  const repo = AppDataSource.getRepository(User);
  const users = await repo.find({ where: { id: In(ids) } });
  return users.filter((u) => u.isActive).map((u) => u.id);
}

/** 대상이 super_admin 이고 actor 가 super_admin 이 아니면 403 (true=차단됨) */
async function blockedBySuperAdminGuard(targetId: string, actorId: string | undefined, res: Response): Promise<boolean> {
  const targetSuper = await roleAssignmentService.hasRole(targetId, SUPER_ADMIN_ROLE);
  if (!targetSuper) return false;
  const actorSuper = actorId ? await roleAssignmentService.hasRole(actorId, SUPER_ADMIN_ROLE) : false;
  if (!actorSuper) {
    res.status(403).json({ success: false, error: 'super_admin 계정은 super_admin 만 변경할 수 있습니다.', code: 'SUPER_ADMIN_ONLY' });
    return true;
  }
  return false;
}

// GET /api/v1/admin/platform-accounts — 관리자 계정 목록(민감필드 제외)
router.get('/', requireRole(ADMIN_ACCESS_ROLES), async (_req: Request, res: Response) => {
  try {
    const idSet = new Set<string>();
    for (const role of ADMIN_ACCOUNT_ROLES) {
      const ids = await roleAssignmentService.getUsersWithRole(role);
      ids.forEach((id) => idSet.add(id));
    }
    if (idSet.size === 0) {
      res.json({ success: true, data: [] });
      return;
    }
    const repo = AppDataSource.getRepository(User);
    const users = await repo.find({ where: { id: In(Array.from(idSet)) } });
    const accounts = await Promise.all(
      users.map(async (u) => ({
        id: u.id,
        email: u.email,
        name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        roles: await roleAssignmentService.getRoleNames(u.id),
        isActive: u.isActive,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt ?? null,
      })),
    );
    // super_admin 우선, 그다음 이름순
    accounts.sort((a, b) => {
      const aSa = a.roles.includes(SUPER_ADMIN_ROLE) ? 0 : 1;
      const bSa = b.roles.includes(SUPER_ADMIN_ROLE) ? 0 : 1;
      if (aSa !== bSa) return aSa - bSa;
      return (a.name || '').localeCompare(b.name || '');
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    logger.error('[platform-accounts] list failed:', error);
    res.status(500).json({ success: false, error: '관리자 계정 목록 조회 실패', code: 'LIST_FAILED' });
  }
});

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   PATCH /:id/password 는 은퇴했다. 관리자가 남의 비밀번호를 설정하는 경로 자체가 사라졌다.
//   운영자 계정은 Google 초대(operator invitation) → Google 로그인으로만 만들어진다.


// PATCH /api/v1/admin/platform-accounts/:id/status — 활성/비활성 토글
router.patch('/:id/status', requireRole(ADMIN_ACCESS_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body ?? {};
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: 'isActive(boolean) 가 필요합니다.', code: 'INVALID_INPUT' });
      return;
    }
    const actorId = req.user?.id;

    // 본인 계정 비활성 차단(서버측)
    if (isActive === false && actorId && actorId === id) {
      res.status(403).json({ success: false, error: '본인 계정은 비활성화할 수 없습니다.', code: 'SELF_LOCK' });
      return;
    }

    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, error: '계정을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      return;
    }
    if (await blockedBySuperAdminGuard(id, actorId, res)) return;

    // 마지막 활성 super_admin 비활성 차단(서버측)
    if (isActive === false) {
      const targetSuper = await roleAssignmentService.hasRole(id, SUPER_ADMIN_ROLE);
      if (targetSuper) {
        const remaining = (await activeSuperAdminIds()).filter((x) => x !== id);
        if (remaining.length === 0) {
          res.status(403).json({ success: false, error: '마지막 활성 super_admin 계정은 비활성화할 수 없습니다.', code: 'LAST_SUPER_ADMIN' });
          return;
        }
      }
    }

    user.isActive = isActive;
    await repo.save(user);
    res.json({ success: true, message: isActive ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.' });
  } catch (error) {
    logger.error('[platform-accounts] status change failed:', error);
    res.status(500).json({ success: false, error: '상태 변경 실패', code: 'STATUS_CHANGE_FAILED' });
  }
});

/**
 * POST /api/v1/admin/platform-accounts/:id/super-admin — 플랫폼 최고 관리자 권한 **부여**
 * WO-O4O-SINGLE-GOOGLE-ACCOUNT-ADMIN-OPERATOR-ENROLLMENT-V1
 *
 * 가드(프런트 차단에 의존하지 않는다):
 *   - `requireRole(['platform:super_admin'])` — 부여자는 super_admin 이어야 한다
 *   - 대상 계정 실재 · 활성(`isActive`) 확인
 *   - **대상에 Google 연결 필수** — Identity 가 `linked_accounts(provider='google')` 이므로
 *     연결이 없으면 그 계정으로 관리자 화면에 로그인할 수 없다. 의미 없는 부여를 막는다
 *   - **멱등** — 이미 활성 보유면 아무 것도 바꾸지 않고 `changed: false`
 *   - 감사 로그 — 누가 누구에게 부여했는지 남긴다
 *
 * 하지 않는 것: 회수 · 다른 역할 부여 · 계정 생성 · 비밀번호(존재하지 않는다).
 */
router.post('/:id/super-admin', requireRole(ADMIN_ACCESS_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id;

    const repo = AppDataSource.getRepository(User);
    const target = await repo.findOne({ where: { id } });
    if (!target) {
      res.status(404).json({ success: false, error: '계정을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      return;
    }
    if (!target.isActive) {
      res.status(400).json({
        success: false,
        error: '비활성 계정에는 관리자 권한을 부여할 수 없습니다.',
        code: 'TARGET_INACTIVE',
      });
      return;
    }

    // Identity = Google sub. 연결이 없으면 그 계정으로 로그인 자체가 불가능하다.
    const linkRepo = AppDataSource.getRepository(LinkedAccount);
    const googleLink = await linkRepo.findOne({ where: { userId: id, provider: 'google' } });
    if (!googleLink) {
      res.status(400).json({
        success: false,
        error: 'Google 계정이 연결되지 않은 사용자입니다. 본인이 Google 로 로그인한 뒤 부여할 수 있습니다.',
        code: 'GOOGLE_LINK_REQUIRED',
      });
      return;
    }

    // 멱등 — 이미 보유하면 변경 없음
    if (await roleAssignmentService.hasRole(id, SUPER_ADMIN_ROLE)) {
      res.json({ success: true, data: { changed: false }, message: '이미 관리자 권한을 보유하고 있습니다.' });
      return;
    }

    await roleAssignmentService.assignRole({ userId: id, role: SUPER_ADMIN_ROLE, assignedBy: actorId });

    logger.warn('[platform-accounts] SUPER_ADMIN_GRANTED', { targetUserId: id, actorId });

    res.json({ success: true, data: { changed: true }, message: '관리자 권한을 부여했습니다.' });
  } catch (error) {
    logger.error('[platform-accounts] super-admin grant failed:', error);
    res.status(500).json({ success: false, error: '관리자 권한 부여 실패', code: 'GRANT_FAILED' });
  }
});

export default router;

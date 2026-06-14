/**
 * Admin Platform Accounts — 최고 관리자 계정 안전 유지관리 (additive)
 * WO-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1
 *
 * frozen AdminUserController / users.routes (WO-O4O-CORE-FREEZE-V1) 를 수정하지 않고,
 * admin 계정의 목록 조회 · 비밀번호 재설정 · 활성 토글만 격리 제공한다.
 *
 * 재사용(중복 0): User 엔티티, hashPassword(auth.utils), roleAssignmentService(RBAC SSOT).
 * 서버측 보호(frontend 차단에 의존하지 않음):
 *   - 본인 계정 비활성 차단(SELF_LOCK)
 *   - 마지막 활성 super_admin 비활성 차단(LAST_SUPER_ADMIN)
 *   - super_admin 대상 변경은 super_admin 만 가능(SUPER_ADMIN_ONLY)
 *   - 응답에 password 등 민감 필드 미포함
 * V1 범위: 역할 편집 없음(역할 변경은 RBAC Role Assignment 화면에서 관리).
 */
import { Router, type Request, type Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { hashPassword } from '../../utils/auth.utils.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

// 접근 권한: platform admin 이상
const ADMIN_ACCESS_ROLES = ['platform:super_admin', 'platform:admin'];
// 목록에 표시할 관리자성 역할
const ADMIN_ACCOUNT_ROLES = ['platform:super_admin', 'platform:admin', 'neture:admin', 'neture:operator'];
const SUPER_ADMIN_ROLE = 'platform:super_admin';
const MIN_PASSWORD_LENGTH = 8;

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

// PATCH /api/v1/admin/platform-accounts/:id/password — 새 비밀번호 설정(기존 비번 노출/조회 없음)
router.patch('/:id/password', requireRole(ADMIN_ACCESS_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body ?? {};
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ success: false, error: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`, code: 'WEAK_PASSWORD' });
      return;
    }
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, error: '계정을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      return;
    }
    if (await blockedBySuperAdminGuard(id, req.user?.id, res)) return;

    user.password = await hashPassword(newPassword); // 기존 해싱 정책 재사용
    await repo.save(user);
    res.json({ success: true, message: '비밀번호가 재설정되었습니다.' });
  } catch (error) {
    logger.error('[platform-accounts] password reset failed:', error);
    res.status(500).json({ success: false, error: '비밀번호 재설정 실패', code: 'PASSWORD_RESET_FAILED' });
  }
});

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

export default router;

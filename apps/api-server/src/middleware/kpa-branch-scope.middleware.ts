/**
 * KPA Branch Service Scope Guard + Branch Tenant Resolver
 *
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §2 · §4
 *
 * 두 겹으로 나뉜다. 합치지 않는다.
 *
 *   1) requireKpaBranchScope — **서비스 축**.
 *      service_memberships('kpa-branch').status='active' + prefixed role 검사.
 *      기존 서비스(glycopharm / pharmacy-hub)와 동일한 구조이며, 분회 식별자는 모른다.
 *
 *   2) resolveBranch / requireBranchOperator — **분회 축**.
 *      slug 또는 Host 로 분회 tenant 를 확정하고, 운영자 mutation 에 대해
 *      "요청자의 active branch_memberships.organization_id === 해당 분회" 를 강제한다.
 *
 * 왜 분회를 role 에 넣지 않는가 (WO §4 4축 분리):
 *   role 에 'kpa-branch:operator:{branchId}' 같은 분회별 역할을 만들면 분회 소속 축이
 *   role_assignments 에 중복 저장된다. 분회는 209개이고 전입·전출이 상시 발생하므로
 *   중복 저장은 곧 drift 다. 따라서 role 은 "운영자인가"만 말하고,
 *   "어느 분회인가"는 branch_memberships 가 단독으로 말한다.
 *
 * 본회 → 지부 → 분회 계층(parent_id)은 권한 계산에 사용하지 않는다.
 * 지부 운영자가 하위 분회를 자동으로 관리하지 않는다 — 모든 분회는 동급 tenant 다.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';
import { AppDataSource } from '../database/connection.js';
import { KpaOrganization, BRANCH_ORG_TYPE } from '../routes/kpa-branch/entities/kpa-organization.entity.js';
import { BranchMembership } from '../routes/kpa-branch/entities/branch-membership.entity.js';
import { BranchDomain } from '../routes/kpa-branch/entities/branch-domain.entity.js';

// ─── 1. 서비스 축 scope guard ──────────────────────────────────────────────

/**
 * platformBypass: true — 조직 격리형(KPA-a) 서비스가 아니라 독립 서비스이므로
 *   platform:super_admin 은 접근 가능하다. 단 super_admin 도 분회 축(2번)은
 *   admin role 을 통해서만 우회한다.
 *
 * scopeRoleMapping: admin ⊃ operator ⊃ member (플랫폼 표준 계층).
 */
export const KPA_BRANCH_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'kpa-branch',
  allowedRoles: ['kpa-branch:admin', 'kpa-branch:operator', 'kpa-branch:member'],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'glycopharm', 'cosmetics', 'pharmacy-hub'],
  scopeRoleMapping: {
    'kpa-branch:admin': ['kpa-branch:admin'],
    'kpa-branch:operator': ['kpa-branch:operator', 'kpa-branch:admin'],
    'kpa-branch:member': ['kpa-branch:member', 'kpa-branch:operator', 'kpa-branch:admin'],
  },
};

/**
 * @example
 * router.get('/operator/members', requireAuth, requireKpaBranchScope('kpa-branch:operator'), ...)
 */
export const requireKpaBranchScope = createMembershipScopeGuard(KPA_BRANCH_SCOPE_CONFIG);

// ─── 2. 분회 축 resolver ───────────────────────────────────────────────────

export interface ResolvedBranch {
  id: string;
  slug: string;
  name: string;
  /** 'slug' = URL 경로, 'domain' = 분회 자체 도메인 Host 헤더 */
  source: 'slug' | 'domain';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      branch?: ResolvedBranch;
    }
  }
}

/** 서비스 전체 관리자만 분회 경계를 넘을 수 있다. */
function isBranchServiceAdmin(req: Request): boolean {
  const roles: string[] = (req as any).user?.roles || [];
  return roles.includes('kpa-branch:admin') || roles.includes('platform:super_admin');
}

/**
 * slug → 분회. type='group'(분회) 만 tenant 로 인정한다.
 * association(대한약사회) / branch(지부) 는 분회 공간을 갖지 않는다.
 */
export async function findBranchBySlug(slug: string): Promise<ResolvedBranch | null> {
  const repo = AppDataSource.getRepository(KpaOrganization);
  const org = await repo.findOne({
    where: { slug, type: BRANCH_ORG_TYPE, is_active: true },
  });
  if (!org || !org.slug) return null;
  return { id: org.id, slug: org.slug, name: org.name, source: 'slug' };
}

/** 자체 도메인 Host → 분회. status='active' 인 도메인만 해석한다. */
export async function findBranchByHostname(hostname: string): Promise<ResolvedBranch | null> {
  const normalized = hostname.toLowerCase().split(':')[0];
  const domain = await AppDataSource.getRepository(BranchDomain).findOne({
    where: { hostname: normalized, status: 'active' },
  });
  if (!domain) return null;
  const org = await AppDataSource.getRepository(KpaOrganization).findOne({
    where: { id: domain.organization_id, type: BRANCH_ORG_TYPE, is_active: true },
  });
  if (!org || !org.slug) return null;
  return { id: org.id, slug: org.slug, name: org.name, source: 'domain' };
}

/**
 * 분회 tenant 해석 단일 경로.
 * 우선순위: URL param(:branchSlug) > Host 헤더 매핑.
 * 두 경로 모두 결국 kpa_organizations.id 하나로 수렴한다 (해석 이원화 금지).
 */
export const resolveBranch: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = (req.params as Record<string, string | undefined>).branchSlug;
    let branch: ResolvedBranch | null = null;

    if (slug) {
      branch = await findBranchBySlug(slug);
    } else {
      const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
      if (host) branch = await findBranchByHostname(host);
    }

    if (!branch) {
      res.status(404).json({ success: false, error: '분회를 찾을 수 없습니다.', code: 'BRANCH_NOT_FOUND' });
      return;
    }

    req.branch = branch;
    next();
  } catch (error) {
    next(error);
  }
};

/** 요청자의 현재(active) 분회 소속. 없으면 null. */
export async function getActiveBranchMembership(userId: string): Promise<BranchMembership | null> {
  return AppDataSource.getRepository(BranchMembership).findOne({
    where: { user_id: userId, status: 'active' },
  });
}

/**
 * 분회 운영자 경계.
 * resolveBranch 이후에 사용한다.
 *
 *   kpa-branch:admin / platform:super_admin → 통과 (서비스 전체 관리)
 *   그 외 → active branch_memberships.organization_id === req.branch.id 일 때만 통과
 *
 * 검증 ② "분회 A 운영자가 분회 B 회원을 관리할 수 없다" 를 보장하는 지점이다.
 */
export const requireBranchScope: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }
    if (!req.branch) {
      res.status(500).json({ success: false, error: 'resolveBranch must run before requireBranchScope', code: 'BRANCH_NOT_RESOLVED' });
      return;
    }
    if (isBranchServiceAdmin(req)) {
      next();
      return;
    }

    const membership = await getActiveBranchMembership(user.id);
    if (!membership || membership.organization_id !== req.branch.id) {
      res.status(403).json({
        success: false,
        error: '해당 분회에 대한 권한이 없습니다.',
        code: 'BRANCH_SCOPE_MISMATCH',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

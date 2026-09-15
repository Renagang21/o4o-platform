/**
 * Neture 대표 홈 진입 정보 API
 *
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1
 *
 * `GET /api/v1/neture/home/entry` — 로그인 사용자가 O4O 대표 홈(neture.co.kr)에서
 * "내 매장" · "내 분회" 진입 버튼을 만들기 위해 필요한 **읽기 전용** 정보를 한 번에 돌려준다.
 *
 * 왜 별도 API 인가:
 *   - 매장 목록: `/work-scope/store-resolution` 은 서비스 1개 × 조직 1개 확정 용도라
 *     복수 매장을 **자동 선택하지 않고 그대로 나열**해야 하는 대표 홈에는 맞지 않는다.
 *   - 분회: `GET /kpa-branch/me/branch` 는 slug · 분회명을 돌려주지 않아 링크를 만들 수 없다.
 *   둘 다 기존 해석기 · 기존 테이블만 읽는다. 새 테이블 · 새 권한 축 · 자동 선택 없음.
 *
 * 인증: `requireAuth` 만. Neture scope guard 를 걸지 않는다 — 다른 서비스 회원이 Neture
 * membership 없이 대표 홈에 로그인하는 경우(`REPRESENTATIVE_ENTRY_SERVICE_KEY`)를 포함해야
 * 하기 때문이다. 응답은 **요청자 본인의** membership · role · organization_members 에서만 파생한다.
 * 실제 화면 접근 권한은 각 서비스의 기존 서버 guard 가 최종 판정한다.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { getServiceMembershipStatusFromDb } from '../../../utils/service-membership.js';
import {
  findStoreOrganizationCandidates,
  type StoreOwnerServiceKey,
} from '../../../utils/store-organization.resolver.js';
// WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1:
// 공급자 · 파트너 서비스 이용 상태(단일 출처) — 대표 홈 · 서비스 레이아웃이 role 문자열 대신 이 값을 쓴다.
import { resolveNetureServiceStates } from '../../../modules/neture/services/neture-service-state.service.js';

/**
 * 대표 홈에서 "내 매장" 을 노출하는 서비스 — canonical service_key ↔ role prefix.
 * `utils/store-owner.utils.ts` 의 STORE_OWNER_ROLES_BY_SERVICE 와 같은 집합이다
 * (cafe24-b2b 는 O4O 로그인 회원이 아니므로 제외 — Cafe24 회원 로그인 전용).
 */
const STORE_CAPABLE_SERVICES: ReadonlyArray<{
  serviceKey: string;
  rolePrefix: StoreOwnerServiceKey;
  storeOwnerRole: string;
}> = [
  { serviceKey: 'kpa-society', rolePrefix: 'kpa', storeOwnerRole: 'kpa:store_owner' },
  { serviceKey: 'k-cosmetics', rolePrefix: 'cosmetics', storeOwnerRole: 'cosmetics:store_owner' },
  { serviceKey: 'pharmacy-hub', rolePrefix: 'pharmacy-hub', storeOwnerRole: 'pharmacy-hub:store_owner' },
];

export interface HomeEntryStore {
  /** canonical service_key (kpa-society · k-cosmetics · pharmacy-hub) */
  serviceKey: string;
  organizationId: string;
  /** organizations.name (없으면 null — 화면은 "이름 없는 매장" 으로 표시) */
  name: string | null;
  /** organization_members.role (owner · admin · manager) */
  memberRole: string;
}

export interface HomeEntryBranch {
  organizationId: string;
  /** kpa_organizations.slug — 공개 URL `/kpa/{slug}` 의 근거. null 이면 링크를 만들 수 없다 */
  slug: string | null;
  name: string;
}

export function createNetureHomeEntryController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/entry',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }
      const userId = user.id;

      // ── 내 매장 ─────────────────────────────────────────────────────────
      // 서비스별: active membership + {prefix}:store_owner role + 기존 후보 해석기.
      // 복수 매장은 전부 나열한다 (자동 선택 없음 — WO §3 "주요 업무").
      const stores: HomeEntryStore[] = [];
      for (const svc of STORE_CAPABLE_SERVICES) {
        const membershipStatus = await getServiceMembershipStatusFromDb(dataSource, userId, svc.serviceKey);
        if (membershipStatus !== 'active') continue;

        const [ra] = await dataSource.query(
          `SELECT 1 FROM role_assignments
            WHERE user_id = $1 AND role = $2 AND is_active = true
            LIMIT 1`,
          [userId, svc.storeOwnerRole],
        );
        if (!ra) continue;

        const candidates = await findStoreOrganizationCandidates(dataSource, userId, svc.rolePrefix);
        if (candidates.length === 0) continue;

        const orgRows: Array<{ id: string; name: string | null }> = await dataSource.query(
          `SELECT id, name FROM organizations WHERE id = ANY($1::uuid[])`,
          [candidates.map((c) => c.organizationId)],
        );
        const nameById = new Map(orgRows.map((o) => [o.id, o.name]));

        for (const c of candidates) {
          stores.push({
            serviceKey: svc.serviceKey,
            organizationId: c.organizationId,
            name: nameById.get(c.organizationId) ?? null,
            memberRole: c.memberRole,
          });
        }
      }

      // ── 내 분회 ─────────────────────────────────────────────────────────
      // branch_memberships(active) → kpa_organizations(slug · name). 기존 계약:
      //   BranchMembershipService.getCurrent 와 동일한 "status = 'active'" 기준.
      const branchRows: Array<{ organization_id: string; slug: string | null; name: string }> =
        await dataSource.query(
          `SELECT bm.organization_id AS organization_id, ko.slug AS slug, ko.name AS name
             FROM branch_memberships bm
             JOIN kpa_organizations ko ON ko.id = bm.organization_id
            WHERE bm.user_id = $1 AND bm.status = 'active'
            ORDER BY bm.joined_at DESC NULLS LAST, ko.name ASC`,
          [userId],
        );
      const branches: HomeEntryBranch[] = branchRows.map((r) => ({
        organizationId: r.organization_id,
        slug: r.slug,
        name: r.name,
      }));

      // ── 공급자 · 파트너 서비스 상태 ─────────────────────────────────────
      // WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1:
      // neture_suppliers · neture.neture_partners (없으면 service_memberships(neture).role 기반 legacy fallback).
      // 요청자 본인 것만. 실제 API 접근은 neture-identity guard 가 같은 테이블로 다시 판정한다.
      const serviceStates = await resolveNetureServiceStates(dataSource, userId);

      return res.json({ success: true, data: { stores, branches, serviceStates } });
    }),
  );

  return router;
}

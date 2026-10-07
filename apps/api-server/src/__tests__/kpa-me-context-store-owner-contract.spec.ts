/**
 * WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 §12 (축 C)
 *
 * `GET /api/v1/kpa/me-context` 의 `isStoreOwner` 가 백엔드 매장 게이트
 * (createRequireStoreOwner → isStoreOwner → resolveStoreOrganization)와 **같은 판정**인지.
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §5) 이후 진리표:
 *   약국 매장(`kpa`) 게이트 = **Neture 기본 가입 원장 active ∧ 그 조직의 owner/admin/manager**.
 *   kpa-society membership · `kpa:store_owner` role 은 판정 근거가 아니다(대체, 누적 아님).
 *   1) 원장 active 조직 1개                                  → true
 *   2) 원장 active + kpa-society membership 정지            → true (membership 무관)
 *   3) 원장 active + role 없음                              → true (role 무관)
 *   4) membership · role 있으나 원장 active 조직 0          → false
 *   5) 원장 active 조직 2개                                  → false (ambiguous)
 */

import express from 'express';
import request from 'supertest';

import { createMeContextController } from '../routes/kpa/controllers/me-context.controller.js';

interface Scenario {
  membershipActive: boolean;
  hasRole: boolean;
  /** neture_pharmacy_memberships.status='active' 인 (사용자 owner) 조직 */
  ledgerOrgs: string[];
}

function makeDataSource(sc: Scenario) {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM users')) {
        return [{
          activity_type: 'pharmacy',
          member_status: sc.membershipActive ? 'active' : 'suspended',
          member_role: 'owner',
          membership_type: 'regular',
          organization_id: sc.ledgerOrgs[0] ?? null,
          org_name: '테스트약국',
          org_type: 'pharmacy',
          org_member_role: 'owner',
        }];
      }
      if (sql.includes('neture_pharmacy_memberships')) {
        return sc.ledgerOrgs.map((id) => ({ organization_id: id, role: 'owner' }));
      }
      if (sql.includes('service_memberships')) return sc.membershipActive ? [{ ok: 1 }] : [];
      if (sql.includes('role_assignments')) return sc.hasRole ? [{ ok: 1 }] : [];
      // 옛 판정 경로(enrollment/slug · 서비스 중립) — kpa 에서 호출되면 원장 밖 조직이 새는 것이므로 빈 응답.
      return [];
    }),
  } as any;
}

async function callMeContext(sc: Scenario) {
  const app = express();
  const requireAuth = (req: any, _res: any, next: any) => { req.user = { id: 'user-1' }; next(); };
  app.use('/me-context', createMeContextController(makeDataSource(sc), requireAuth));
  return request(app).get('/me-context');
}

describe('축 C — /kpa/me-context isStoreOwner 진리표 (Neture 기본 가입 원장 기준)', () => {
  it('1) 원장 active 조직 1개 → isStoreOwner=true', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: true, ledgerOrgs: ['org-kpa'] });
    expect(res.status).toBe(200);
    expect(res.body.data.isStoreOwner).toBe(true);
    expect(res.body.data.storeOrganizationId).toBe('org-kpa');
    expect(res.body.data.pharmacistRole).toBe('pharmacy_owner');
  });

  it('2) kpa-society membership 정지여도 원장 active 면 isStoreOwner=true (membership 은 매장 게이트가 아니다)', async () => {
    const res = await callMeContext({ membershipActive: false, hasRole: true, ledgerOrgs: ['org-kpa'] });
    expect(res.body.data.isStoreOwner).toBe(true);
    expect(res.body.data.storeOrganizationId).toBe('org-kpa');
  });

  it('3) kpa:store_owner role 없어도 원장 active 면 isStoreOwner=true', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: false, ledgerOrgs: ['org-kpa'] });
    expect(res.body.data.isStoreOwner).toBe(true);
  });

  it('4) membership · role 이 있어도 원장 active 조직 0 → isStoreOwner=false (백엔드 403 과 일치)', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: true, ledgerOrgs: [] });
    expect(res.body.data.isStoreOwner).toBe(false);
    expect(res.body.data.storeOrganizationId).toBeNull();
    expect(res.body.data.storeOrganizationResolution).toBe('none');
  });

  it('5) 원장 active 후보 조직 2개(ambiguous) → isStoreOwner=false + resolution 노출', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: true, ledgerOrgs: ['org-a', 'org-b'] });
    expect(res.body.data.isStoreOwner).toBe(false);
    expect(res.body.data.storeOrganizationResolution).toBe('ambiguous');
  });
});

/**
 * WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 §12 (축 C)
 *
 * `GET /api/v1/kpa/me-context` 의 `isStoreOwner` 가 백엔드 매장 게이트
 * (createRequireStoreOwner → isStoreOwner → resolveStoreOrganization)와 **같은 판정**인지.
 *
 * 진리표 4상태:
 *   1) active membership + store_owner role + 조직 해석 성공 → true
 *   2) suspended membership + role                          → false
 *   3) active membership + role 없음                        → false
 *   4) active membership + role 있으나 KPA 조직 없음        → false (종전 true → 불일치였다)
 */

import express from 'express';
import request from 'supertest';

import { createMeContextController } from '../routes/kpa/controllers/me-context.controller.js';

interface Scenario {
  membershipActive: boolean;
  hasRole: boolean;
  orgs: string[];
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
          organization_id: sc.orgs[0] ?? null,
          org_name: '테스트약국',
          org_type: 'pharmacy',
          org_member_role: 'owner',
        }];
      }
      if (sql.includes('service_memberships')) return sc.membershipActive ? [{ ok: 1 }] : [];
      if (sql.includes('role_assignments')) return sc.hasRole ? [{ ok: 1 }] : [];
      if (sql.includes('organization_service_enrollments')) {
        return sc.orgs.map((id) => ({ organization_id: id, role: 'owner' }));
      }
      if (sql.includes('organization_members')) {
        return sc.orgs.map((id, i) => ({
          organization_id: id, role: 'owner', is_primary: i === 0, joined_at: '2025-01-01',
        }));
      }
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

describe('축 C — /kpa/me-context isStoreOwner 진리표', () => {
  it('1) active membership + role + 조직 1개 → isStoreOwner=true', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: true, orgs: ['org-kpa'] });
    expect(res.status).toBe(200);
    expect(res.body.data.isStoreOwner).toBe(true);
    expect(res.body.data.storeOrganizationId).toBe('org-kpa');
    expect(res.body.data.pharmacistRole).toBe('pharmacy_owner');
  });

  it('2) membership 정지 → isStoreOwner=false', async () => {
    const res = await callMeContext({ membershipActive: false, hasRole: true, orgs: ['org-kpa'] });
    expect(res.body.data.isStoreOwner).toBe(false);
  });

  it('3) role 없음 → isStoreOwner=false', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: false, orgs: ['org-kpa'] });
    expect(res.body.data.isStoreOwner).toBe(false);
  });

  it('4) role 은 있으나 KPA 연결 조직 0 → isStoreOwner=false (백엔드 403 과 일치)', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: true, orgs: [] });
    expect(res.body.data.isStoreOwner).toBe(false);
    // 진단 필드: role 자체는 부여돼 있음을 구분해서 알린다(무증상 실패 방지).
    expect(res.body.data.storeOwnerRoleGranted).toBe(true);
    expect(res.body.data.storeOrganizationId).toBeNull();
  });

  it('5) 후보 조직 2개(ambiguous) → isStoreOwner=false + resolution 노출', async () => {
    const res = await callMeContext({ membershipActive: true, hasRole: true, orgs: ['org-a', 'org-b'] });
    expect(res.body.data.isStoreOwner).toBe(false);
    expect(res.body.data.storeOrganizationResolution).toBe('ambiguous');
  });
});

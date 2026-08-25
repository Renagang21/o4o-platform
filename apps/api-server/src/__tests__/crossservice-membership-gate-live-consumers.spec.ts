/**
 * WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
 *
 * live consumer 두 곳을 회귀로 고정한다.
 *   1) signage 권한 계열 — role 만 보던 6개 게이트가 active membership 을 요구한다 (§10-1)
 *   2) membership scope guard — 판정 정본이 JWT 스냅샷이 아니라 DB 다 (§10-2, 정지 즉시성)
 */

const memberships: { user_id: string; service_key: string; status: string }[] = [];

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    get isInitialized() { return true; },
    query: jest.fn(async (_sql: string, params: any[] = []) => {
      const [userId, serviceKey] = params;
      return memberships
        .filter((m) => m.user_id === userId && m.service_key === serviceKey)
        .map((m) => ({ status: m.status }));
    }),
  },
}));

import { requireSignageOperator, requireSignageStore } from '../middleware/signage-role.middleware.js';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

function makeRes() {
  const res: any = {};
  res.statusCode = 0;
  res.body = null;
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn((b: any) => { res.body = b; return res; });
  return res;
}

beforeEach(() => { memberships.length = 0; });

describe('signage 게이트 — role 만으로는 통과하지 않는다', () => {
  it('operator role + active membership → 통과', async () => {
    memberships.push({ user_id: 'u1', service_key: 'kpa-society', status: 'active' });
    const req: any = { user: { id: 'u1', roles: ['kpa:operator'] }, params: { serviceKey: 'kpa' } };
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperator(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.signageContext.serviceKey).toBe('kpa-society');
  });

  it('operator role 은 살아 있지만 membership 이 suspended → 403 MEMBERSHIP_NOT_ACTIVE', async () => {
    memberships.push({ user_id: 'u1', service_key: 'kpa-society', status: 'suspended' });
    const req: any = { user: { id: 'u1', roles: ['kpa:operator'] }, params: { serviceKey: 'kpa' } };
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperator(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('membership row 자체가 없으면 통과하지 않는다', async () => {
    const req: any = { user: { id: 'u1', roles: ['kpa:operator'] }, params: { serviceKey: 'kpa' } };
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperator(req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it('platform:super_admin 은 기존 계약대로 우회한다', async () => {
    const req: any = {
      user: { id: 'admin', roles: ['platform:super_admin'] },
      params: { serviceKey: 'kpa' },
    };
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperator(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('membership 축이 없는 legacy signage key(pharmacy) 는 추정 차단하지 않는다', async () => {
    const req: any = { user: { id: 'u1', roles: ['pharmacy:operator'] }, params: { serviceKey: 'pharmacy' } };
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperator(req, res, next);
    // membership 때문에 막히지는 않는다 (통과하든 role 로 막히든 MEMBERSHIP_NOT_ACTIVE 는 아니다)
    expect(res.body?.code).not.toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('store 게이트도 organization 검사보다 membership 을 먼저 본다', async () => {
    memberships.push({ user_id: 'u1', service_key: 'kpa-society', status: 'withdrawn' });
    const req: any = {
      user: { id: 'u1', roles: ['kpa:store_owner'] },
      params: { serviceKey: 'kpa' },
      headers: {}, query: {}, body: {},
    };
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });
});

describe('membership scope guard — 정본은 DB 다 (정지 즉시성)', () => {
  const guard = createMembershipScopeGuard({
    serviceKey: 'kpa',
    platformBypass: false,
    allowedRoles: [],
  } as any)('read');

  it('JWT 는 active 라고 하지만 DB 가 suspended → 403 (토큰 만료를 기다리지 않는다)', async () => {
    memberships.push({ user_id: 'u1', service_key: 'kpa-society', status: 'suspended' });
    const req: any = {
      user: { id: 'u1', roles: ['kpa:operator'], memberships: [{ serviceKey: 'kpa-society', status: 'active' }] },
    };
    const res = makeRes();
    const next = jest.fn();
    await guard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('JWT 에 membership 이 없으면 DB 를 보지 않고 즉시 거부한다 (질의 증가 없음)', async () => {
    const { AppDataSource } = require('../database/connection.js');
    (AppDataSource.query as jest.Mock).mockClear();
    const req: any = { user: { id: 'u1', roles: [], memberships: [] } };
    const res = makeRes();
    await guard(req, res, jest.fn());
    expect(res.body.code).toBe('MEMBERSHIP_NOT_FOUND');
    expect(AppDataSource.query).not.toHaveBeenCalled();
  });

  it('인증 없음은 401 로 남는다 (API 실패 의미 불변)', async () => {
    const req: any = {};
    const res = makeRes();
    await guard(req, res, jest.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });
});

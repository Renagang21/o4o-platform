/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4 — 비밀번호 세션의 관리자 경계 (요청 지점)
 *
 *  B1 판정 함수: admin 화면 · platform:* 역할이면 false
 *  B2 requireAuth: 비밀번호 세션 + platform 역할(DB 에서 다시 읽음) → 403 PASSWORD_SESSION_NOT_ALLOWED
 *  B3 requireAuth: 역할 조회 실패는 fail-closed(403)
 *  B4 requireAuth: Google 세션도 최신 DB 역할을 사용한다
 *  B5 optionalAuth: 걸리는 비밀번호 세션은 비로그인과 같게(req.user 없음) 통과
 */
const getRoleNames = jest.fn();
const findOne = jest.fn();
const verifyAccessToken = jest.fn();

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { getRepository: () => ({ findOne }) },
}));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames },
}));
jest.mock('../../../modules/policy-acceptance/policy-acceptance.service.js', () => ({
  policyAcceptanceService: { getEnforcedPendingForUser: jest.fn(async () => []) },
}));
jest.mock('../../../utils/token.utils.js', () => ({
  verifyAccessToken: (t: string) => verifyAccessToken(t),
  isServiceToken: () => false,
}));
jest.mock('../../middleware/auth/auth-context.helpers.js', () => ({
  extractToken: () => 'tok',
}));

import { requireAuth, optionalAuth, requirePlatformUser } from '../../middleware/auth/authentication.middleware.js';
import { createServiceScopeGuard } from '@o4o/security-core';
import { injectOperatorServiceScope } from '../../../utils/serviceScope.js';
import { isPasswordSessionAllowed } from '../password-session.policy.js';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const USER = { id: 'u1', isActive: true, status: 'active' };

describe('비밀번호 세션 관리자 경계', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockResolvedValue({ ...USER });
  });

  it('B1 판정 함수', () => {
    expect(isPasswordSessionAllowed('neture', [])).toBe(true);
    expect(isPasswordSessionAllowed('neture', ['neture:store_owner'])).toBe(true);
    expect(isPasswordSessionAllowed('admin', [])).toBe(false);
    expect(isPasswordSessionAllowed('neture', ['platform:super_admin'])).toBe(false);
    expect(isPasswordSessionAllowed(null, ['platform:operator'])).toBe(false);
  });

  it('B2 비밀번호 세션 + platform 역할 → 403', async () => {
    verifyAccessToken.mockReturnValue({ userId: 'u1', tokenType: 'user', authMethod: 'password', serviceKey: 'neture' });
    getRoleNames.mockResolvedValue(['platform:super_admin']);
    const res = mockRes();
    const next = jest.fn();
    await requireAuth({ method: 'GET', originalUrl: '/x', headers: {} } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'PASSWORD_SESSION_NOT_ALLOWED' });
  });

  it('B2b 비밀번호 세션 + 일반 역할 → 통과', async () => {
    verifyAccessToken.mockReturnValue({ userId: 'u1', tokenType: 'user', authMethod: 'password', serviceKey: 'neture' });
    getRoleNames.mockResolvedValue([]);
    const next = jest.fn();
    const req: any = { method: 'GET', originalUrl: '/x', headers: {} };
    await requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('u1');
  });

  it('B3 역할 조회 실패 → fail-closed 403', async () => {
    verifyAccessToken.mockReturnValue({ userId: 'u1', tokenType: 'user', authMethod: 'password', serviceKey: 'neture' });
    getRoleNames.mockRejectedValue(new Error('db down'));
    const res = mockRes();
    const next = jest.fn();
    await requireAuth({ method: 'GET', originalUrl: '/x', headers: {} } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('B4 Google 세션도 DB 역할을 다시 읽는다', async () => {
    verifyAccessToken.mockReturnValue({ userId: 'u1', tokenType: 'user', serviceKey: 'admin', roles: ['platform:super_admin'] });
    getRoleNames.mockResolvedValue([]);
    const next = jest.fn();
    await requireAuth({ method: 'GET', originalUrl: '/x', headers: {} } as any, mockRes(), next);
    expect(getRoleNames).toHaveBeenCalledWith('u1');
    expect(next).toHaveBeenCalled();
  });

  it('B5 optionalAuth — 걸리는 비밀번호 세션은 비로그인 취급', async () => {
    verifyAccessToken.mockReturnValue({ userId: 'u1', tokenType: 'user', authMethod: 'password', serviceKey: 'admin' });
    getRoleNames.mockResolvedValue([]);
    const req: any = { method: 'GET', originalUrl: '/x', headers: {} };
    const next = jest.fn();
    await optionalAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});


describe('existing session role freshness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockResolvedValue({ ...USER });
    verifyAccessToken.mockReturnValue({ userId: 'u1', tokenType: 'user', roles: ['neture:admin', 'pharmacy-hub:operator'], memberships: [{ serviceKey: 'neture', status: 'active' }] });
  });
  it.each([requireAuth, requirePlatformUser, optionalAuth])('loads downgraded/revoked roles instead of token privileges', async (authenticate) => {
    getRoleNames.mockResolvedValue(['neture:operator']);
    const req: any = { method: 'GET', originalUrl: '/x', headers: {} };
    const next = jest.fn(); await authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalled(); expect(req.user.roles).toEqual(['neture:operator']);
    getRoleNames.mockResolvedValue([]);
    const second: any = { method: 'GET', originalUrl: '/x', headers: {} };
    await authenticate(second, mockRes(), jest.fn());
    expect(second.user.roles).toEqual([]);
  });
  it.each([requireAuth, requirePlatformUser])('does not use stale roles when DB lookup fails', async (authenticate) => {
    getRoleNames.mockRejectedValue(new Error('db unavailable'));
    const req: any = { method: 'GET', originalUrl: '/x', headers: {} }; const next = jest.fn(); const out = mockRes();
    await authenticate(req, out, next);
    expect(next).not.toHaveBeenCalled(); expect(req.user).toBeUndefined(); expect(out.status).toHaveBeenCalledWith(401);
  });
  it('optional auth does not expose a stale authenticated user on failure', async () => {
    getRoleNames.mockRejectedValue(new Error('db unavailable'));
    const req: any = { method: 'GET', originalUrl: '/x', headers: {} }; const next = jest.fn();
    await optionalAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled(); expect(req.user).toBeUndefined();
  });
});


it('revoked service and downgraded admin cannot pass server guards with the same token', async () => {
  findOne.mockResolvedValue({ ...USER });
  verifyAccessToken.mockReturnValue({ userId: 'u1', roles: ['neture:admin', 'platform:super_admin'] });
  getRoleNames.mockResolvedValue(['neture:operator']);
  const req: any = { method: 'GET', originalUrl: '/x', headers: {} };
  await requireAuth(req, mockRes(), jest.fn());
  const guard = createServiceScopeGuard({ serviceKey: 'neture', allowedRoles: ['neture:admin', 'neture:operator'], platformBypass: true, legacyRoles: [], blockedServicePrefixes: [], scopeRoleMapping: { 'neture:admin': ['neture:admin'] } });
  const next = jest.fn(); const out = mockRes();
  guard('neture:admin')(req, out, next);
  expect(next).not.toHaveBeenCalled(); expect(out.status).toHaveBeenCalledWith(403);
  getRoleNames.mockResolvedValue([]);
  await requireAuth(req, mockRes(), jest.fn());
  guard('neture:admin')(req, mockRes(), next);
  expect(next).not.toHaveBeenCalled();
});

it('membership console scope only includes services with an actual operator assignment', () => {
  const req: any = { user: { roles: ['neture:operator', 'pharmacy-hub:store_owner'], memberships: [{serviceKey:'lecture',status:'active'}] } };
  injectOperatorServiceScope(req, mockRes(), jest.fn());
  expect(req.serviceScope.serviceKeys).toEqual(['neture']);
});

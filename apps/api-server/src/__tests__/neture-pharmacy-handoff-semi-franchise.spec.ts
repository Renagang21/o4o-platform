/**
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 — store → pharmacy(kpa-society) handoff 의 세미프랜차이즈 자격
 *
 * 직접 로그인 게이트와 같은 기준을 handoff 발급 · 교환 양쪽에 적용한다.
 *   H1 kpa-society active membership 이 있으면 기존 경로 그대로 — 세미프랜차이즈 조회 0
 *   H2 membership 이 없어도 Neture 기본 active ∧ pharmacy active 이면 발급 · 교환 통과 — membership·role write 0
 *   H3 미충족이면 403 + serviceAccess(next) — 미가입은 HANDOFF_TARGET_NO_MEMBERSHIP + 세미프랜차이즈 안내 문구,
 *      기존 row 가 있으면 기존 코드(NOT_ACTIVE · WITHDRAWN) 유지
 *   H4 semiFranchiseAccessKey 가 없는 서비스(pharmacy-hub 등)는 세미프랜차이즈를 조회하지 않는다
 *
 * DB 접속 없음 — 세미프랜차이즈 SQL 은 `sfQuery` 로 따로 받아 기존 응답 큐를 밀지 않는다.
 */

const query = jest.fn().mockResolvedValue([]);
const sfQuery = jest.fn().mockResolvedValue([]);
const findOne = jest.fn();
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    query: (...args: unknown[]) =>
      /neture_pharmacy_memberships/i.test(String(args[0] ?? '')) ? sfQuery(...args) : query(...args),
    getRepository: () => ({ findOne: (...args: unknown[]) => findOne(...args) }),
    manager: {
      query: (...args: unknown[]) => {
        const sql = String(args[0] ?? '');
        if (/service_session_revocations/i.test(sql)) return Promise.resolve([]);
        return query(...args);
      },
    },
  },
}));
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: jest.fn(async () => []) },
}));
const generateTokens = jest.fn(() => ({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 900 }));
jest.mock('../utils/token.utils.js', () => ({
  generateTokens: (...a: unknown[]) => generateTokens(...a),
  verifyAccessToken: () => null,
}));
jest.mock('../services/auth/auth-context.helper.js', () => ({ persistRefreshTokenFamily: jest.fn(async () => undefined) }));
jest.mock('../utils/cookie.utils.js', () => ({ setAuthCookies: jest.fn() }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../utils/service-tenant.resolver.js', () => ({ resolveAccessibleStores: jest.fn() }));

import { mockHandoffReq, mockHandoffRes } from './support/handoff-http.js';
import { HandoffController } from '../modules/auth/controllers/handoff.controller.js';
import { SEMI_FRANCHISE_ACCESS_MESSAGES } from '../modules/neture-pharmacy/services/semi-franchise-service-access.js';

const uuid = '11111111-2222-4333-8444-555555555555';
const USER = { id: 'user-1', email: 'u@example.test', name: 'U', isActive: true, status: 'active', refreshTokenFamily: 'fam-1' };
const req = (body: Record<string, unknown>, origin: string, user: unknown = USER) => mockHandoffReq(body, origin, { user });
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const sqlCalls = () => query.mock.calls.map((c) => norm(String(c[0])));

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([]);
  sfQuery.mockReset();
  sfQuery.mockResolvedValue([]);
  findOne.mockReset();
  generateTokens.mockClear();
});

describe('generateHandoff — target kpa-society (pharmacy.neture.co.kr)', () => {
  const generate = async () => {
    const res = mockHandoffRes();
    await HandoffController.generateHandoff(req({ targetServiceKey: 'kpa-society' }, 'https://store.neture.co.kr'), res);
    return res;
  };

  it('H1 active kpa-society membership → 기존 경로 그대로 발급 · 세미프랜차이즈 조회 0', async () => {
    query.mockResolvedValueOnce([{ status: 'active' }]).mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    const res = await generate();
    expect(res.statusCode).toBe(200);
    expect(sfQuery).not.toHaveBeenCalled();
  });

  it('H2 membership 없음 + 기본 active ∧ pharmacy active → 발급 · membership·role write 0', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    sfQuery.mockResolvedValueOnce([{ basic: 'active', semi: 'active' }]);
    const res = await generate();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetUrl).toBe(`https://pharmacy.neture.co.kr/handoff?token=${uuid}`);
    expect(sfQuery.mock.calls[0][1]).toEqual(['user-1', 'pharmacy', expect.any(Array)]);
    expect(sqlCalls().join(' ')).not.toMatch(/INSERT INTO service_memberships|role_assignments/);
  });

  it('H2 pending kpa-society row 가 있어도 세미프랜차이즈 자격이 있으면 발급', async () => {
    query.mockResolvedValueOnce([{ status: 'pending' }]).mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    sfQuery.mockResolvedValueOnce([{ basic: 'active', semi: 'active' }]);
    const res = await generate();
    expect(res.statusCode).toBe(200);
  });

  it.each([
    [[], 'apply_pharmacy'],
    [[{ basic: 'pending', semi: null }], 'pharmacy_pending'],
    [[{ basic: 'active', semi: null }], 'apply_semi_franchise'],
    [[{ basic: 'active', semi: 'pending' }], 'semi_franchise_pending'],
    [[{ basic: 'active', semi: 'suspended' }], 'semi_franchise_suspended'],
  ] as const)('H3 membership 없음 + 세미프랜차이즈 %j → 403 HANDOFF_TARGET_NO_MEMBERSHIP · next=%s · 토큰 INSERT 0', async (rows, next) => {
    query.mockResolvedValueOnce([]);
    sfQuery.mockResolvedValueOnce([...rows]);
    const res = await generate();
    expect([res.statusCode, res.body.code]).toEqual([403, 'HANDOFF_TARGET_NO_MEMBERSHIP']);
    expect(res.body.error).toBe(SEMI_FRANCHISE_ACCESS_MESSAGES[next]);
    expect(res.body.serviceAccess).toMatchObject({ semiFranchiseKey: 'pharmacy', next });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['pending', 'HANDOFF_TARGET_NOT_ACTIVE'],
    ['withdrawn', 'HANDOFF_TARGET_WITHDRAWN'],
  ])('H3 기존 row(status=%s) + 자격 미충족 → 기존 코드 %s 유지', async (status, code) => {
    query.mockResolvedValueOnce([{ status }]);
    sfQuery.mockResolvedValueOnce([{ basic: 'active', semi: 'pending' }]);
    const res = await generate();
    expect([res.statusCode, res.body.code]).toEqual([403, code]);
  });

  it('H4 pharmacy-hub target 은 세미프랜차이즈를 조회하지 않는다', async () => {
    query.mockResolvedValueOnce([]);
    const res = mockHandoffRes();
    await HandoffController.generateHandoff(req({ targetServiceKey: 'pharmacy-hub' }, 'https://neture.co.kr'), res);
    expect([res.statusCode, res.body.code]).toEqual([403, 'HANDOFF_TARGET_NO_MEMBERSHIP']);
    expect(res.body.serviceAccess).toBeUndefined();
    expect(sfQuery).not.toHaveBeenCalled();
  });
});

describe('exchangeHandoff — target kpa-society', () => {
  const consumed = () =>
    query.mockResolvedValueOnce([[{ user_id: 'user-1', source_service_key: 'neture', target_service_key: 'kpa-society', target_workspace: null, created_at: new Date(0), source_auth_method: 'google' }], 1]);
  const exchange = async () => {
    const res = mockHandoffRes();
    await HandoffController.exchangeHandoff(req({ token: uuid }, 'https://pharmacy.neture.co.kr', undefined), res);
    return res;
  };

  it('H2 membership 없음 + 자격 충족 → 대상 서비스 세션 발급 · memberships 원본 그대로(가공 0)', async () => {
    consumed();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce([{ serviceKey: 'neture', status: 'active' }]);
    sfQuery.mockResolvedValueOnce([{ basic: 'active', semi: 'active' }]);
    const res = await exchange();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetServiceKey).toBe('kpa-society');
    expect(res.body.data.user.memberships).toEqual([{ serviceKey: 'neture', status: 'active' }]);
    expect(sqlCalls().join(' ')).not.toMatch(/INSERT|DELETE|UPDATE service_memberships|role_assignments/);
  });

  it('H3 발급 뒤 세미프랜차이즈가 정지됐으면 교환 거절 + serviceAccess', async () => {
    consumed();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce([{ serviceKey: 'neture', status: 'active' }]);
    sfQuery.mockResolvedValueOnce([{ basic: 'active', semi: 'suspended' }]);
    const res = await exchange();
    expect([res.statusCode, res.body.code]).toEqual([403, 'HANDOFF_TARGET_NO_MEMBERSHIP']);
    expect(res.body.serviceAccess).toMatchObject({ next: 'semi_franchise_suspended' });
    expect(generateTokens).not.toHaveBeenCalled();
  });

  it('H1 active kpa-society membership → 세미프랜차이즈 조회 없이 교환', async () => {
    consumed();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce([{ serviceKey: 'kpa-society', status: 'active' }]);
    const res = await exchange();
    expect(res.statusCode).toBe(200);
    expect(sfQuery).not.toHaveBeenCalled();
  });
});

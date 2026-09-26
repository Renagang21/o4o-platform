/**
 * WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1 — 대표 진입 복귀 handoff 계약 테스트
 *
 * 검증 축 (WO §10-1):
 *   A. 대표 진입 판정 helper — target 판정 · exchange origin 고정(neture.co.kr / www 정확 일치)
 *   B. generateHandoff — 비로그인 401 · 알 수 없는 target 400 · neture 는 membership 조회 없이 발급(returnTo '/' 고정) ·
 *      일반 서비스 target 은 기존 active membership 계약 그대로 · 폐기된 세션 401
 *   C. exchangeHandoff — neture 토큰은 대표 진입 origin 에서만 · 계정 상태 재확인 · membership/role write 0 ·
 *      family 승계 · 폐기된 세션 401 · 재사용 토큰 401 · 일반 서비스 회귀 0
 *
 * DB 접속 없음 — AppDataSource / 토큰 유틸은 double. 토큰 소비는 handoff-token.service 의 실제 SQL 경로를 탄다.
 */

const query = jest.fn();
const findOne = jest.fn();
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    query: (...args: unknown[]) => query(...args),
    getRepository: () => ({ findOne: (...args: unknown[]) => findOne(...args) }),
  },
}));
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
const getRoleNames = jest.fn(async () => ['kpa:store_owner']);
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: (...a: unknown[]) => getRoleNames(...a) },
}));
const generateTokens = jest.fn(() => ({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 900 }));
jest.mock('../utils/token.utils.js', () => ({ generateTokens: (...a: unknown[]) => generateTokens(...a) }));
const persistRefreshTokenFamily = jest.fn(async () => undefined);
jest.mock('../services/auth/auth-context.helper.js', () => ({
  persistRefreshTokenFamily: (...a: unknown[]) => persistRefreshTokenFamily(...a),
}));
const setAuthCookies = jest.fn();
jest.mock('../utils/cookie.utils.js', () => ({ setAuthCookies: (...a: unknown[]) => setAuthCookies(...a) }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../utils/service-tenant.resolver.js', () => ({ resolveAccessibleStores: jest.fn() }));

import { HandoffController } from '../modules/auth/controllers/handoff.controller.js';
import { isRepresentativeEntryExchangeOrigin, isRepresentativeEntryTarget } from '../config/representative-entry.js';
import { REPRESENTATIVE_ENTRY_SERVICE_KEY } from '../config/service-catalog.js';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const uuid = '11111111-2222-4333-8444-555555555555';

/** KPA 에만 가입한 사용자 — neture membership 없음 */
const KPA_ONLY_USER = { id: 'user-1', email: 'u@example.test', name: 'U', isActive: true, status: 'active', refreshTokenFamily: 'fam-1' };
const KPA_ONLY_MEMBERSHIPS = [{ serviceKey: 'kpa-society', status: 'active' }];

function mockReq(body: Record<string, unknown>, origin?: string, user: unknown = KPA_ONLY_USER) {
  return { body, user, get: (h: string) => (h.toLowerCase() === 'origin' ? origin : undefined) } as any;
}
function mockRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  // 쿠키를 내리는 모든 경로를 기록한다 — exchange 는 어떤 것도 호출하지 않아야 한다(URL-FIRST-CENSUS §19-1).
  res.cookie = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.append = jest.fn(() => res);
  return res;
}
const sqlCalls = () => query.mock.calls.map((c) => norm(String(c[0])));

beforeEach(() => {
  query.mockReset();
  findOne.mockReset();
  getRoleNames.mockClear();
  generateTokens.mockClear();
  persistRefreshTokenFamily.mockClear();
  setAuthCookies.mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('A. 대표 진입 판정 helper', () => {
  it("대표 진입 target 은 REPRESENTATIVE_ENTRY_SERVICE_KEY('neture') 하나뿐", () => {
    expect(REPRESENTATIVE_ENTRY_SERVICE_KEY).toBe('neture');
    expect(isRepresentativeEntryTarget('neture')).toBe(true);
    for (const k of ['kpa-society', 'k-cosmetics', 'pharmacy-hub', 'lecture', 'kpa-branch', 'cafe24-b2b', 'store', '', undefined, 'NETURE']) {
      expect(isRepresentativeEntryTarget(k)).toBe(false);
    }
  });

  it('exchange origin: 프로덕션은 neture.co.kr / www.neture.co.kr 정확 host 만', () => {
    expect(isRepresentativeEntryExchangeOrigin('https://neture.co.kr', 'production')).toBe(true);
    expect(isRepresentativeEntryExchangeOrigin('https://www.neture.co.kr', 'production')).toBe(true);
    expect(isRepresentativeEntryExchangeOrigin('https://NETURE.co.kr', 'production')).toBe(true);
    // 같은 브랜드 하위 도메인이라도 다른 서비스/업무공간은 거부
    expect(isRepresentativeEntryExchangeOrigin('https://study.neture.co.kr', 'production')).toBe(false);
    expect(isRepresentativeEntryExchangeOrigin('https://store.neture.co.kr', 'production')).toBe(false);
    expect(isRepresentativeEntryExchangeOrigin('https://admin.neture.co.kr', 'production')).toBe(false);
    expect(isRepresentativeEntryExchangeOrigin('https://kpa-society.co.kr', 'production')).toBe(false);
    expect(isRepresentativeEntryExchangeOrigin('https://neture.co.kr.evil.test', 'production')).toBe(false);
    expect(isRepresentativeEntryExchangeOrigin('http://localhost:4211', 'production')).toBe(false);
    expect(isRepresentativeEntryExchangeOrigin('http://localhost:4211', 'development')).toBe(true);
    expect(isRepresentativeEntryExchangeOrigin(undefined, 'development')).toBe(false);
    expect(isRepresentativeEntryExchangeOrigin('not a url', 'development')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('B. generateHandoff', () => {
  it('비로그인 → 401 AUTH_REQUIRED · 토큰 INSERT 0', async () => {
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', null), res);
    expect([res.statusCode, res.body.code]).toEqual([401, 'AUTH_REQUIRED']);
    expect(query).not.toHaveBeenCalled();
  });

  it('알 수 없는 target → 400 INVALID_SERVICE', async () => {
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'glucoseview' }), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'INVALID_SERVICE']);
    expect(query).not.toHaveBeenCalled();
  });

  it('neture membership 없는 활성 사용자도 target=neture 발급 — service_memberships 조회 0 · returnTo "/" 고정', async () => {
    query.mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]); // INSERT · prune
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr'), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetUrl).toBe(`https://neture.co.kr/handoff?token=${uuid}&returnTo=%2F`);
    expect(res.body.data.targetService.key).toBe('neture');
    expect(sqlCalls()).not.toEqual(expect.arrayContaining([expect.stringContaining('service_memberships')]));
    // source 는 Origin host 정확 일치로 판정, target 은 neture 로 고정 기록
    expect(query.mock.calls[0][1].slice(0, 4)).toEqual(['user-1', 'kpa-society', 'neture', null]);
  });

  it("target=neture 는 returnPath '/' 만 허용 — 다른 경로는 400 (범용 redirect 0)", async () => {
    query.mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    let res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'neture', returnPath: '/' }, 'https://study.neture.co.kr'), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetUrl).toBe(`https://neture.co.kr/handoff?token=${uuid}&returnTo=%2F`);
    query.mockReset();
    res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'neture', returnPath: '/admin' }), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'VALIDATION_ERROR']);
    res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'neture', returnPath: '//evil.test' }), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'VALIDATION_ERROR']);
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    [[], 'HANDOFF_TARGET_NO_MEMBERSHIP'],
    [[{ status: 'pending' }], 'HANDOFF_TARGET_NOT_ACTIVE'],
    [[{ status: 'suspended' }], 'HANDOFF_TARGET_NOT_ACTIVE'],
    [[{ status: 'rejected' }], 'HANDOFF_TARGET_NOT_ACTIVE'],
    [[{ status: 'withdrawn' }], 'HANDOFF_TARGET_WITHDRAWN'],
  ])('일반 서비스 target 은 기존 계약 그대로 — membership %j → 403 %s · 토큰 INSERT 0', async (rows, code) => {
    query.mockResolvedValueOnce(rows);
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'pharmacy-hub' }, 'https://neture.co.kr'), res);
    expect([res.statusCode, res.body.code]).toEqual([403, code]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(sqlCalls()[0]).toContain('SELECT status FROM service_memberships');
  });

  it('일반 서비스 target + active → 200 (회귀 0)', async () => {
    query.mockResolvedValueOnce([{ status: 'active' }]).mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'kpa-society' }, 'https://neture.co.kr'), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetUrl).toBe(`https://kpa-society.co.kr/handoff?token=${uuid}`);
  });

  it.each([['neture'], ['kpa-society']])(
    'logout 뒤(서버 family null) 남은 access token 으로 %s 발급 → 401 HANDOFF_SESSION_REVOKED · INSERT 0',
    async (target) => {
      const res = mockRes();
      await HandoffController.generateHandoff(
        mockReq({ targetServiceKey: target }, 'https://kpa-society.co.kr', { ...KPA_ONLY_USER, refreshTokenFamily: null }),
        res,
      );
      expect([res.statusCode, res.body.code]).toEqual([401, 'HANDOFF_SESSION_REVOKED']);
      expect(query).not.toHaveBeenCalled();
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
describe('C. exchangeHandoff', () => {
  const consumed = (target: string, source = 'kpa-society') =>
    query.mockResolvedValueOnce([[{ user_id: 'user-1', source_service_key: source, target_service_key: target, target_workspace: null, created_at: new Date(0) }], 1]);
  const withProduction = async (fn: () => Promise<void>) => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try { await fn(); } finally { process.env.NODE_ENV = prev; }
  };

  it('neture 토큰 + neture.co.kr origin → 200 · 기존 family 승계 · membership/role write 0', async () => {
    await withProduction(async () => {
      consumed('neture');
      findOne.mockResolvedValueOnce(KPA_ONLY_USER);
      query.mockResolvedValueOnce(KPA_ONLY_MEMBERSHIPS);
      const req = mockReq({ token: uuid }, 'https://neture.co.kr', undefined);
      const res = mockRes();
      await HandoffController.exchangeHandoff(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.targetServiceKey).toBe('neture');
      expect(res.body.data.user.memberships).toEqual(KPA_ONLY_MEMBERSHIPS); // neture membership 이 생기지 않는다
      // 성공 경로도 쿠키를 내리지 않는다 — body 토큰만(URL-FIRST-CENSUS §19-1 · §21-2)
      expect(res.body.data.tokens).toEqual(expect.objectContaining({ accessToken: expect.any(String) }));
      expect(setAuthCookies).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalledWith('Set-Cookie', expect.anything());
      expect(res.append).not.toHaveBeenCalledWith('Set-Cookie', expect.anything());
      expect(generateTokens).toHaveBeenCalledWith(KPA_ONLY_USER, ['kpa:store_owner'], 'neture.co.kr', KPA_ONLY_MEMBERSHIPS, 'fam-1');
      expect(persistRefreshTokenFamily).toHaveBeenCalledWith('user-1', 'RT');
      // SQL 은 토큰 consume(UPDATE handoff_tokens) + memberships SELECT 뿐 — membership·role 생성/수정 0
      const sql = sqlCalls();
      expect(sql).toHaveLength(2);
      expect(sql[0]).toContain('UPDATE handoff_tokens');
      expect(sql[1]).toMatch(/^SELECT .* FROM service_memberships/);
      expect(sql.join(' ')).not.toMatch(/INSERT|DELETE|UPDATE service_memberships|role_assignments/);
    });
  });

  it.each([
    ['https://kpa-society.co.kr'],
    ['https://study.neture.co.kr'],
    ['https://store.neture.co.kr'],
    [undefined],
  ])('neture 토큰을 대표 진입 아닌 origin(%s) 에서 교환 → 401 HANDOFF_TOKEN_INVALID · 발급 0', async (origin) => {
    await withProduction(async () => {
      consumed('neture');
      findOne.mockResolvedValueOnce(KPA_ONLY_USER);
      query.mockResolvedValueOnce(KPA_ONLY_MEMBERSHIPS);
      const res = mockRes();
      await HandoffController.exchangeHandoff(mockReq({ token: uuid }, origin, undefined), res);
      expect([res.statusCode, res.body.code]).toEqual([401, 'HANDOFF_TOKEN_INVALID']);
      expect(generateTokens).not.toHaveBeenCalled();
      expect(setAuthCookies).not.toHaveBeenCalled();
    });
  });

  it.each([['suspended'], ['rejected'], ['inactive'], ['pending'], ['deleted']])(
    '교환 시점 계정 상태 %s → 403 ACCOUNT_NOT_ACTIVE · 발급 0',
    async (status) => {
      consumed('neture');
      findOne.mockResolvedValueOnce({ ...KPA_ONLY_USER, status });
      query.mockResolvedValueOnce(KPA_ONLY_MEMBERSHIPS);
      const res = mockRes();
      await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://neture.co.kr', undefined), res);
      expect([res.statusCode, res.body.code]).toEqual([403, 'ACCOUNT_NOT_ACTIVE']);
      expect(generateTokens).not.toHaveBeenCalled();
    },
  );

  it('isActive=false 계정 → 401 INVALID_USER (기존 계약)', async () => {
    consumed('neture');
    findOne.mockResolvedValueOnce({ ...KPA_ONLY_USER, isActive: false });
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://neture.co.kr', undefined), res);
    expect([res.statusCode, res.body.code]).toEqual([401, 'INVALID_USER']);
  });

  it.each([['neture'], ['kpa-society']])(
    '발급 뒤 TTL 안에 logout(family null) → %s 토큰 교환 401 HANDOFF_SESSION_REVOKED · 새 family 발급 0',
    async (target) => {
      consumed(target);
      findOne.mockResolvedValueOnce({ ...KPA_ONLY_USER, refreshTokenFamily: null });
      const res = mockRes();
      await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://neture.co.kr', undefined), res);
      expect([res.statusCode, res.body.code]).toEqual([401, 'HANDOFF_SESSION_REVOKED']);
      expect(generateTokens).not.toHaveBeenCalled();
      expect(persistRefreshTokenFamily).not.toHaveBeenCalled();
    },
  );

  it('이미 소비됐거나 만료된 토큰(원자 UPDATE 0행) → 401 HANDOFF_TOKEN_INVALID', async () => {
    query.mockResolvedValueOnce([[], 0]);
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://neture.co.kr', undefined), res);
    expect([res.statusCode, res.body.code]).toEqual([401, 'HANDOFF_TOKEN_INVALID']);
    expect(sqlCalls()[0]).toContain('consumed_at IS NULL');
    expect(sqlCalls()[0]).toContain('expires_at > now()');
  });

  it('잘못된 형식 토큰 / 토큰 없음 → 거부 · DB 조회 0', async () => {
    let res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: 'not-a-uuid' }, 'https://neture.co.kr', undefined), res);
    expect([res.statusCode, res.body.code]).toEqual([401, 'HANDOFF_TOKEN_INVALID']);
    res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({}, 'https://neture.co.kr', undefined), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'VALIDATION_ERROR']);
    expect(query).not.toHaveBeenCalled();
  });

  it('일반 서비스 토큰은 회귀 0 — neture.co.kr 에서 받은 kpa 토큰도 기존처럼 kpa membership 으로 판정', async () => {
    consumed('pharmacy-hub', 'neture');
    findOne.mockResolvedValueOnce(KPA_ONLY_USER);
    query.mockResolvedValueOnce(KPA_ONLY_MEMBERSHIPS); // pharmacy-hub membership 없음
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://pharmacyhub.co.kr', undefined), res);
    expect([res.statusCode, res.body.code]).toEqual([403, 'HANDOFF_TARGET_NO_MEMBERSHIP']);
    expect(generateTokens).not.toHaveBeenCalled();
  });
});

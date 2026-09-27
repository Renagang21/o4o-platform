/**
 * WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-2 — Workspace handoff 계약 테스트 (REOPEN · DDL 승인 후)
 *
 * 검증 축:
 *   A. migration — target_service_key NULL 허용 · target_workspace varchar(32) · CHECK 정확히 하나('store' 만 · NULL/NULL 거부) · manifest lockstep
 *   B. HandoffTokenService — SERVICE / WORKSPACE 두 형태를 같은 행 · 같은 원자 consume 으로 다룬다 (별도 토큰 시스템 0)
 *   C. HandoffController.generateHandoff — workspace 는 "접근 가능 organization ≥ 1" 로 판단(서비스 membership 무관) · 없으면 403 ·
 *      targetUrl 은 store.neture.co.kr 고정 · 가짜 serviceKey 0 · 둘 다/둘 다 없음/임의 workspace 400
 *   D. HandoffController.exchangeHandoff — workspace 토큰은 store.neture.co.kr origin 에서만 교환(불일치 401) · organization 재검증 ·
 *      service 토큰은 기존 active membership 재검증 그대로(회귀 0) · family 승계 · 쿠키 · body 동일
 *
 * DB 접속 없음 — AppDataSource / handoffTokenService 저장소 / 토큰 유틸은 double.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

// ─────────────────────────────────────────────────────────────────────────────
// Module doubles
// ─────────────────────────────────────────────────────────────────────────────

// 실제 TypeORM `query` 는 언제나 배열을 돌려준다. double 이 undefined 를 주면 호출부가
// 그것을 '행 0건' 으로 오해하거나 터지므로 기본값을 배열로 둔다 — 개별 테스트가 덮어쓴다.
const query = jest.fn().mockResolvedValue([]);
const findOne = jest.fn();
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    query: (...args: unknown[]) => query(...args),
    getRepository: () => ({ findOne: (...args: unknown[]) => findOne(...args) }),
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: handoff 가 세션 **세대**를 읽는다.
    //   세대 조회는 `query` 의 once 큐를 **소비하지 않는다** — 소비하면 이 spec 들이 순서로
    //   맞춰 둔 handoff SQL 응답이 한 칸씩 밀려 엉뚱한 값을 받는다(실제로 그렇게 깨졌다).
    //   여기서는 "폐기 기록 없음"(= 빈 배열)을 돌려주고, 나머지는 그대로 위임한다.
    //   세대 판정 자체는 전용 spec(service-logout-auth-boundary.spec.ts)이 본다.
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
  roleAssignmentService: { getRoleNames: jest.fn(async () => ['store_owner']) },
}));
const generateTokens = jest.fn(() => ({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 900 }));
// WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차): handoff 발급이 access token 의
//   세션 귀속(serviceKey · sessionEpoch)을 읽는다. 여기 기본값은 **claim 없는 토큰** 이므로
//   판정에서 제외되고 기존 계약이 그대로 검증된다. 귀속을 보는 시나리오는 전용 spec
//   (service-logout-auth-boundary.spec.ts)에서 실제 토큰으로 본다.
jest.mock('../utils/token.utils.js', () => ({
  generateTokens: (...a: unknown[]) => generateTokens(...a),
  verifyAccessToken: () => null,
}));
const persistRefreshTokenFamily = jest.fn(async () => undefined);
jest.mock('../services/auth/auth-context.helper.js', () => ({
  persistRefreshTokenFamily: (...a: unknown[]) => persistRefreshTokenFamily(...a),
}));
const setAuthCookies = jest.fn();
jest.mock('../utils/cookie.utils.js', () => ({ setAuthCookies: (...a: unknown[]) => setAuthCookies(...a) }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const resolveAccessibleStores = jest.fn();
jest.mock('../utils/service-tenant.resolver.js', () => ({
  resolveAccessibleStores: (...a: unknown[]) => resolveAccessibleStores(...a),
}));

import { handoffTokenService, isHandoffWorkspace, HANDOFF_WORKSPACES } from '../services/handoff-token.service.js';
// req/res 대역은 공통 support — 세 handoff spec 이 같은 것을 각자 갖고 있었다.
import { mockHandoffRes } from './support/handoff-http.js';
import { HandoffController } from '../modules/auth/controllers/handoff.controller.js';
import { isStoreWorkspaceExchangeOrigin, STORE_WORKSPACE_ORIGIN } from '../config/store-workspace.js';

const USER = { id: 'user-1', email: 'u@example.test', name: 'U', isActive: true, refreshTokenFamily: 'fam-1' };
const STORE = { organizationId: 'org-1', organizationName: '가나약국', memberRole: 'owner' };

function mockReq(body: Record<string, unknown>, origin?: string, user: unknown = USER) {
  // 실제 Express req 는 언제나 headers·cookies 를 갖는다. 없으면 토큰 추출이 터진다
  //   (WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: handoff 발급이 access token 의
  //    세션 귀속을 읽는다 — 로그아웃된 서비스의 남은 인증으로 긴 세션을 얻지 못하게).
  return {
    body,
    user,
    headers: {},
    cookies: {},
    get: (h: string) => (h.toLowerCase() === 'origin' ? origin : undefined),
  } as any;
}
const mockRes = mockHandoffRes;
const uuid = '11111111-2222-4333-8444-555555555555';

beforeEach(() => {
  query.mockReset();
  // mockReset 은 구현까지 지운다 → 기본 반환이 undefined 가 된다. 실제 TypeORM `query` 는
  // 언제나 배열이므로 기본값을 되돌린다(개별 테스트가 필요하면 다시 덮어쓴다).
  query.mockResolvedValue([]);
  findOne.mockReset();
  resolveAccessibleStores.mockReset();
  generateTokens.mockClear();
  persistRefreshTokenFamily.mockClear();
  setAuthCookies.mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────
// A. migration · manifest
// ─────────────────────────────────────────────────────────────────────────────

describe('A. handoff_tokens DDL (§8-1 승인 범위 그대로)', () => {
  const mig = read('database/migrations/1789974015939-AlterHandoffTokensTargetWorkspace.ts');
  const up = norm(mig.slice(mig.indexOf('async up('), mig.indexOf('async down(')));

  it('target_service_key DROP NOT NULL · target_workspace varchar(32) NULL · CHECK 정확히 하나', () => {
    expect(up).toContain('ALTER COLUMN target_service_key DROP NOT NULL');
    expect(up).toContain('ADD COLUMN target_workspace character varying(32) NULL');
    expect(up).toContain('ADD CONSTRAINT "CHK_handoff_tokens_target_kind"');
    expect(up).toContain('(target_service_key IS NOT NULL AND target_workspace IS NULL)');
    expect(up).toContain("(target_service_key IS NULL AND target_workspace IS NOT NULL AND target_workspace = 'store')");
  });

  it("target_workspace 허용값은 'store' 뿐 · backfill/UPDATE 0 · 별도 토큰 테이블 0", () => {
    expect(up.match(/'store'/g)).toHaveLength(1);
    expect(up).not.toMatch(/\bUPDATE\b/);
    expect(up).not.toContain('CREATE TABLE');
  });

  it('manifest 에 append 되고 expected-schema-states 와 lockstep 이다', () => {
    const manifest = read('database/incremental/manifest.ts');
    // 뒤에 다른 마이그레이션이 더 append 되어도 깨지지 않도록 "직후에 온다" 만 고정한다
    // (목록 끝을 고정하면 무관한 WO 가 이 테스트를 깬다).
    expect(manifest).toMatch(/CreateStoreOwnerTerminationCases1789701000000,\s*AlterHandoffTokensTargetWorkspace1789974015939,/);
    const states = read('database/incremental/expected-schema-states.ts');
    expect(states).toContain("appliedThrough: 'AlterHandoffTokensTargetWorkspace1789974015939'");
    // 원본 생성 migration 은 손대지 않는다 (applied migration 불변)
    expect(read('database/migrations/20270311000000-CreateHandoffTokens.ts')).toContain('"target_service_key" varchar(64) NOT NULL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. HandoffTokenService
// ─────────────────────────────────────────────────────────────────────────────

describe('B. HandoffTokenService — 두 형태 · 같은 원자 consume', () => {
  it("HANDOFF_WORKSPACES = ['store'] · isHandoffWorkspace 는 임의 문자열 거부", () => {
    expect(HANDOFF_WORKSPACES).toEqual(['store']);
    expect(isHandoffWorkspace('store')).toBe(true);
    expect(isHandoffWorkspace('admin')).toBe(false);
    expect(isHandoffWorkspace('')).toBe(false);
    expect(isHandoffWorkspace(undefined)).toBe(false);
  });

  it('service 대상(문자열 · 기존 호출 시그니처)은 target_service_key 만 채운다', async () => {
    query.mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    await handoffTokenService.generateToken('user-1', 'neture', 'kpa-society');
    const [sql, params] = query.mock.calls[0];
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차): source_session_epoch 컬럼이 늘었고
    //   값은 **같은 문장 안의 subquery** 로 채운다(별도 SELECT 를 앞세우면 왕복이 늘고 그 사이
    //   로그아웃이 끼어들 틈이 생긴다). 컬럼 목록과 subquery 둘 다 고정한다.
    expect(norm(sql)).toContain(
      '(user_id, source_service_key, target_service_key, target_workspace, expires_at, source_session_epoch)',
    );
    // WO §8 (4차): 세대는 **호출자가 검증한 값**으로 넘어온다($6). 여기서 현재 세대를 다시
    //   읽으면(subquery 든 별도 SELECT 든) 발급 검사와 기록 사이에 로그아웃이 끼었을 때 새 세대가
    //   적혀, 이미 로그아웃된 인증으로 시작한 handoff 가 교환에서 통과한다.
    expect(norm(sql)).toContain("now() + ($5 || ' seconds')::interval, $6)");
    expect(norm(sql)).not.toContain('SELECT session_epoch FROM service_session_revocations');
    expect(params.slice(0, 4)).toEqual(['user-1', 'neture', 'kpa-society', null]);
  });

  it("workspace 대상은 target_service_key NULL + target_workspace 'store' (가짜 serviceKey 0)", async () => {
    query.mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    await handoffTokenService.generateToken('user-1', 'kpa-society', { kind: 'workspace', targetWorkspace: 'store' });
    expect(query.mock.calls[0][1].slice(0, 4)).toEqual(['user-1', 'kpa-society', null, 'store']);
  });

  it('알 수 없는 workspace / 서비스는 INSERT 전에 throw', async () => {
    await expect(
      handoffTokenService.generateToken('user-1', 'x', { kind: 'workspace', targetWorkspace: 'admin' as any }),
    ).rejects.toThrow('Unknown target workspace');
    await expect(handoffTokenService.generateToken('user-1', 'x', 'store')).rejects.toThrow('Unknown target service');
    expect(query).not.toHaveBeenCalled();
  });

  it('exchange 는 기존 원자 UPDATE(consumed_at IS NULL) 하나로 두 형태를 소비하고 종류를 payload 에 반영한다', async () => {
    query.mockResolvedValueOnce([[{ user_id: 'user-1', source_service_key: 'kpa-society', target_service_key: null, target_workspace: 'store', created_at: new Date(0) }], 1]);
    const ws = await handoffTokenService.exchangeToken(uuid);
    expect(norm(query.mock.calls[0][0])).toContain('SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING');
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차): payload 에 출발 서비스 세대가
    //   실린다. 이 행에는 컬럼이 없으므로(컬럼 도입 이전 발급분) null — 교환 판정에서 제외된다.
    expect(ws).toEqual({ userId: 'user-1', sourceServiceKey: 'kpa-society', targetWorkspace: 'store', createdAt: new Date(0).toISOString(), sourceSessionEpoch: null });
    expect(ws).not.toHaveProperty('targetServiceKey');

    query.mockResolvedValueOnce([[{ user_id: 'user-1', source_service_key: 'neture', target_service_key: 'kpa-society', target_workspace: null, created_at: '2026-01-01' }], 1]);
    const svc = await handoffTokenService.exchangeToken(uuid);
    expect(svc).toEqual({ userId: 'user-1', sourceServiceKey: 'neture', targetServiceKey: 'kpa-society', createdAt: '2026-01-01', sourceSessionEpoch: null });
    expect(svc).not.toHaveProperty('targetWorkspace');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. generateHandoff
// ─────────────────────────────────────────────────────────────────────────────

describe('C. generateHandoff — workspace 는 organization 축', () => {
  it('접근 가능 organization 이 있으면 서비스 membership 조회 없이 store.neture.co.kr 토큰을 발급한다', async () => {
    resolveAccessibleStores.mockResolvedValueOnce([STORE]);
    query.mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetWorkspace: 'store', returnPath: '/store' }, 'https://kpa-society.co.kr'), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetUrl).toBe(`${STORE_WORKSPACE_ORIGIN}/handoff?token=${uuid}&returnTo=%2Fstore`);
    expect(res.body.data.targetWorkspace).toBe('store');
    expect(res.body.data).not.toHaveProperty('targetService');
    // service_memberships 를 보지 않는다 — INSERT 1 + prune 1 뿐
    expect(query.mock.calls.map((c) => norm(c[0]))).not.toEqual(expect.arrayContaining([expect.stringContaining('service_memberships')]));
    expect(query.mock.calls[0][1].slice(2, 4)).toEqual([null, 'store']);
    expect(resolveAccessibleStores).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('접근 가능 organization 0 → 403 HANDOFF_TARGET_NO_MEMBERSHIP · 토큰 INSERT 0', async () => {
    resolveAccessibleStores.mockResolvedValueOnce([]);
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetWorkspace: 'store' }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('HANDOFF_TARGET_NO_MEMBERSHIP');
    expect(query).not.toHaveBeenCalled();
  });

  it("임의 workspace 400 INVALID_WORKSPACE · 둘 다 / 둘 다 없음 400 · targetServiceKey='store' 는 기존 INVALID_SERVICE", async () => {
    let res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetWorkspace: 'admin' }), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'INVALID_WORKSPACE']);
    res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetWorkspace: 'store', targetServiceKey: 'kpa-society' }), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'VALIDATION_ERROR']);
    res = mockRes();
    await HandoffController.generateHandoff(mockReq({}), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'VALIDATION_ERROR']);
    res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'store' }), res);
    expect([res.statusCode, res.body.code]).toEqual([400, 'INVALID_SERVICE']);
    expect(resolveAccessibleStores).not.toHaveBeenCalled();
  });

  it('service handoff 는 회귀 없음 — target service active membership 검증 후 catalog origin 으로 발급', async () => {
    query.mockResolvedValueOnce([{ status: 'active' }]).mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    const res = mockRes();
    await HandoffController.generateHandoff(mockReq({ targetServiceKey: 'kpa-society' }, 'https://neture.co.kr'), res);
    expect(res.statusCode).toBe(200);
    expect(norm(query.mock.calls[0][0])).toContain('SELECT status FROM service_memberships');
    expect(query.mock.calls[0][1]).toEqual(['user-1', 'kpa-society']);
    expect(query.mock.calls[1][1].slice(0, 4)).toEqual(['user-1', 'neture', 'kpa-society', null]);
    expect(res.body.data.targetService.key).toBe('kpa-society');
    expect(res.body.data.targetUrl).toMatch(/^https:\/\/[^/]+\/handoff\?token=/);
    expect(res.body.data.targetUrl).not.toContain('store.neture.co.kr');
    expect(resolveAccessibleStores).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. exchangeHandoff
// ─────────────────────────────────────────────────────────────────────────────

describe('D. exchangeHandoff — origin 고정 · organization 재검증 · service 경로 불변', () => {
  const consumedWorkspace = () =>
    query.mockResolvedValueOnce([[{ user_id: 'user-1', source_service_key: 'kpa-society', target_service_key: null, target_workspace: 'store', created_at: new Date(0) }], 1]);
  const consumedService = () =>
    query.mockResolvedValueOnce([[{ user_id: 'user-1', source_service_key: 'neture', target_service_key: 'kpa-society', target_workspace: null, created_at: new Date(0) }], 1]);
  const memberships = [{ serviceKey: 'kpa-society', status: 'active' }];

  it('isStoreWorkspaceExchangeOrigin: 프로덕션은 store.neture.co.kr 정확 host 만', () => {
    expect(isStoreWorkspaceExchangeOrigin('https://store.neture.co.kr', 'production')).toBe(true);
    expect(isStoreWorkspaceExchangeOrigin('https://STORE.neture.co.kr', 'production')).toBe(true);
    expect(isStoreWorkspaceExchangeOrigin('https://neture.co.kr', 'production')).toBe(false);
    expect(isStoreWorkspaceExchangeOrigin('https://kpa-society.co.kr', 'production')).toBe(false);
    expect(isStoreWorkspaceExchangeOrigin('https://store.neture.co.kr.evil.test', 'production')).toBe(false);
    expect(isStoreWorkspaceExchangeOrigin('http://localhost:4210', 'production')).toBe(false);
    expect(isStoreWorkspaceExchangeOrigin('http://localhost:4210', 'development')).toBe(true);
    expect(isStoreWorkspaceExchangeOrigin(undefined, 'development')).toBe(false);
    expect(isStoreWorkspaceExchangeOrigin('not a url', 'development')).toBe(false);
  });

  it('workspace 토큰 + store origin + organization 있음 → 200 · family 승계 · 쿠키 · targetWorkspace', async () => {
    consumedWorkspace();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce(memberships); // memberships SELECT
    resolveAccessibleStores.mockResolvedValueOnce([STORE]);
    const req = mockReq({ token: uuid }, 'https://store.neture.co.kr', undefined);
    const res = mockRes();
    await HandoffController.exchangeHandoff(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetWorkspace).toBe('store');
    expect(res.body.data).not.toHaveProperty('targetServiceKey');
    expect(res.body.data.tokens).toEqual({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 900 });
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: 끝 두 인자 = 이 세션이 속한 대상과
    //   그 대상의 **현재 세대**. WORKSPACE handoff 는 서비스가 아니므로 workspace 키를 쓴다.
    //   세대를 새기지 않으면 그 대상에서 로그아웃한 뒤 재발급된 토큰까지 거절된다.
    expect(generateTokens).toHaveBeenCalledWith(USER, ['store_owner'], 'neture.co.kr', memberships, 'fam-1', 'store', 0);
    expect(persistRefreshTokenFamily).toHaveBeenCalledWith('user-1', 'RT');
    // exchange 는 쿠키를 내리지 않는다 — body 토큰만(URL-FIRST-CENSUS §19-1 · §21-2).
    //   이미 배포된 HandoffPage 가 credentials:'include' 로 호출해도 저장될 쿠키가 없다.
    expect(setAuthCookies).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalledWith('Set-Cookie', expect.anything());
    expect(res.append).not.toHaveBeenCalledWith('Set-Cookie', expect.anything());
    expect(resolveAccessibleStores).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('workspace 토큰을 다른 origin(서비스 도메인)에서 교환 → 401 HANDOFF_TOKEN_INVALID · 토큰 발급 0 (토큰은 이미 소비됨)', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      consumedWorkspace();
      findOne.mockResolvedValueOnce(USER);
      query.mockResolvedValueOnce(memberships);
      const res = mockRes();
      await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://kpa-society.co.kr', undefined), res);
      expect([res.statusCode, res.body.code]).toEqual([401, 'HANDOFF_TOKEN_INVALID']);
      expect(generateTokens).not.toHaveBeenCalled();
      expect(resolveAccessibleStores).not.toHaveBeenCalled();
      expect(norm(query.mock.calls[0][0])).toContain('SET consumed_at = now()');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('workspace 토큰 + store origin 이지만 organization 0 (TTL 사이 제거) → 403 · 발급 0', async () => {
    consumedWorkspace();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce(memberships);
    resolveAccessibleStores.mockResolvedValueOnce([]);
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://store.neture.co.kr', undefined), res);
    expect([res.statusCode, res.body.code]).toEqual([403, 'HANDOFF_TARGET_NO_MEMBERSHIP']);
    expect(generateTokens).not.toHaveBeenCalled();
  });

  it('service 토큰은 기존 계약 그대로 — active 재검증 통과 시 targetServiceKey · organization 조회 0 · origin 제한 0', async () => {
    consumedService();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce(memberships);
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://kpa-society.co.kr', undefined), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.targetServiceKey).toBe('kpa-society');
    expect(res.body.data).not.toHaveProperty('targetWorkspace');
    // SERVICE handoff 는 대상 서비스 키와 그 서비스의 세대를 새긴다 —
    //   그 서비스 로그아웃이 이 토큰을 지목할 수 있어야 한다.
    expect(generateTokens).toHaveBeenCalledWith(USER, ['store_owner'], 'neture.co.kr', memberships, 'fam-1', 'kpa-society', 0);
    expect(resolveAccessibleStores).not.toHaveBeenCalled();
  });

  it('service 토큰 + 대상 서비스 membership pending → 403 HANDOFF_TARGET_NOT_ACTIVE (회귀 0)', async () => {
    consumedService();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce([{ serviceKey: 'kpa-society', status: 'pending' }]);
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://kpa-society.co.kr', undefined), res);
    expect([res.statusCode, res.body.code]).toEqual([403, 'HANDOFF_TARGET_NOT_ACTIVE']);
  });

  it('workspace 토큰 교환은 특정 서비스 membership 상태와 무관하다 (pending 뿐이어도 organization 있으면 200)', async () => {
    consumedWorkspace();
    findOne.mockResolvedValueOnce(USER);
    query.mockResolvedValueOnce([{ serviceKey: 'kpa-society', status: 'pending' }]);
    resolveAccessibleStores.mockResolvedValueOnce([STORE]);
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: uuid }, 'https://store.neture.co.kr', undefined), res);
    expect(res.statusCode).toBe(200);
  });
});

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
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: jest.fn(async () => ['store_owner']) },
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
const resolveAccessibleStores = jest.fn();
jest.mock('../utils/service-tenant.resolver.js', () => ({
  resolveAccessibleStores: (...a: unknown[]) => resolveAccessibleStores(...a),
}));

import { handoffTokenService, isHandoffWorkspace, HANDOFF_WORKSPACES } from '../services/handoff-token.service.js';
import { HandoffController } from '../modules/auth/controllers/handoff.controller.js';
import { isStoreWorkspaceExchangeOrigin, STORE_WORKSPACE_ORIGIN } from '../config/store-workspace.js';

const USER = { id: 'user-1', email: 'u@example.test', name: 'U', isActive: true, refreshTokenFamily: 'fam-1' };
const STORE = { organizationId: 'org-1', organizationName: '가나약국', memberRole: 'owner' };

function mockReq(body: Record<string, unknown>, origin?: string, user: unknown = USER) {
  return {
    body,
    user,
    get: (h: string) => (h.toLowerCase() === 'origin' ? origin : undefined),
  } as any;
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
const uuid = '11111111-2222-4333-8444-555555555555';

beforeEach(() => {
  query.mockReset();
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
    expect(norm(sql)).toContain('(user_id, source_service_key, target_service_key, target_workspace, expires_at)');
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
    expect(ws).toEqual({ userId: 'user-1', sourceServiceKey: 'kpa-society', targetWorkspace: 'store', createdAt: new Date(0).toISOString() });
    expect(ws).not.toHaveProperty('targetServiceKey');

    query.mockResolvedValueOnce([[{ user_id: 'user-1', source_service_key: 'neture', target_service_key: 'kpa-society', target_workspace: null, created_at: '2026-01-01' }], 1]);
    const svc = await handoffTokenService.exchangeToken(uuid);
    expect(svc).toEqual({ userId: 'user-1', sourceServiceKey: 'neture', targetServiceKey: 'kpa-society', createdAt: '2026-01-01' });
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
    expect(generateTokens).toHaveBeenCalledWith(USER, ['store_owner'], 'neture.co.kr', memberships, 'fam-1');
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
    expect(generateTokens).toHaveBeenCalledWith(USER, ['store_owner'], 'neture.co.kr', memberships, 'fam-1');
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

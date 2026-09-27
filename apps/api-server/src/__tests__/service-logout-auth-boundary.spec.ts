/**
 * 서비스 단위 로그아웃 — 인증 경계 통합 시나리오
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차 리뷰)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 spec 이 따로 있는가
 *
 * §8 은 refresh 경로만 막았다. 리뷰가 지적한 것은 **그 옆길들**이다 — 로그아웃 뒤에도
 * ① 남은 access token 으로 handoff 를 새로 발급받을 수 있고, ② 로그아웃 전에 받아 둔
 * handoff 토큰을 로그아웃 뒤에 교환할 수 있고, ③ 관리자 화면 origin 은 서비스로 해석되지
 * 않아 서버측 폐기를 건너뛰고, ④ 한 서비스에서 다시 로그인하면 **다른 서비스 세션이 죽었다.**
 *
 * 하나씩 단위로 보면 다 통과하는 경로들이라 **연결해서** 고정한다.
 * 여기서 막는 것은 "이미 로그아웃된 A 의 오래된 인증으로 시작한 이동" 이고,
 * "살아 있는 B 세션에서 A 로 가는 정상 이동" 은 막지 않는다 — 둘을 구분하는 것이 핵심이다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Doubles — DB 접속 없음
// ─────────────────────────────────────────────────────────────────────────────

/** `service_session_revocations` in-memory 대역 */
let epochs: Array<{ userId: string; serviceKey: string; epoch: number }> = [];
const epochOf = (userId: string, serviceKey: string) =>
  epochs.find((e) => e.userId === userId && e.serviceKey === serviceKey)?.epoch ?? 0;
const bump = (userId: string, serviceKey: string) => {
  const found = epochs.find((e) => e.userId === userId && e.serviceKey === serviceKey);
  if (found) found.epoch += 1;
  else epochs.push({ userId, serviceKey, epoch: 1 });
};

/** `handoff_tokens` in-memory 대역 */
let handoffRows: Array<Record<string, unknown>> = [];

/** 값을 넣으면 handoff INSERT 시점에 그 서비스의 세대를 한 번 올린다(TOCTOU 재현). */
let bumpDuringHandoffInsert: string | null = null;

const query = jest.fn(async (sql: string, params: unknown[] = []) => {
  const q = String(sql).replace(/\s+/g, ' ');

  if (/INSERT INTO service_session_revocations/i.test(q)) {
    bump(String(params[0]), String(params[1]));
    return [{ session_epoch: epochOf(String(params[0]), String(params[1])) }];
  }
  // ⚠ 앵커를 문장 **앞**에 고정한다 — handoff INSERT 안에 같은 SELECT 가 subquery 로 들어 있어
  //   느슨하게 match 하면 INSERT 응답을 가로챈다(실제로 그렇게 깨졌다).
  if (/^SELECT session_epoch FROM service_session_revocations/i.test(q)) {
    const found = epochs.find((e) => e.userId === params[0] && e.serviceKey === params[1]);
    return found ? [{ session_epoch: found.epoch }] : [];
  }
  if (/max\(session_epoch\)/i.test(q)) {
    const rows = epochs.filter((e) => e.userId === params[0]);
    return [{ max_epoch: rows.length ? Math.max(...rows.map((r) => r.epoch)) : null }];
  }
  if (/INSERT INTO handoff_tokens/i.test(q)) {
    // TOCTOU 재현 훅: 발급 검사가 끝난 **뒤** 원장 기록 사이에 로그아웃이 끼는 상황.
    if (bumpDuringHandoffInsert) {
      bump(String(params[0]), bumpDuringHandoffInsert);
      bumpDuringHandoffInsert = null;
    }
    const row = {
      id: HANDOFF_ID,
      user_id: params[0],
      source_service_key: params[1],
      target_service_key: params[2],
      target_workspace: params[3],
      // WO §8 (4차): 세대는 **호출자가 검증한 값**으로 넘어온다. 여기서 현재 세대를 다시 읽으면
      //   발급 검사와 기록 사이에 로그아웃이 끼었을 때 새 세대가 적힌다(그것이 고친 결함이다).
      source_session_epoch: params[5] ?? null,
      consumed_at: null,
    };
    handoffRows.push(row);
    return [{ id: HANDOFF_ID }];
  }
  if (/UPDATE handoff_tokens/i.test(q)) {
    const row = handoffRows.find((r) => r.id === params[0] && r.consumed_at === null);
    if (!row) return [[], 0];
    row.consumed_at = new Date();
    return [[{ ...row, created_at: new Date(0) }], 1];
  }
  if (/FROM service_memberships/i.test(q)) return MEMBERSHIPS;
  return [];
});

const findOne = jest.fn();

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    query: (...a: unknown[]) => (query as any)(...a),
    getRepository: () => ({ findOne: (...a: unknown[]) => findOne(...a) }),
    manager: { query: (...a: unknown[]) => (query as any)(...a) },
  },
}));
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: jest.fn(async () => ['kpa:store_owner']) },
}));

/** 실제 토큰 유틸을 쓴다 — claim 이 실제로 실리는지까지 보려면 double 로는 부족하다. */
jest.mock('../services/auth/auth-context.helper.js', () => ({
  persistRefreshTokenFamily: jest.fn(async () => undefined),
  freshenUserContext: jest.fn(async () => ({ roles: [], memberships: MEMBERSHIPS })),
}));
jest.mock('../utils/cookie.utils.js', () => ({ setAuthCookies: jest.fn(), clearAuthCookies: jest.fn() }));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../utils/service-tenant.resolver.js', () => ({ resolveAccessibleStores: jest.fn(async () => []) }));

import * as tokenUtils from '../utils/token.utils.js';
import { HandoffController } from '../modules/auth/controllers/handoff.controller.js';
import { resolveSessionServiceKey } from '../utils/session-origin.js';

const HANDOFF_ID = '11111111-2222-4333-8444-555555555555';
const USER_ID = 'user-1';
const MEMBERSHIPS = [
  { serviceKey: 'kpa-society', status: 'active' },
  { serviceKey: 'neture', status: 'active' },
];
const USER: any = {
  id: USER_ID,
  email: 'u@example.test',
  name: 'U',
  isActive: true,
  status: 'active',
  refreshTokenFamily: 'fam-1',
};

function mockReq(body: Record<string, unknown>, origin?: string, accessToken?: string) {
  return {
    body,
    user: USER,
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    cookies: {},
    get: (h: string) => (h.toLowerCase() === 'origin' ? origin : undefined),
  } as any;
}
function mockRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  res.cookie = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.append = jest.fn(() => res);
  return res;
}

/** 그 서비스의 현재 세대를 새긴 access token — 실제 로그인이 만드는 것과 같은 모양. */
const accessTokenFor = (serviceKey: string) =>
  tokenUtils.generateTokens(USER, [], 'neture.co.kr', MEMBERSHIPS, 'fam-1', serviceKey, epochOf(USER_ID, serviceKey))
    .accessToken;

/** 이 변경 배포 **전에** 발급된 access token — serviceKey · sessionEpoch claim 이 없다. */
const legacyAccessToken = () =>
  tokenUtils.generateTokens(USER, [], 'neture.co.kr', MEMBERSHIPS, 'fam-1', null, null).accessToken;

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-logout-boundary';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-for-logout-boundary';
});

beforeEach(() => {
  epochs = [];
  handoffRows = [];
  bumpDuringHandoffInsert = null;
  query.mockClear();
  findOne.mockReset();
  findOne.mockResolvedValue(USER);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. 로그아웃 뒤 남은 access token 으로 handoff 발급
// ─────────────────────────────────────────────────────────────────────────────

describe('1. 로그아웃된 서비스의 access token 으로는 handoff 를 발급받지 못한다', () => {
  it('A 로그아웃 뒤 A 의 옛 access token → 401 SERVICE_SESSION_REVOKED', async () => {
    const staleToken = accessTokenFor('kpa-society'); // 세대 0
    bump(USER_ID, 'kpa-society'); // A 로그아웃 → 세대 1

    const res = mockRes();
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', staleToken),
      res,
    );

    expect([res.statusCode, res.body?.code]).toEqual([401, 'SERVICE_SESSION_REVOKED']);
    // handoff 토큰이 만들어지지 않았다 = 긴 수명 세션을 새로 얻지 못했다.
    expect(handoffRows).toEqual([]);
  });

  it('로그아웃하지 않은 서비스의 access token 은 그대로 발급된다 (정상 흐름 유지)', async () => {
    const liveToken = accessTokenFor('neture');
    bump(USER_ID, 'kpa-society'); // 다른 서비스만 로그아웃

    const res = mockRes();
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'kpa-society' }, 'https://neture.co.kr', liveToken),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(handoffRows).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. 발급 후 로그아웃 → 교환
// ─────────────────────────────────────────────────────────────────────────────

describe('2. 발급 뒤 출발 서비스에서 로그아웃하면 그 handoff 토큰은 교환되지 않는다', () => {
  it('A 에서 발급 → A 로그아웃 → TTL 안에 교환 → 401 SERVICE_SESSION_REVOKED', async () => {
    const liveToken = accessTokenFor('kpa-society');
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', liveToken),
      mockRes(),
    );
    expect(handoffRows).toHaveLength(1);

    bump(USER_ID, 'kpa-society'); // 발급 뒤 A 로그아웃

    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: HANDOFF_ID }, 'https://neture.co.kr'), res);

    expect([res.statusCode, res.body?.code]).toEqual([401, 'SERVICE_SESSION_REVOKED']);
  });

  it('출발 서비스가 살아 있으면 교환은 정상이다', async () => {
    const liveToken = accessTokenFor('kpa-society');
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', liveToken),
      mockRes(),
    );

    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: HANDOFF_ID }, 'https://neture.co.kr'), res);

    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. 관리자 화면 세션 범위
// ─────────────────────────────────────────────────────────────────────────────

describe('3. 관리자 화면 origin 도 명시적 세션 범위를 갖는다', () => {
  it('admin.neture.co.kr 은 서비스가 아니라 **admin 범위**로 해석된다', () => {
    // neture 로 임의 취급하지 않는다 — 관리자 화면은 서비스 가입 축이 아니다.
    expect(resolveSessionServiceKey('https://admin.neture.co.kr')).toBe('admin');
    expect(resolveSessionServiceKey('https://admin.neture.co.kr')).not.toBe('neture');
  });

  it('알 수 없는 origin 은 여전히 null 이다 (임의로 넓히지 않는다)', () => {
    expect(resolveSessionServiceKey('https://example.invalid')).toBeNull();
    expect(resolveSessionServiceKey(undefined)).toBeNull();
  });

  it('로그아웃 컨트롤러는 범위를 본문이 아니라 origin 에서 얻는다 (소스 고정)', () => {
    const src = read('modules/auth/controllers/auth-session.controller.ts');
    expect(src).toContain("resolveSessionServiceKey(req.get('origin'))");
    // 본문 serviceKey 를 세션 귀속으로 쓰면 남의 서비스 세션을 끊을 수 있다.
    expect(src).not.toMatch(/logout\([^)]*req\.body/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. handoff 발급·교환이 세대를 원장에 남긴다 (소스 고정)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 5. 출발 인증의 일관성 (4차 리뷰)
// ─────────────────────────────────────────────────────────────────────────────

describe('5. handoff 원장은 **검증된 access token** 의 출발 서비스·세대를 증명한다', () => {
  /**
   * 세 경우가 한 뿌리다 — 원장에 적히는 "출발" 이 토큰이 증명한 값이 아니면,
   * 교환 시점의 세대 비교가 **엉뚱한 서비스**나 **엉뚱한 시점**을 본다.
   */

  it('5-1 claim 없는 배포 전 토큰으로도 로그아웃 뒤 발급을 막는다', async () => {
    // claim 이 없으면 검사를 건너뛰던 자리 — 만료 전 최대 15분 동안 옛 경로가 남았다.
    bump(USER_ID, 'kpa-society'); // A 로그아웃

    const res = mockRes();
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', legacyAccessToken()),
      res,
    );

    expect([res.statusCode, res.body?.code]).toEqual([401, 'SERVICE_SESSION_REVOKED']);
    expect(handoffRows).toEqual([]);
  });

  it('5-1b 폐기 기록이 없으면 배포 전 토큰도 정상 발급된다 (배포만으로 막지 않는다)', async () => {
    const res = mockRes();
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', legacyAccessToken()),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(handoffRows).toHaveLength(1);
  });

  it('5-2 Origin 을 다른 서비스로 지정해도 출발 서비스를 바꿀 수 없다', async () => {
    // 토큰은 A(kpa-society) 인데 Origin 만 B(neture) 라고 주장한다.
    //   원장이 Origin 을 믿으면 교환 때 **B 의 세대**를 검사하므로, A 에서 로그아웃해도 통과한다.
    const aToken = accessTokenFor('kpa-society');

    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://neture.co.kr', aToken),
      mockRes(),
    );

    expect(handoffRows).toHaveLength(1);
    // 원장의 출발은 **토큰이 증명한** 서비스여야 한다.
    expect(handoffRows[0].source_service_key).toBe('kpa-society');

    // 그래서 A 로그아웃이 이 handoff 를 무효로 만든다.
    bump(USER_ID, 'kpa-society');
    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: HANDOFF_ID }, 'https://neture.co.kr'), res);
    expect([res.statusCode, res.body?.code]).toEqual([401, 'SERVICE_SESSION_REVOKED']);
  });

  it('5-3 발급 검사와 원장 기록 사이에 로그아웃이 끼어도 교환은 막힌다', async () => {
    const aToken = accessTokenFor('kpa-society'); // 세대 0 으로 검증된다
    // 검사 통과 직후, 원장에 쓰이는 순간 로그아웃이 일어난다.
    bumpDuringHandoffInsert = 'kpa-society';

    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', aToken),
      mockRes(),
    );

    expect(handoffRows).toHaveLength(1);
    // 원장은 **그때의 현재 세대(1)** 가 아니라 **토큰이 증명한 세대(0)** 를 적어야 한다.
    //   현재 세대를 적으면 이미 로그아웃된 인증으로 시작한 handoff 가 교환에서 통과한다.
    expect(handoffRows[0].source_session_epoch).toBe(0);
    expect(epochOf(USER_ID, 'kpa-society')).toBe(1);

    const res = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: HANDOFF_ID }, 'https://neture.co.kr'), res);
    expect([res.statusCode, res.body?.code]).toEqual([401, 'SERVICE_SESSION_REVOKED']);
  });

  it('5-4 살아 있는 B 세션에서 A 로 가는 정상 handoff 는 계속 성공한다', async () => {
    const bToken = accessTokenFor('neture');
    bump(USER_ID, 'kpa-society'); // 다른 서비스만 로그아웃

    const gen = mockRes();
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'kpa-society' }, 'https://neture.co.kr', bToken),
      gen,
    );
    expect(gen.statusCode).toBe(200);

    const ex = mockRes();
    await HandoffController.exchangeHandoff(mockReq({ token: HANDOFF_ID }, 'https://kpa-society.co.kr'), ex);
    expect(ex.statusCode).toBe(200);
  });
});

describe('4. handoff 원장이 출발 서비스 세대를 보관한다', () => {
  it('발급 시 source_session_epoch 를 기록한다', async () => {
    const liveToken = accessTokenFor('kpa-society');
    await HandoffController.generateHandoff(
      mockReq({ targetServiceKey: 'neture' }, 'https://kpa-society.co.kr', liveToken),
      mockRes(),
    );
    expect(handoffRows[0].source_session_epoch).toBe(0);
  });

  it('교환은 그 값을 현재 세대와 비교한다 (created_at 시각 비교가 아니다)', () => {
    const src = read('services/handoff-token.service.ts');
    expect(src).toContain('source_session_epoch');
    // 시각 비교로 되돌리면 §8 에서 버린 초 단위 문제가 되살아난다.
    expect(src).not.toMatch(/created_at\s*[<>]/);
  });
});

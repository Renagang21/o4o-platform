/**
 * Restricted Account Access — 제한 로그인 중앙 default-deny 가드 테스트
 *
 * WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1 §11.7
 * IR: IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1 (B안)
 *
 * 검증 대상:
 *   users.status = pending 계정은 **제한 JWT** 로 로그인하되,
 *   중앙 allowlist 에 명시된 (METHOD, 정확한 경로) 외 모든 API 는 403 으로 차단된다.
 *
 * DB 미사용 — AppDataSource / token.utils 를 스텁하고 requireAuth 를 직접 태운다.
 */

import express from 'express';
import request from 'supertest';

const NORMAL_ID = '11111111-1111-1111-1111-111111111111';

// ─────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────

/** requireAuth 가 조회하는 users row (테스트마다 status 를 바꾼다) */
let currentUser: any = null;

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({
      findOne: async () => currentUser,
    }),
  },
}));

jest.mock('../../utils/token.utils.js', () => ({
  verifyAccessToken: (token: string) => {
    if (token === 'invalid') return null;
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  },
  isServiceToken: () => false,
}));

import { requireAuth } from '../../common/middleware/auth/authentication.middleware.js';
import {
  resolveAccountAccess,
  isRestrictedRequestAllowed,
  normalizeRequestPath,
} from '../../common/auth/account-access.policy.js';
import { UserStatus } from '../../types/auth.js';

function makeToken(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

/**
 * 실제 마운트 구조를 흉내낸다: allowlist 판정은 req.originalUrl(전체 경로) 기준이므로
 * 라우터를 `/api/v1/...` 하위에 마운트한 뒤 요청해야 의미가 있다.
 */
function makeApp() {
  const app = express();
  app.use(express.json());
  const handler = (_req: any, res: any) => res.json({ success: true, reached: true });
  // 모든 method/경로를 하나의 핸들러로 받는다 — 가드 통과 여부만 판정한다.
  app.all('/api/v1/*', requireAuth as any, handler);
  return app;
}

function setUser(status: string, isActive = true) {
  currentUser = {
    id: NORMAL_ID,
    status,
    isActive,
    roles: [],
    memberships: [],
  };
}

const RESTRICTED_CODE = 'ACCOUNT_ACCESS_RESTRICTED';

describe('resolveAccountAccess — 상태 매핑 (§2.1)', () => {
  it('active / approved → normal', () => {
    expect(resolveAccountAccess(UserStatus.ACTIVE)).toBe('normal');
    expect(resolveAccountAccess(UserStatus.APPROVED)).toBe('normal');
  });

  it('pending → restricted', () => {
    expect(resolveAccountAccess(UserStatus.PENDING)).toBe('restricted');
  });

  it('inactive / suspended / rejected → blocked', () => {
    expect(resolveAccountAccess(UserStatus.INACTIVE)).toBe('blocked');
    expect(resolveAccountAccess(UserStatus.SUSPENDED)).toBe('blocked');
    expect(resolveAccountAccess(UserStatus.REJECTED)).toBe('blocked');
  });

  it('알 수 없는 값은 fail closed → blocked (§7.3)', () => {
    expect(resolveAccountAccess('deleted')).toBe('blocked');
    expect(resolveAccountAccess(undefined)).toBe('blocked');
    expect(resolveAccountAccess(null)).toBe('blocked');
    expect(resolveAccountAccess('')).toBe('blocked');
  });
});

describe('normalizeRequestPath — 우회 벡터 (§11.7)', () => {
  it('query / fragment 를 제거한다', () => {
    expect(normalizeRequestPath('/api/v1/auth/me?x=1')).toBe('/api/v1/auth/me');
    expect(normalizeRequestPath('/api/v1/auth/me#frag')).toBe('/api/v1/auth/me');
  });

  it('중복 슬래시 / 후행 슬래시를 정규화한다', () => {
    expect(normalizeRequestPath('//api/v1//auth/me/')).toBe('/api/v1/auth/me');
  });

  it('상대 경로 세그먼트를 거부한다', () => {
    expect(normalizeRequestPath('/api/v1/auth/me/../../orders')).toBeNull();
    expect(normalizeRequestPath('/api/v1/./auth/me')).toBeNull();
  });

  it('다중 인코딩 / malformed 인코딩을 거부한다', () => {
    expect(normalizeRequestPath('/api/v1/auth/%256de')).toBeNull();
    expect(normalizeRequestPath('/api/v1/auth/%zz')).toBeNull();
  });

  it('역슬래시·제어문자를 거부한다', () => {
    expect(normalizeRequestPath('/api/v1/auth\\me')).toBeNull();
  });
});

describe('isRestrictedRequestAllowed — method 구분 (§5-C)', () => {
  it('allowlist 경로는 지정 method 로만 통과한다', () => {
    expect(isRestrictedRequestAllowed('GET', '/api/v1/auth/me')).toBe(true);
    expect(isRestrictedRequestAllowed('POST', '/api/v1/auth/me')).toBe(false);
    expect(isRestrictedRequestAllowed('DELETE', '/api/v1/auth/me')).toBe(false);
  });

  it('prefix 매칭으로 하위 경로를 열지 않는다', () => {
    expect(isRestrictedRequestAllowed('GET', '/api/v1/auth/me/profile')).toBe(false);
    expect(isRestrictedRequestAllowed('GET', '/api/v1/auth/services/kpa/join')).toBe(false);
  });

  it('method / 경로가 없으면 fail closed', () => {
    expect(isRestrictedRequestAllowed(undefined, '/api/v1/auth/me')).toBe(false);
    expect(isRestrictedRequestAllowed('GET', undefined)).toBe(false);
  });
});

describe('중앙 가드 — requireAuth 통합 (§5-B / §11.7)', () => {
  const app = makeApp();
  const token = makeToken({ userId: NORMAL_ID, roles: [] });

  it('① normal 계정은 모든 경로를 통과한다', async () => {
    setUser(UserStatus.ACTIVE);
    const res = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.reached).toBe(true);
  });

  it('② restricted 계정은 allowlist GET 을 통과한다', async () => {
    setUser(UserStatus.PENDING);
    const res = await request(app)
      .get('/api/v1/pharmacy-hub/join/status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('③ restricted 계정은 allowlist POST 를 통과한다', async () => {
    setUser(UserStatus.PENDING);
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('④ restricted 계정의 비허용 GET 은 403 으로 차단된다', async () => {
    setUser(UserStatus.PENDING);
    const res = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(RESTRICTED_CODE);
  });

  it('⑤ restricted 계정의 비허용 POST 는 403 으로 차단된다', async () => {
    setUser(UserStatus.PENDING);
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(RESTRICTED_CODE);
  });

  it('⑥ method 불일치는 차단된다 (GET 허용 경로에 POST)', async () => {
    setUser(UserStatus.PENDING);
    const res = await request(app)
      .post('/api/v1/pharmacy-hub/join/status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(RESTRICTED_CODE);
  });

  it('⑦ path 유사 문자열 우회는 차단된다', async () => {
    setUser(UserStatus.PENDING);
    const res = await request(app)
      .get('/api/v1/auth/mex')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(RESTRICTED_CODE);
  });

  it('⑧ query 조작 우회는 차단된다', async () => {
    setUser(UserStatus.PENDING);
    const res = await request(app)
      .get('/api/v1/orders?path=/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(RESTRICTED_CODE);
  });

  it('⑨ claim 이 없어도 DB status=pending 이면 제한된다 (fail closed)', async () => {
    setUser(UserStatus.PENDING);
    // accountAccess claim 이 아예 없는(본 WO 이전 발급) 토큰
    const legacyToken = makeToken({ userId: NORMAL_ID, roles: ['admin'] });
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${legacyToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(RESTRICTED_CODE);
  });

  it('⑩ 알 수 없는 status / 차단 상태는 ACCOUNT_NOT_ACTIVE 로 차단된다', async () => {
    setUser('deleted');
    const unknown = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(unknown.status).toBe(403);
    expect(unknown.body.code).toBe('ACCOUNT_NOT_ACTIVE');

    setUser(UserStatus.SUSPENDED);
    const suspended = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(suspended.status).toBe(403);
    expect(suspended.body.code).toBe('ACCOUNT_NOT_ACTIVE');
  });

  it('claim 위조로 승격할 수 없다 (판정 SSOT = DB users.status)', async () => {
    setUser(UserStatus.PENDING);
    const forged = makeToken({ userId: NORMAL_ID, roles: [], accountAccess: 'normal' });
    const res = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(RESTRICTED_CODE);
  });

  it('승인 후(status=active) 즉시 전체 접근이 복구된다 (§11.4)', async () => {
    setUser(UserStatus.PENDING);
    const before = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(403);

    // 운영자 승인으로 users.status 가 active 가 된 상황 (동일 토큰 유지)
    setUser(UserStatus.ACTIVE);
    const after = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(200);
  });
});

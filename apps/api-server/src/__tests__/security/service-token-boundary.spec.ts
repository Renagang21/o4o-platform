/**
 * Service Token Boundary — service login RETIRE + requireAuth 사람 사용자 경계 고정
 *
 * WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1
 * IR: IR-O4O-PRIVACY-DATA-CENSUS-V1 §7-1 #1·#2
 *
 * 고정하는 계약:
 *   1. `POST /api/v1/auth/service/login` 과 `POST /api/v1/auth/guest/upgrade` 는 존재하지 않는다.
 *      (임의 `{id,email}` JSON 만으로 tokenType:'service' JWT 가 발급되던 두 진입점 — RETIRE)
 *   2. token.utils 에 service 토큰 발급 함수가 남아 있지 않다.
 *   3. `requireAuth` 는 tokenType:'user' 토큰만 통과시킨다. jwtSecret 으로 올바르게 서명되고
 *      userId 가 실재 users.id 와 일치하더라도 tokenType:'service' / 'guest' 는 401 이다.
 *   4. 기존 사용자 토큰(generateAccessToken) 은 회귀 없이 통과한다.
 *
 * DB 미사용 — AppDataSource 만 스텁하고 token.utils 는 실제 jwt 서명을 사용한다.
 */

import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-access-secret-for-service-token-boundary-spec';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-service-token-boundary-spec';
process.env.JWT_ISSUER = 'o4o-platform-test';
process.env.JWT_AUDIENCE = 'o4o-clients-test';

const EXISTING_USER_ID = '22222222-2222-2222-2222-222222222222';

// ─────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────

const existingUser = {
  id: EXISTING_USER_ID,
  email: 'existing@test.local',
  status: 'active',
  isActive: true,
  roles: [],
  memberships: [],
  linkedAccounts: [],
};

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({
      // requireAuth 가 payload.userId 로 조회한다 — 실재 users.id 를 아는 공격자를 흉내낸다.
      findOne: async ({ where }: { where: { id: string } }) =>
        where.id === EXISTING_USER_ID ? existingUser : null,
    }),
  },
}));

// guest 라우터가 끌어오는 AuthenticationService 는 이 테스트의 관심사가 아니다.
jest.mock('../../services/authentication.service.js', () => ({
  getAuthenticationService: () => ({
    issueGuestToken: async () => ({
      success: true,
      guestSessionId: 'guest_test',
      tokens: { accessToken: 'stub', expiresIn: 7200 },
      tokenType: 'guest',
      context: { serviceId: 'kpa-pharmacy', entryType: 'qr' },
    }),
  }),
}));

import * as tokenUtils from '../../utils/token.utils.js';
import { requireAuth, optionalAuth } from '../../common/middleware/auth/authentication.middleware.js';
import guestAuthRoutes from '../../modules/auth/routes/guest-auth.routes.js';

const SRC_ROOT = resolve(__dirname, '../..');

function signWithAccessSecret(payload: Record<string, unknown>, secret = process.env.JWT_SECRET as string) {
  return jwt.sign(
    {
      iss: process.env.JWT_ISSUER,
      aud: process.env.JWT_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      ...payload,
    },
    secret,
  );
}

/** 과거 generateServiceAccessToken 이 만들던 payload 형태 — userId 에 실재 users.id 를 넣는다. */
function forgedServiceToken(secret?: string) {
  return signWithAccessSecret(
    {
      userId: EXISTING_USER_ID,
      sub: EXISTING_USER_ID,
      email: 'attacker@test.local',
      name: 'attacker',
      role: 'service_user',
      tokenType: 'service',
      serviceId: 'kpa-pharmacy',
    },
    secret,
  );
}

function makeGuardedApp() {
  const app = express();
  app.use(express.json());
  app.get('/api/v1/protected', requireAuth as any, (req: any, res) =>
    res.json({ success: true, reached: true, userId: req.user?.id ?? null }),
  );
  app.get('/api/v1/public', optionalAuth as any, (req: any, res) =>
    res.json({ success: true, authenticated: !!req.user, userId: req.user?.id ?? null }),
  );
  return app;
}

function makeGuestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth/guest', guestAuthRoutes);
  return app;
}

// ─────────────────────────────────────────────────────
// 1. RETIRE — 발급 경로 부재
// ─────────────────────────────────────────────────────

describe('RETIRE — service login 발급 경로가 존재하지 않는다', () => {
  it('service-auth 라우터 · AuthServiceUserService · ServiceLogin DTO 파일이 없다', () => {
    expect(existsSync(resolve(SRC_ROOT, 'modules/auth/routes/service-auth.routes.ts'))).toBe(false);
    expect(existsSync(resolve(SRC_ROOT, 'services/auth/auth-service-user.service.ts'))).toBe(false);
    expect(existsSync(resolve(SRC_ROOT, 'modules/auth/dto/service-login.dto.ts'))).toBe(false);
  });

  it('register-routes 가 /api/v1/auth/service 를 mount 하지 않는다', () => {
    const src = readFileSync(resolve(SRC_ROOT, 'bootstrap/register-routes.ts'), 'utf8');
    expect(src).not.toMatch(/app\.use\(\s*['"]\/api\/v1\/auth\/service['"]/);
    expect(src).not.toMatch(/service-auth\.routes/);
  });

  it('token.utils 에 service 토큰 발급 함수가 없다', () => {
    const exported = tokenUtils as Record<string, unknown>;
    expect(exported.generateServiceAccessToken).toBeUndefined();
    expect(exported.generateServiceRefreshToken).toBeUndefined();
    expect(exported.generateServiceTokens).toBeUndefined();
    // 사용자 토큰 발급은 그대로 존재한다.
    expect(typeof tokenUtils.generateAccessToken).toBe('function');
  });

  it('[Negative 1] 임의 {id,email} 로 guest → service upgrade 를 시도해도 경로가 없다 (404)', async () => {
    const app = makeGuestApp();
    const res = await request(app)
      .post('/api/v1/auth/guest/upgrade')
      .send({
        guestToken: 'anything',
        credentials: {
          provider: 'google',
          oauthToken: JSON.stringify({ id: 'arbitrary-id', email: 'anyone@test.local' }),
          serviceId: 'kpa-pharmacy',
        },
      });
    expect(res.status).toBe(404);
    expect(res.body?.tokens).toBeUndefined();
  });

  it('[Negative 2] 실재 users.id 를 id 로 제시해도 발급 경로가 없다 (404)', async () => {
    const app = makeGuestApp();
    const res = await request(app)
      .post('/api/v1/auth/guest/upgrade')
      .send({
        guestToken: 'anything',
        credentials: {
          provider: 'google',
          oauthToken: JSON.stringify({ id: EXISTING_USER_ID, email: existingUser.email }),
          serviceId: 'kpa-pharmacy',
        },
      });
    expect(res.status).toBe(404);
    expect(res.body?.tokens).toBeUndefined();
  });

  it('guest 토큰 발급(/issue) 자체는 그대로 mount 되어 있다 (범위 밖 · 회귀 없음)', async () => {
    const app = makeGuestApp();
    const res = await request(app)
      .post('/api/v1/auth/guest/issue')
      .send({ serviceId: 'kpa-pharmacy', entryType: 'qr' });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 2. requireAuth — 사람 사용자 토큰만 통과
// ─────────────────────────────────────────────────────

describe('requireAuth — tokenType 경계', () => {
  it('[Negative 2·4] jwtSecret 으로 올바르게 서명된 service 토큰이라도 (userId = 실재 users.id) 401', async () => {
    const app = makeGuardedApp();
    const res = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${forgedServiceToken()}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_TYPE_NOT_ALLOWED');
    expect(res.body.reached).toBeUndefined();
  });

  it('[Negative 4] guest 토큰도 requireAuth 를 통과하지 못한다', async () => {
    const app = makeGuardedApp();
    const token = signWithAccessSecret({
      userId: EXISTING_USER_ID,
      sub: EXISTING_USER_ID,
      tokenType: 'guest',
      guestSessionId: 'guest_x',
    });
    const res = await request(app).get('/api/v1/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_TYPE_NOT_ALLOWED');
  });

  it('[Negative 3] 변조된 service 토큰(다른 secret 서명)은 서명 단계에서 401', async () => {
    const app = makeGuardedApp();
    const res = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${forgedServiceToken('wrong-secret')}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('[Negative 3] service 토큰의 tokenType 을 user 로 바꿔치기해도 서명이 깨져 401', async () => {
    const app = makeGuardedApp();
    const [h, p, s] = forgedServiceToken().split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    payload.tokenType = 'user';
    const tampered = `${h}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${s}`;
    const res = await request(app).get('/api/v1/protected').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('[Negative 5 · 회귀] generateAccessToken 으로 발급한 사용자 토큰은 통과한다', async () => {
    const app = makeGuardedApp();
    const token = tokenUtils.generateAccessToken(existingUser as any, ['user']);
    const res = await request(app).get('/api/v1/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.reached).toBe(true);
    expect(res.body.userId).toBe(EXISTING_USER_ID);
  });

  it('[회귀] tokenType 이 없는 구형 사용자 토큰은 기존 규약대로 사용자 토큰으로 취급한다', async () => {
    const app = makeGuardedApp();
    const token = signWithAccessSecret({ userId: EXISTING_USER_ID, sub: EXISTING_USER_ID, role: 'user' });
    const res = await request(app).get('/api/v1/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.reached).toBe(true);
  });
});

describe('optionalAuth — service 토큰은 비로그인 취급', () => {
  it('service 토큰으로 공개 경로에 접근하면 req.user 가 붙지 않는다', async () => {
    const app = makeGuardedApp();
    const res = await request(app)
      .get('/api/v1/public')
      .set('Authorization', `Bearer ${forgedServiceToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
  });

  it('[회귀] 사용자 토큰은 req.user 가 붙는다', async () => {
    const app = makeGuardedApp();
    const token = tokenUtils.generateAccessToken(existingUser as any, ['user']);
    const res = await request(app).get('/api/v1/public').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.userId).toBe(EXISTING_USER_ID);
  });
});

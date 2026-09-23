/**
 * PR #225 merge-gate 11차 P1 — LMS rate limiter 는 인증 뒤에 실행된다.
 *
 * 배경: CodeQL js/missing-rate-limiting 대응으로 `router.use(apiLimiter)` 를 LMS 라우터
 * 최상단에 걸었는데, 그 시점에는 `req.user` 가 없어 키가 항상 `${ip}:anonymous` 였다.
 * 같은 NAT/사무실 IP 뒤의 모든 사용자가 분당 60 요청 한 통을 공유하게 된다.
 *
 * 그렇다고 인증 미들웨어 자체를 무제한으로 둘 수도 없다(CodeQL js/missing-rate-limiting 은
 * "authorization 을 수행하는 handler 앞"에 limiter 를 요구한다). 그래서 두 겹으로 둔다.
 *
 * 계약
 * - 인증 경로: `ipBurstLimiter → requireAuth|optionalAuth → apiLimiter → guard → controller`.
 *   ① `ipBurstLimiter` = 인증 앞, IP 단위 **상한**(분당 600 · 1인 할당량 아님) — 미인증 폭주 차단.
 *   ② `apiLimiter`     = 인증 뒤, `${ip}:${userId}` 단위 **사용자 할당량**(분당 60).
 *   limiter ② 가 실행될 때 `req.user` 가 이미 있어야 하고, 키는 userId 로 분리된다.
 * - 공개 경로(인증 없음): `apiLimiter → controller` — IP 단위 제한을 그대로 유지한다.
 * - invalid token 은 사용자 버킷을 만들지 못한다(인증 실패 → anonymous IP 버킷).
 * - Auth Core 는 수정하지 않는다. 새 JWT decode/hash 기반 인증 로직을 만들지 않는다.
 */
import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { apiLimiter, ipBurstLimiter } from '../middleware/rateLimiter.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const routes = fs.readFileSync(
  path.join(REPO_ROOT, 'apps/api-server/src/modules/lms/routes/lms.routes.ts'),
  'utf8'
);

/** lms.routes.ts 의 라우트 등록 줄만 추출 (router.get/post/patch/put/delete). */
function routeLines(): string[] {
  return routes
    .split('\n')
    .filter((l) => /^router\.(get|post|patch|put|delete)\(/.test(l.trim()));
}

describe('11차 P1 정적 계약 — apiLimiter 위치', () => {
  it('라우터 전역 apiLimiter 는 없다 (인증 전 실행 금지)', () => {
    expect(routes).not.toContain('router.use(apiLimiter)');
  });

  it('모든 LMS 라우트는 apiLimiter 를 거친다 (CodeQL js/missing-rate-limiting 유지)', () => {
    const lines = routeLines();
    expect(lines.length).toBeGreaterThan(50);
    const missing = lines.filter((l) => !l.includes('apiLimiter'));
    expect(missing).toEqual([]);
  });

  it('인증이 있는 라우트에서는 apiLimiter 가 인증 뒤에 온다', () => {
    const offenders = routeLines().filter((l) => {
      const auth = Math.max(l.indexOf('requireAuth'), l.indexOf('optionalAuth'));
      if (auth < 0) return false; // 공개 라우트는 다음 테스트에서 본다
      return l.indexOf('apiLimiter') < auth;
    });
    expect(offenders).toEqual([]);
  });

  it('인증이 있는 라우트는 인증 **앞**에도 IP 상한(ipBurstLimiter)을 둔다', () => {
    // CodeQL js/missing-rate-limiting: authorization 을 수행하는 handler 앞에 limiter 가 있어야 한다.
    const offenders = routeLines().filter((l) => {
      const auth = Math.max(l.indexOf('requireAuth'), l.indexOf('optionalAuth'));
      if (auth < 0) return false;
      const burst = l.indexOf('ipBurstLimiter');
      return burst < 0 || burst > auth;
    });
    expect(offenders).toEqual([]);
  });

  it('두 limiter 는 서로 다른 축이다 — 상한(IP) 과 할당량(user) 을 섞지 않는다', () => {
    const src = fs.readFileSync(
      path.join(REPO_ROOT, 'apps/api-server/src/middleware/rateLimiter.ts'),
      'utf8'
    );
    // ipBurstLimiter 키에는 userId 가 들어가지 않는다 (인증 앞이라 존재하지도 않는다)
    const burst = src.slice(src.indexOf('export const ipBurstLimiter'));
    const burstBody = burst.slice(0, burst.indexOf('});') + 3);
    expect(burstBody).toContain('keyGenerator: (req: Request) => getTrustedClientIp(req)');
    expect(burstBody).not.toContain('user?.id');
    // apiLimiter 키에는 userId 가 들어간다
    const api = src.slice(src.indexOf('export const apiLimiter'));
    expect(api.slice(0, api.indexOf('});') + 3)).toContain('user?.id');
  });

  it('공개 라우트(인증 없음)도 apiLimiter 로 IP 단위 제한을 유지한다', () => {
    const publicLines = routeLines().filter(
      (l) => !l.includes('requireAuth') && !l.includes('optionalAuth')
    );
    expect(publicLines.length).toBeGreaterThan(0);
    for (const l of publicLines) {
      expect(l).toContain('apiLimiter');
    }
  });

  it('role/membership guard 는 limiter 뒤에 온다 (인증 → 제한 → 권한)', () => {
    const offenders = routeLines().filter((l) => {
      const limiter = l.indexOf('apiLimiter');
      if (limiter < 0) return true;
      for (const guard of ['requireLectureOperator', 'requireLectureAdmin', 'requireLectureLearner', 'requireInstructor', 'requireEnrollment(']) {
        const g = l.indexOf(guard);
        if (g >= 0 && g < limiter) return true;
      }
      return false;
    });
    expect(offenders).toEqual([]);
  });
});

describe('11차 P1 동작 — 키는 (ip, userId) 로 분리된다', () => {
  const IP = '203.0.113.77';

  /** 인증 미들웨어가 앞선 실제 순서를 재현한 최소 앱 (Auth Core 수정 없음). */
  function makeApp(resolveUser: (req: any) => { id: string } | undefined) {
    const app = express();
    app.set('trust proxy', 2);
    app.use((req, _res, next) => {
      const user = resolveUser(req);
      if (user) (req as any).user = user;
      next();
    });
    app.use(apiLimiter);
    app.get('/x', (req, res) => res.json({ ok: true, seenUser: (req as any).user?.id ?? null }));
    return app;
  }

  async function hit(app: express.Express, userHeader?: string) {
    const r = request(app).get('/x').set('X-Forwarded-For', `${IP}, 10.0.0.1`);
    if (userHeader) r.set('x-test-user', userHeader);
    return r;
  }

  const app = makeApp((req) => {
    const h = req.headers['x-test-user'];
    // invalid token 은 사용자를 만들지 못한다 — anonymous 로 떨어진다.
    return typeof h === 'string' && h.startsWith('valid:') ? { id: h.slice(6) } : undefined;
  });

  it('같은 IP 의 서로 다른 사용자는 서로의 한도를 소모하지 않는다', async () => {
    for (let i = 0; i < 60; i++) {
      const res = await hit(app, 'valid:userA');
      expect(res.status).toBe(200);
    }
    // userA 는 소진
    expect((await hit(app, 'valid:userA')).status).toBe(429);
    // userB 는 같은 IP 라도 영향 없음
    const b = await hit(app, 'valid:userB');
    expect(b.status).toBe(200);
    expect(b.body.seenUser).toBe('userB');
  });

  it('limiter 가 실행될 때 req.user 가 이미 있다 (인증 뒤 실행)', async () => {
    const res = await hit(app, 'valid:userB');
    expect(res.status).toBe(200);
    expect(res.body.seenUser).toBe('userB');
  });

  it('익명 요청은 같은 IP 버킷을 공유하고, invalid token 으로 개인 버킷을 만들 수 없다', async () => {
    // anonymous 로 소진시킨 뒤, 위조 토큰(인증 실패) 요청도 같은 버킷이라 통과하지 못한다.
    for (let i = 0; i < 60; i++) {
      const res = await hit(app);
      expect(res.status).toBe(200);
    }
    expect((await hit(app)).status).toBe(429);
    expect((await hit(app, 'forged:whoever')).status).toBe(429);
    // 정상 인증 사용자는 별도 버킷이므로 영향 없음
    expect((await hit(app, 'valid:userC')).status).toBe(200);
  });
});

describe('11차 P1 동작 — 인증 앞 IP 상한은 사용자를 구분하지 않는다', () => {
  it('ipBurstLimiter 는 req.user 가 없어도(인증 전) IP 만으로 동작한다', async () => {
    const app = express();
    app.set('trust proxy', 2);
    app.use(ipBurstLimiter);              // 인증 앞
    app.get('/x', (req, res) => res.json({ user: (req as any).user?.id ?? null }));
    const res = await request(app).get('/x').set('X-Forwarded-For', '198.51.100.9, 10.0.0.1');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();     // 인증 전이므로 사용자는 없다
    expect(res.headers['ratelimit-limit']).toBe('600'); // 1인 할당량(60)이 아니라 IP 상한
  });

  // Codex P2(lms.routes.ts:64): 실제 requireAuth 는 토큰이 없거나 만료면 next() 없이 401 을 돌려준다.
  // 그래서 인증 실패 트래픽은 apiLimiter 에 도달하지 못한다 — 그 트래픽을 세는 것이 ipBurstLimiter 의 역할이다.
  it('인증이 401 로 끊겨도(next() 호출 없음) IP 상한은 이미 소비된다', async () => {
    const app = express();
    app.set('trust proxy', 2);
    app.use(ipBurstLimiter);                                   // 인증 앞
    app.use((_req, res) => res.status(401).json({ error: 'AUTH_REQUIRED' })); // next() 하지 않는 인증 실패
    const ip = '198.51.100.21, 10.0.0.1';
    const first = await request(app).get('/x').set('X-Forwarded-For', ip);
    expect(first.status).toBe(401);
    const firstRemaining = Number(first.headers['ratelimit-remaining']);
    const second = await request(app).get('/x').set('X-Forwarded-For', ip);
    expect(second.status).toBe(401);
    // 401 로 끝난 요청도 버킷을 소모한다 (JWT 검증 flooding 이 무제한이 아니다)
    expect(Number(second.headers['ratelimit-remaining'])).toBe(firstRemaining - 1);
  });
});

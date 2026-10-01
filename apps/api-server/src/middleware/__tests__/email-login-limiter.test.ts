/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-1 — 이메일 로그인 "`strictLimiter` 축" 횟수 제한.
 *
 * 계약: 신뢰 클라이언트 IP 기준 · 15분 · **실패 5회** · 성공 로그인은 세지 않는다.
 * 실패 = 응답 status ≥ 400. 성공은 앞선 실패를 지우지 않는다(창이 끝날 때까지 유지 — `strictLimiter` 와 같은 정책).
 */
import express from 'express';
import request from 'supertest';
import { createEmailLoginLimiter, strictLimiter } from '../rateLimiter.js';

const GOOD = { email: 'user@example.com', password: 'right-pass1!' };
const BAD = { email: 'user@example.com', password: 'wrong' };

function app() {
  const limiter = createEmailLoginLimiter();
  // login handler 대역 — 맞는 비밀번호만 200, 나머지는 일반화된 401
  const handler = jest.fn((req: express.Request, res: express.Response) => {
    if (req.body?.password === GOOD.password) return res.status(200).json({ success: true, data: { ok: true } });
    return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.', code: 'INVALID_CREDENTIALS' });
  });
  const google = jest.fn((_req: express.Request, res: express.Response) => res.status(401).json({ success: false }));
  const a = express();
  a.set('trust proxy', true); // 테스트에서 X-Forwarded-For 로 클라이언트 IP 를 바꾼다
  a.use(express.json());
  a.post('/email/login', limiter, handler);
  a.post('/google/login', google); // 실제 라우트와 같이 limiter 없음
  return { a, handler, google };
}

const post = (a: express.Express, ip: string, body: object, path = '/email/login') =>
  request(a).post(path).set('X-Forwarded-For', ip).send(body);

describe('이메일 로그인 횟수 제한 — 15분 실패 5회', () => {
  it('설정이 `strictLimiter` 축과 같다 (15분 · 5회)', async () => {
    const { a } = app();
    const res = await post(a, '10.1.0.1', BAD);
    expect(res.headers['ratelimit-limit']).toBe('5');
    expect(Number(res.headers['ratelimit-reset'])).toBeLessThanOrEqual(15 * 60);
    expect(Number(res.headers['ratelimit-reset'])).toBeGreaterThan(14 * 60);
    expect(typeof strictLimiter).toBe('function');
  });

  it('동일 IP: 실패 5회 다음 요청은 429 (맞는 비밀번호여도 차단)', async () => {
    const { a, handler } = app();
    for (let i = 0; i < 5; i += 1) expect((await post(a, '10.1.1.1', BAD)).status).toBe(401);
    const blocked = await post(a, '10.1.1.1', BAD);
    expect([blocked.status, blocked.body.success, blocked.body.code]).toEqual([429, false, 'RATE_LIMITED']);
    expect((await post(a, '10.1.1.1', GOOD)).status).toBe(429);
    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('성공 로그인은 실패 카운트에 포함되지 않는다', async () => {
    const { a } = app();
    for (let i = 0; i < 10; i += 1) expect((await post(a, '10.1.2.1', GOOD)).status).toBe(200);
    // 성공 10회 뒤에도 실패 5회가 그대로 허용된다
    for (let i = 0; i < 5; i += 1) expect((await post(a, '10.1.2.1', BAD)).status).toBe(401);
    expect((await post(a, '10.1.2.1', BAD)).status).toBe(429);
  });

  it('성공은 앞선 실패를 지우지 않는다 (창 안에서 유지 — strictLimiter 정책)', async () => {
    const { a } = app();
    for (let i = 0; i < 4; i += 1) expect((await post(a, '10.1.3.1', BAD)).status).toBe(401);
    expect((await post(a, '10.1.3.1', GOOD)).status).toBe(200);
    expect((await post(a, '10.1.3.1', BAD)).status).toBe(401); // 실패 5번째
    expect((await post(a, '10.1.3.1', GOOD)).status).toBe(429);
  });

  it('다른 IP 는 카운트를 공유하지 않는다', async () => {
    const { a } = app();
    for (let i = 0; i < 5; i += 1) await post(a, '10.1.4.1', BAD);
    expect((await post(a, '10.1.4.1', BAD)).status).toBe(429);
    expect((await post(a, '10.1.4.2', BAD)).status).toBe(401);
    expect((await post(a, '10.1.4.2', GOOD)).status).toBe(200);
  });

  it('Google 로그인 경로에는 영향이 없다', async () => {
    const { a, google } = app();
    for (let i = 0; i < 6; i += 1) await post(a, '10.1.5.1', BAD);
    expect((await post(a, '10.1.5.1', BAD)).status).toBe(429);
    for (let i = 0; i < 8; i += 1) expect((await post(a, '10.1.5.1', {}, '/google/login')).status).toBe(401);
    expect(google).toHaveBeenCalledTimes(8);
  });
});

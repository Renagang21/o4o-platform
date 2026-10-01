/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 — CodeQL `js/missing-token-validation` 보완.
 *
 * 이메일·비밀번호 route 는 JSON 본문만 받는다. 교차 사이트 HTML form(urlencoded · multipart · text/plain)은
 * preflight 없이 쿠키를 실어 보낼 수 있으므로 handler 에 닿기 전에 415 로 끝나야 한다.
 */
import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { requireJsonBody } from '../require-json-body.middleware.js';

function app() {
  const handler = jest.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
  const a = express();
  a.use(express.json());
  a.use(express.urlencoded({ extended: true }));
  a.use(express.text());
  a.post('/t', requireJsonBody, handler);
  return { a, handler };
}

describe('requireJsonBody', () => {
  it('application/json → 통과', async () => {
    const { a, handler } = app();
    const res = await request(a).post('/t').send({ newPassword: 'x' });
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['urlencoded form', 'application/x-www-form-urlencoded', 'newPassword=x'],
    ['text/plain form', 'text/plain', '{"newPassword":"x"}'],
    ['multipart form', 'multipart/form-data; boundary=b', '--b\r\nContent-Disposition: form-data; name="newPassword"\r\n\r\nx\r\n--b--\r\n'],
  ])('%s → 415 · handler 미실행', async (_label, type, body) => {
    const { a, handler } = app();
    const res = await request(a).post('/t').set('Content-Type', type).send(body);
    expect([res.status, res.body.code]).toEqual([415, 'UNSUPPORTED_MEDIA_TYPE']);
    expect(handler).not.toHaveBeenCalled();
  });

  it('본문 없음 → 415', async () => {
    const { a, handler } = app();
    const res = await request(a).post('/t');
    expect(res.status).toBe(415);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('auth.routes — 이메일·비밀번호 route 8개 모두 requireJsonBody 선적용', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../modules/auth/routes/auth.routes.ts'), 'utf8');

  it.each([
    '/email/signup',
    '/email/verify',
    '/email/resend',
    '/email/login',
    '/password/forgot',
    '/password/reset',
    '/account/find-id',
  ])('%s', (route) => {
    expect(src).toContain(`router.post('${route}', requireJsonBody, `);
  });

  it('/password — requireAuth 보다 먼저', () => {
    expect(src).toMatch(/'\/password',\s*requireJsonBody,\s*requireAuth,/);
  });
});

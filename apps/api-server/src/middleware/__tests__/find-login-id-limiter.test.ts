/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-3 — 아이디 찾기 "IP · 입력값 기준" 횟수 제한.
 *
 * IP limiter(1시간 10회)와 입력값 limiter(이름·전화 조합당 1시간 5회)는 독립 적용된다.
 * 여러 IP 로 같은 조합을 반복해도, 한 IP 에서 여러 조합을 반복해도 막혀야 한다.
 * 계정 존재 여부와 무관하게 세므로 429 발생이 가입 단서가 되지 않는다.
 */
import express from 'express';
import request from 'supertest';
import { createFindLoginIdLimiters, findLoginIdInputKey } from '../rateLimiter.js';

const FOUND = { name: '홍길동', phone: '01012345678' };

function app() {
  const { ip, input } = createFindLoginIdLimiters();
  // find-id handler 대역 — FOUND 조합만 힌트, 나머지는 일반 안내 (응답 계약은 그대로)
  const handler = jest.fn((req: express.Request, res: express.Response) => {
    const hit = req.body?.name === FOUND.name && String(req.body?.phone).replace(/\D/g, '') === FOUND.phone;
    res.status(200).json({ success: true, data: hit ? { found: true, maskedEmail: 'h***@e***.com' } : { found: false, maskedEmail: null } });
  });
  const a = express();
  a.set('trust proxy', true); // 테스트에서 X-Forwarded-For 로 클라이언트 IP 를 바꾼다
  a.use(express.json());
  a.post('/find-id', ip, input, handler);
  return { a, handler };
}

const post = (a: express.Express, ip: string, body: object) =>
  request(a).post('/find-id').set('X-Forwarded-For', ip).send(body);

describe('아이디 찾기 횟수 제한 — IP · 입력값', () => {
  it('동일 IP + 동일 입력: 입력값 한도(5) 다음 요청은 429', async () => {
    const { a } = app();
    for (let i = 0; i < 5; i += 1) expect((await post(a, '10.0.0.1', FOUND)).status).toBe(200);
    const res = await post(a, '10.0.0.1', FOUND);
    expect([res.status, res.body.code]).toEqual([429, 'RATE_LIMITED']);
  });

  it('다른 IP + 동일 입력: IP 를 바꿔도 같은 조합은 입력값 한도로 막힌다', async () => {
    const { a, handler } = app();
    for (let i = 0; i < 5; i += 1) expect((await post(a, `10.0.1.${i}`, FOUND)).status).toBe(200);
    const res = await post(a, '10.0.1.99', FOUND);
    expect([res.status, res.body.code]).toEqual([429, 'RATE_LIMITED']);
    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('동일 IP + 다른 입력: 조합을 바꿔도 IP 한도(10)로 막힌다', async () => {
    const { a, handler } = app();
    for (let i = 0; i < 10; i += 1) {
      expect((await post(a, '10.0.2.1', { name: `사람${i}`, phone: `0101111${String(i).padStart(4, '0')}` })).status).toBe(200);
    }
    const res = await post(a, '10.0.2.1', { name: '사람99', phone: '01022223333' });
    expect([res.status, res.body.code]).toEqual([429, 'RATE_LIMITED']);
    expect(handler).toHaveBeenCalledTimes(10);
  });

  it('계정 유무와 무관하게 같은 횟수에서 막힌다 (429 가 가입 단서가 되지 않음)', async () => {
    const { a } = app();
    const MISS = { name: '없는사람', phone: '01099998888' };
    const statuses = async (body: object) => {
      const out: number[] = [];
      for (let i = 0; i < 6; i += 1) out.push((await post(a, `10.0.3.${i}`, body)).status);
      return out;
    };
    expect(await statuses(FOUND)).toEqual(await statuses(MISS));
  });

  it('정규화 전후 같은 조회가 되는 입력은 같은 키 (이름 trim · 전화 숫자만)', async () => {
    expect(findLoginIdInputKey({ name: '  홍길동 ', phone: '010-1234-5678' })).toBe(findLoginIdInputKey(FOUND));
    expect(findLoginIdInputKey({ name: '홍길동', phone: '010 1234 5678' })).toBe(findLoginIdInputKey(FOUND));
    expect(findLoginIdInputKey({ name: '홍길순', phone: '01012345678' })).not.toBe(findLoginIdInputKey(FOUND));

    const { a } = app();
    const variants = [FOUND, { name: ' 홍길동', phone: '010-1234-5678' }, { name: '홍길동 ', phone: '010.1234.5678' }];
    for (let i = 0; i < 5; i += 1) expect((await post(a, `10.0.4.${i}`, variants[i % 3])).status).toBe(200);
    expect((await post(a, '10.0.4.99', variants[1])).status).toBe(429);
  });

  it('limiter 키에 원문 이름 · 전화번호가 남지 않는다 (sha256 hex 만)', () => {
    const key = findLoginIdInputKey({ name: '홍길동', phone: '010-1234-5678' });
    expect(key).toMatch(/^findid:[0-9a-f]{64}$/);
    for (const raw of ['홍길동', '01012345678', '010-1234-5678', '1234', '5678']) expect(key).not.toContain(raw);
  });

  it('형태가 이상한 본문도 예외 없이 키를 만든다', () => {
    expect(findLoginIdInputKey(undefined)).toMatch(/^findid:[0-9a-f]{64}$/);
    expect(findLoginIdInputKey({ name: 1, phone: null })).toBe(findLoginIdInputKey({}));
  });

  it('한도 안에서는 find-id 응답 계약(found / 미발견)이 그대로다', async () => {
    const { a } = app();
    const hit = await post(a, '10.0.5.1', FOUND);
    expect(hit.body).toEqual({ success: true, data: { found: true, maskedEmail: 'h***@e***.com' } });
    const miss = await post(a, '10.0.5.1', { name: '없음', phone: '01099998888' });
    expect(miss.body).toEqual({ success: true, data: { found: false, maskedEmail: null } });
  });
});

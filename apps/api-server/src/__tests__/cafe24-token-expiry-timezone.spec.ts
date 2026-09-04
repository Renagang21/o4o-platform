/**
 * WO-O4O-CAFE24-TOKEN-EXPIRY-TIMEZONE-FIX-V1
 *
 * Cafe24 는 만료시각을 offset 없는 KST 벽시계 문자열로 준다.
 * `new Date(...)` 로 그대로 파싱하면 실행 호스트 시간대에 따라 값이 달라지고,
 * UTC 호스트(Cloud Run)에서는 9시간 뒤로 저장돼 죽은 토큰을 계속 쓰게 된다.
 *
 * 이 spec 은 두 가지를 고정한다.
 *   1. 파싱은 호스트 시간대와 무관하게 KST 기준이다.
 *   2. 이미 밀려 저장된 행은 저장값을 믿지 않고 refresh 경로로 간다 (migration 없이 자가복구).
 */

import { parseCafe24Timestamp } from '../modules/cafe24/cafe24-oauth.client.js';
import { Cafe24ConnectionService } from '../modules/cafe24/services/cafe24-connection.service.js';
import type { Cafe24Connection } from '../modules/cafe24/entities/Cafe24Connection.entity.js';

describe('parseCafe24Timestamp', () => {
  it('offset 이 없으면 KST 로 해석한다 (호스트 시간대 무관)', () => {
    // 2026-09-04 15:34:52 KST = 06:34:52 UTC
    expect(parseCafe24Timestamp('2026-09-04T15:34:52.000').toISOString()).toBe('2026-09-04T06:34:52.000Z');
  });

  it('공백 구분 형식도 같은 규칙으로 해석한다', () => {
    expect(parseCafe24Timestamp('2026-09-04 15:34:52').toISOString()).toBe('2026-09-04T06:34:52.000Z');
  });

  it('offset 이 명시돼 있으면 그대로 신뢰한다', () => {
    expect(parseCafe24Timestamp('2026-09-04T06:34:52.000Z').toISOString()).toBe('2026-09-04T06:34:52.000Z');
    expect(parseCafe24Timestamp('2026-09-04T15:34:52+09:00').toISOString()).toBe('2026-09-04T06:34:52.000Z');
  });

  it('회귀 방지 — 결함이 있던 new Date() 해석과 값이 갈린다', () => {
    // UTC 호스트에서 new Date('...15:34:52.000') 는 15:34:52Z 로 읽혀 9시간 밀린다.
    const naive = new Date('2026-09-04T15:34:52.000Z').getTime();
    expect(parseCafe24Timestamp('2026-09-04T15:34:52.000').getTime()).toBe(naive - 9 * 3600 * 1000);
  });

  it('빈 값·해석 불가 값은 조용히 통과시키지 않는다', () => {
    expect(() => parseCafe24Timestamp('')).toThrow('CAFE24_INVALID_TIMESTAMP');
    expect(() => parseCafe24Timestamp('not-a-date')).toThrow('CAFE24_INVALID_TIMESTAMP');
  });
});

describe('getUsableAccessToken — 저장된 만료시각 신뢰 상한', () => {
  function makeService(conn: Partial<Cafe24Connection>) {
    const repo = { update: jest.fn(async () => undefined), find: jest.fn(), findOne: jest.fn() };
    const svc = new Cafe24ConnectionService({ getRepository: () => repo } as never);
    return { svc, repo, conn: conn as Cafe24Connection };
  }

  const base = {
    id: 'c-1',
    mallId: 'testmall',
    shopNo: 1,
    status: 'ACTIVE' as const,
    accessTokenEnc: 'enc',
    refreshTokenEnc: 'enc',
    scopes: ['mall.read_product'],
  };

  it('access 만료가 3시간 상한을 넘으면 저장값을 믿지 않고 refresh 경로로 간다', async () => {
    // 결함으로 +9h 밀려 저장된 행. refresh token 은 이미 만료시켜 refresh 진입을 관측한다.
    const { svc, conn, repo } = makeService({
      ...base,
      accessTokenExpiresAt: new Date(Date.now() + 8.5 * 3600 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() - 1000),
    });
    await expect(svc.getUsableAccessToken(conn)).rejects.toThrow('CAFE24_REFRESH_TOKEN_EXPIRED');
    expect(repo.update).toHaveBeenCalled();
  });

  it('정상 수명(2시간) 범위의 만료시각은 그대로 신뢰해 refresh 하지 않는다', async () => {
    const { svc, conn, repo } = makeService({
      ...base,
      accessTokenExpiresAt: new Date(Date.now() + 2 * 3600 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() - 1000),
    });
    // refresh 로 갔다면 refresh token 만료로 CAFE24_REFRESH_TOKEN_EXPIRED 가 났을 것이다.
    // 여기서는 decrypt 단계로 넘어가므로(테스트 더미 ciphertext 라 성패는 무관) 그 에러가 아니어야 한다.
    let err: unknown = null;
    try {
      await svc.getUsableAccessToken(conn);
    } catch (e) {
      err = e;
    }
    expect(err instanceof Error ? err.message : '').not.toBe('CAFE24_REFRESH_TOKEN_EXPIRED');
    expect(repo.update).not.toHaveBeenCalled();
  });
});

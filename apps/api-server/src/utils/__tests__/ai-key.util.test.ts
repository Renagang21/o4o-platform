/**
 * resolveAiApiKey — unit tests
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-QUOTA-RECOVERY-AND-RETRY-GATE-V1 §6.2
 *
 * 운영 실측 컬럼("apiKey"/"isEnabled")에 맞춘 조회 + env fallback 검증.
 */

import { resolveAiApiKey } from '../ai-key.util';
import type { DataSource } from 'typeorm';

function mockDs(queryImpl: (sql: string, params: any[]) => Promise<any[]>): DataSource {
  return { isInitialized: true, query: queryImpl } as unknown as DataSource;
}

describe('resolveAiApiKey', () => {
  const OLD = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (OLD === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = OLD;
  });

  it('DB key 존재 + enabled → DB key 사용(env 보다 우선)', async () => {
    process.env.GEMINI_API_KEY = 'ENV_KEY';
    const ds = mockDs(async (sql) => {
      // 운영 실측 컬럼명 확인: "isEnabled" 사용, "apiKey" 반환
      expect(sql).toContain('"isEnabled"');
      expect(sql).toContain('"apiKey"');
      return [{ apiKey: 'DB_KEY' }];
    });
    expect(await resolveAiApiKey(ds, 'gemini')).toBe('DB_KEY');
  });

  it('DB key 없음(빈 결과) → env fallback', async () => {
    process.env.GEMINI_API_KEY = 'ENV_KEY';
    const ds = mockDs(async () => []);
    expect(await resolveAiApiKey(ds, 'gemini')).toBe('ENV_KEY');
  });

  it('DB 조회 예외(컬럼 없음 등) → env fallback', async () => {
    process.env.GEMINI_API_KEY = 'ENV_KEY';
    const ds = mockDs(async () => { throw new Error('column does not exist'); });
    expect(await resolveAiApiKey(ds, 'gemini')).toBe('ENV_KEY');
  });

  it('DB key 없음 + env 없음 → 빈 문자열', async () => {
    delete process.env.GEMINI_API_KEY;
    const ds = mockDs(async () => []);
    expect(await resolveAiApiKey(ds, 'gemini')).toBe('');
  });

  it('미지원 provider + DB 없음 → 빈 문자열', async () => {
    const ds = mockDs(async () => []);
    expect(await resolveAiApiKey(ds, 'unknown_provider')).toBe('');
  });

  it('DataSource 미초기화 → env fallback', async () => {
    process.env.GEMINI_API_KEY = 'ENV_KEY';
    const ds = { isInitialized: false, query: async () => { throw new Error('should not query'); } } as unknown as DataSource;
    expect(await resolveAiApiKey(ds, 'gemini')).toBe('ENV_KEY');
  });
});

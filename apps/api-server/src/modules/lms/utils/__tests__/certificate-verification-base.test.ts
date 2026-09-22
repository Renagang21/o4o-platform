/**
 * 검증 링크 base URL 결정 계약 고정.
 *
 * WO-O4O-KCOSMETICS-CERTIFICATE-VERIFICATION-DOMAIN-FALLBACK-FIX-V1 §7 의 서비스별 분기 계약은
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §17 로 대체됐다:
 * 수료증 검증 화면은 Lecture(study.neture.co.kr) 단일 소유 · KPA fallback 없음.
 */
import { resolveVerificationBase } from '../certificate-verification-base';

const ENV_KEYS = [
  'LECTURE_FRONTEND_URL',
  'KCOSMETICS_FRONTEND_URL',
  'KPA_FRONTEND_URL',
  'PHARMACY_HUB_FRONTEND_URL',
  'FRONTEND_URL',
] as const;

describe('resolveVerificationBase — 수료증 검증 링크 base URL 계약 (Lecture 단일)', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      original[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k] as string;
    }
  });

  it('case 1: lecture 는 study.neture.co.kr 로 떨어진다', () => {
    expect(resolveVerificationBase('lecture')).toBe('https://study.neture.co.kr');
  });

  it('case 2: LECTURE_FRONTEND_URL 이 설정되면 그 값을 쓴다', () => {
    process.env.LECTURE_FRONTEND_URL = 'https://study.example';
    expect(resolveVerificationBase('lecture')).toBe('https://study.example');
    expect(resolveVerificationBase(null)).toBe('https://study.example');
  });

  it('case 3: legacy serviceKey / null / unknown 도 KPA 등 다른 서비스 도메인으로 새지 않는다 (§17 KPA fallback 없음)', () => {
    for (const key of ['kpa-society', 'k-cosmetics', 'pharmacy-hub', 'unknown-service', null, undefined]) {
      const base = resolveVerificationBase(key);
      expect(base).toBe('https://study.neture.co.kr');
      expect(base).not.toContain('kpa-society');
      expect(base).not.toContain('k-cosmetics');
      expect(base).not.toContain('pharmacyhub');
    }
  });

  it('case 4: 다른 서비스 env(FRONTEND_URL · KPA_FRONTEND_URL …) 는 검증 링크에 영향을 주지 않는다', () => {
    process.env.FRONTEND_URL = 'https://generic.example';
    process.env.KPA_FRONTEND_URL = 'https://kpa.example';
    process.env.KCOSMETICS_FRONTEND_URL = 'https://kcos.example';
    process.env.PHARMACY_HUB_FRONTEND_URL = 'https://ph.example';
    expect(resolveVerificationBase('kpa-society')).toBe('https://study.neture.co.kr');
    expect(resolveVerificationBase('k-cosmetics')).toBe('https://study.neture.co.kr');
  });

  it('case 5: 최종 검증 URL 형태 (path + certificate id) — Lecture 가 `/certificate/verify/:id` 를 받는다', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    const url = `${resolveVerificationBase('lecture')}/certificate/verify/${id}`;
    expect(url).toBe(`https://study.neture.co.kr/certificate/verify/${id}`);
    const parsed = new URL(url);
    expect(parsed.host).toBe('study.neture.co.kr');
    expect(parsed.pathname).toBe(`/certificate/verify/${id}`);
    expect(parsed.search).toBe('');
  });
});

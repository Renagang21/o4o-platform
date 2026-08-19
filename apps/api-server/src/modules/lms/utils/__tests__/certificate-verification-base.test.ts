/**
 * WO-O4O-KCOSMETICS-CERTIFICATE-VERIFICATION-DOMAIN-FALLBACK-FIX-V1 §7
 * 검증 링크 base URL 결정 계약 고정.
 */
import { resolveVerificationBase } from '../certificate-verification-base';

const ENV_KEYS = [
  'KCOSMETICS_FRONTEND_URL',
  'GLYCOPHARM_FRONTEND_URL',
  'KPA_FRONTEND_URL',
  'FRONTEND_URL',
] as const;

describe('resolveVerificationBase — 수료증 검증 링크 base URL 계약', () => {
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

  it('case 1: 서비스별 env 가 설정되면 그 값을 최우선으로 쓴다', () => {
    process.env.KCOSMETICS_FRONTEND_URL = 'https://kcos.example';
    process.env.FRONTEND_URL = 'https://generic.example';
    expect(resolveVerificationBase('k-cosmetics')).toBe('https://kcos.example');
  });

  it('case 2: 서비스별 env 가 없고 FRONTEND_URL 만 있으면 FRONTEND_URL 을 쓴다', () => {
    process.env.FRONTEND_URL = 'https://generic.example';
    expect(resolveVerificationBase('k-cosmetics')).toBe('https://generic.example');
  });

  it('case 3: env 가 하나도 없으면 k-cosmetics 는 k-cosmetics.site 로 떨어진다', () => {
    expect(resolveVerificationBase('k-cosmetics')).toBe('https://k-cosmetics.site');
    expect(resolveVerificationBase('k-cosmetics')).not.toContain('k-cosmetics.co.kr');
  });

  it('case 4: 다른 서비스 fallback 회귀 없음 (glycopharm / kpa-society / legacy null / unknown)', () => {
    expect(resolveVerificationBase('glycopharm')).toBe('https://glycopharm.co.kr');
    expect(resolveVerificationBase('kpa-society')).toBe('https://kpa-society.co.kr');
    expect(resolveVerificationBase(null)).toBe('https://kpa-society.co.kr');
    expect(resolveVerificationBase(undefined)).toBe('https://kpa-society.co.kr');
    expect(resolveVerificationBase('unknown-service')).toBe('https://kpa-society.co.kr');
  });

  it('case 4-b: 서비스별 env 는 다른 서비스에 새지 않는다', () => {
    process.env.KCOSMETICS_FRONTEND_URL = 'https://kcos.example';
    expect(resolveVerificationBase('glycopharm')).toBe('https://glycopharm.co.kr');
    expect(resolveVerificationBase('kpa-society')).toBe('https://kpa-society.co.kr');
  });

  it('case 5: 최종 검증 URL 형태 (path + certificate id)', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    const url = `${resolveVerificationBase('k-cosmetics')}/certificate/verify/${id}`;
    expect(url).toBe(`https://k-cosmetics.site/certificate/verify/${id}`);
    const parsed = new URL(url);
    expect(parsed.host).toBe('k-cosmetics.site');
    expect(parsed.pathname).toBe(`/certificate/verify/${id}`);
    expect(parsed.search).toBe('');
  });
});

/**
 * Service Catalog canonical 호스트 · 옛 호스트 수용 · Pharmacy-Hub 신규 가입 비노출
 * — WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1
 *
 * 고정하는 것:
 *   ① 생성(Generation)  handoff · QR · 공개 랜딩은 canonical 호스트만 쓴다.
 *   ② 수용(Compatibility) 옛 호스트(인쇄 QR · 북마크)로 들어온 로그인도 같은 서비스 세션으로 판정한다.
 *   ③ Pharmacy-Hub 는 신규 가입 서비스로 제시하지 않지만 카탈로그 · handoff 대상에서 사라지지 않는다.
 *   ④ kpa-branch 는 당시 DEFERRED 였고 WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1 에서
 *      canonical kpa.neture.co.kr(basePath 없음)로 옮겼다 — 아래 마지막 describe.
 * DB · 네트워크 0.
 */
import {
  O4O_SERVICES,
  getService,
  getServiceOrigin,
  getServicePublicOrigin,
  getJoinableServices,
} from '../service-catalog.js';
import { resolveSessionServiceKey } from '../../utils/session-origin.js';
import { buildScreenSetQrUrl } from '../../routes/platform/store-screen-set-qr.service.js';

describe('canonical 호스트 (생성)', () => {
  it.each([
    ['kpa-society', 'pharmacy.neture.co.kr'],
    ['k-cosmetics', 'retail.neture.co.kr'],
  ])('%s → %s', (key, host) => {
    expect(getService(key)?.domain).toBe(host);
    expect(getServiceOrigin(key)).toBe(`https://${host}`);
  });

  it('역할 접두 alias 도 canonical 로 해석한다', () => {
    expect(getServicePublicOrigin('kpa')).toBe('https://pharmacy.neture.co.kr');
    expect(getServicePublicOrigin('cosmetics')).toBe('https://retail.neture.co.kr');
  });

  it('Screen Set QR 도 canonical 호스트로 만든다', () => {
    expect(buildScreenSetQrUrl('kpa', 's1')).toBe('https://pharmacy.neture.co.kr/qr/s1');
    expect(buildScreenSetQrUrl('cosmetics', 's1')).toBe('https://retail.neture.co.kr/qr/s1');
  });

  it('옛 호스트는 생성 경로에 나오지 않는다 (legacyDomains 는 수용 전용)', () => {
    for (const key of ['kpa-society', 'k-cosmetics']) {
      const origin = getServiceOrigin(key) ?? '';
      for (const legacy of getService(key)?.legacyDomains ?? []) {
        expect(origin).not.toContain(legacy);
      }
    }
  });
});

describe('옛 호스트 수용 (session-origin)', () => {
  it.each([
    ['https://pharmacy.neture.co.kr', 'kpa-society'],
    ['https://retail.neture.co.kr', 'k-cosmetics'],
    // 인쇄 QR · 북마크로 들어온 옛 호스트 — 종전 판정 그대로
    ['https://kpa-society.co.kr', 'kpa-society'],
    ['https://k-cosmetics.site', 'k-cosmetics'],
    ['https://pharmacyhub.co.kr', 'pharmacy-hub'],
  ])('%s → %s', (origin, key) => {
    expect(resolveSessionServiceKey(origin)).toBe(key);
  });

  it('kpa-society.co.kr 은 kpa-branch 로 오판정되지 않는다 (호스트 루트는 KPA Society 앱)', () => {
    expect(resolveSessionServiceKey('https://kpa-society.co.kr')).not.toBe('kpa-branch');
  });

  it('옛 호스트는 정확히 두 개만 등록돼 있다 — 새 호스트를 여기에 늘리지 않는다', () => {
    const all = O4O_SERVICES.flatMap((s) => (s.legacyDomains ?? []).map((d) => `${s.key}:${d}`));
    expect(all.sort()).toEqual(['k-cosmetics:k-cosmetics.site', 'kpa-society:kpa-society.co.kr']);
  });
});

describe('Pharmacy-Hub 신규 가입 비노출', () => {
  it('joinEnabled=false · 가입 가능 목록에 없다', () => {
    expect(getService('pharmacy-hub')?.joinEnabled).toBe(false);
    expect(getJoinableServices().map((s) => s.key)).not.toContain('pharmacy-hub');
  });

  it('카탈로그 · handoff 대상 origin 은 그대로다 (기존 회원 진입 보존)', () => {
    expect(getService('pharmacy-hub')).toBeDefined();
    expect(getServiceOrigin('pharmacy-hub')).toBe('https://pharmacyhub.co.kr');
    expect(getService('pharmacy-hub')?.workspace?.storeWorkspaceEnabled).toBe(true);
  });

  it('kpa-society · k-cosmetics 는 여전히 가입 가능하다', () => {
    const keys = getJoinableServices().map((s) => s.key);
    expect(keys).toEqual(expect.arrayContaining(['kpa-society', 'k-cosmetics']));
  });
});

describe('kpa-branch — canonical kpa.neture.co.kr (WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1)', () => {
  it('domain = kpa.neture.co.kr · basePath 없음 · origin 은 host 루트', () => {
    expect(getService('kpa-branch')?.domain).toBe('kpa.neture.co.kr');
    expect(getService('kpa-branch')?.basePath).toBeUndefined();
    expect(getServiceOrigin('kpa-branch')).toBe('https://kpa.neture.co.kr');
  });

  it('kpa.neture.co.kr 로그인 · 로그아웃은 kpa-branch 세션 범위다', () => {
    expect(resolveSessionServiceKey('https://kpa.neture.co.kr')).toBe('kpa-branch');
  });

  it('옛 공용 경로 호스트 kpa-society.co.kr 는 kpa-branch 의 legacyDomains 가 아니다 (호스트 루트 = kpa-society)', () => {
    expect(getService('kpa-branch')?.legacyDomains).toBeUndefined();
    expect(resolveSessionServiceKey('https://kpa-society.co.kr')).toBe('kpa-society');
  });

  it('생성 경로에 옛 분회 경로가 나오지 않는다', () => {
    expect(getServiceOrigin('kpa-branch')).not.toContain('kpa-society.co.kr');
    expect(new URL(getServiceOrigin('kpa-branch')).pathname).toBe('/');
  });

  it('pharmacy.neture.co.kr(kpa-society) 와 kpa.neture.co.kr(kpa-branch) 는 서로 다른 서비스로 판정된다', () => {
    expect(resolveSessionServiceKey('https://pharmacy.neture.co.kr')).toBe('kpa-society');
    expect(resolveSessionServiceKey('https://kpa.neture.co.kr')).toBe('kpa-branch');
    // role prefix 별칭 `kpa` 는 kpa-society 로만 흡수된다 — 분회로 재해석하지 않는다.
    expect(getServicePublicOrigin('kpa')).toBe('https://pharmacy.neture.co.kr');
  });
});

/**
 * QR · 공개 랜딩 호스트는 서비스 카탈로그에서 파생한다 — CHECK-O4O-URL-FIRST-CENSUS-V1 §7-1 · §7-2
 *
 * 파일별 호스트 표가 카탈로그와 어긋나 존재하지 않는 호스트(`cosmetics.neture.co.kr` ·
 * `k-cosmetics.neture.co.kr` · `neture.o4o.kr`)를 QR 에 찍었다. 이 spec 은 파생 결과와
 * 하드코딩 재유입 금지를 고정한다. DB · 네트워크 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getServicePublicOrigin } from '../config/service-catalog.js';
import { buildAffiliateLandingUrl } from '../modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.service.js';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

describe('getServicePublicOrigin — 역할 접두 키 alias 해석', () => {
  it.each([
    ['kpa', 'https://kpa-society.co.kr'],
    ['kpa-society', 'https://kpa-society.co.kr'],
    ['cosmetics', 'https://k-cosmetics.site'],
    ['k-cosmetics', 'https://k-cosmetics.site'],
    ['pharmacy-hub', 'https://pharmacyhub.co.kr'],
    ['neture', 'https://neture.co.kr'],
  ])('%s → %s', (key, origin) => {
    expect(getServicePublicOrigin(key)).toBe(origin);
  });

  it('모르는 키는 undefined', () => {
    expect(getServicePublicOrigin('no-such-service')).toBeUndefined();
  });
});

describe('제휴 QR 랜딩 URL', () => {
  it('cosmetics 는 카탈로그 호스트(k-cosmetics.site)를 쓴다', () => {
    expect(buildAffiliateLandingUrl('cosmetics', 'abc')).toBe('https://k-cosmetics.site/foreign-visitor/affiliate/abc');
  });
  it('kpa · pharmacy-hub 값은 이전과 같다', () => {
    expect(buildAffiliateLandingUrl('kpa', 'x')).toBe('https://kpa-society.co.kr/foreign-visitor/affiliate/x');
    expect(buildAffiliateLandingUrl('pharmacy-hub', 'x')).toBe('https://pharmacyhub.co.kr/foreign-visitor/affiliate/x');
  });
});

describe('존재하지 않는 호스트 하드코딩 재유입 금지', () => {
  const FILES = [
    'routes/o4o-store/controllers/multilingual-product-content.controller.ts',
    'modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.service.ts',
    'modules/neture/services/neture-dashboard.service.ts',
    'modules/neture/neture.routes.ts',
  ];
  it.each(FILES)('%s', (rel) => {
    const src = read(rel)
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(src).not.toContain('cosmetics.neture.co.kr');
    expect(src).not.toContain('neture.o4o.kr');
  });
});

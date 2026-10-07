/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 — 공개 화면 공통 시각 체계 · host 메타 계약
 *
 * 대상 5 앱(neture · pharmacy · store · study · kpa)의 정적 진입 파일을 읽어 확인한다.
 *   - 공통 토큰(public-brand/tokens.css) import
 *   - Pretendard (고정 버전 · dynamic subset) 로드
 *   - favicon 참조 + 실제 파일 존재 (없는 URL 을 넣지 않는다)
 *   - og:url = 서비스 host · og:image 없음 (실제 brand image 미제공)
 * Retail · Hospital 은 대상이 아니다.
 *
 * 실행: 저장소 루트에서 `npx vitest run --config packages/auth-react/vitest.config.mjs`
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

const APPS = [
  { app: 'web-neture', host: 'https://neture.co.kr/', favicon: '/favicon.png' },
  { app: 'web-kpa-society', host: 'https://pharmacy.neture.co.kr/', favicon: '/favicon.png' },
  { app: 'web-store', host: 'https://store.neture.co.kr/', favicon: '/favicon.svg' },
  { app: 'web-lecture', host: 'https://study.neture.co.kr/', favicon: '/favicon.svg' },
  { app: 'web-kpa-branch', host: 'https://kpa.neture.co.kr/', favicon: '/favicon.svg' },
] as const;

const PRETENDARD = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

describe.each(APPS)('$app — 공개 브랜드 진입 파일', ({ app, host, favicon }) => {
  const html = read(`services/${app}/index.html`);
  const css = read(`services/${app}/src/index.css`);

  it('공통 토큰을 import 한다', () => {
    expect(css).toContain("@import '../../../packages/auth-react/src/public-brand/tokens.css';");
  });

  it('Pretendard 를 고정 버전 dynamic subset 으로 로드한다', () => {
    expect(html).toContain(PRETENDARD);
  });

  it('favicon 을 참조하고 그 파일이 public 에 실제로 있다', () => {
    expect(html).toMatch(new RegExp(`<link rel="icon"[^>]*href="${favicon}"`));
    expect(existsSync(resolve(ROOT, `services/${app}/public${favicon}`))).toBe(true);
  });

  it('og:url 은 서비스 host · og:image 는 없다', () => {
    expect(html).toContain(`<meta property="og:url" content="${host}" />`);
    expect(html).not.toMatch(/<meta[^>]+property="og:image"/);
  });

  it('title · description 이 있다', () => {
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
  });
});

describe('pharmacy — 표시 이름 O4O 약국', () => {
  it('index.html · manifest 가 O4O 약국', () => {
    const html = read('services/web-kpa-society/index.html');
    expect(html).toContain('<title>O4O 약국 — 약국의 정보와 업무를 하나로 연결합니다</title>');
    expect(html).toContain('<meta property="og:site_name" content="O4O 약국" />');
    const manifest = JSON.parse(read('services/web-kpa-society/public/manifest.json'));
    expect(manifest.name).toBe('O4O 약국');
    expect(manifest.short_name).toBe('O4O 약국');
  });

  it('legacy asset 은 즉시 삭제하지 않는다', () => {
    expect(existsSync(resolve(ROOT, 'services/web-kpa-society/public/favicon.png'))).toBe(true);
  });
});

describe('공통 토큰', () => {
  it('Pretendard 우선 글꼴 스택 · Hero · CTA · O4O 홈 클래스', () => {
    const tokens = read('packages/auth-react/src/public-brand/tokens.css');
    expect(tokens).toMatch(/--o4o-font-sans:\s*"Pretendard Variable"/);
    for (const cls of ['.o4o-hero', '.o4o-cta', '.o4o-cta-secondary', '.o4o-home-link']) expect(tokens).toContain(cls);
    expect(tokens).toContain(':focus-visible');
  });
});

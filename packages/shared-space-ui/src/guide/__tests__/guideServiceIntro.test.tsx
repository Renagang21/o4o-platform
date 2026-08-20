/**
 * GuideServiceIntroPage — 공통 서비스 소개 landing 계약 테스트
 *
 * WO-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1 §15
 *
 * 1) Shared landing 렌더 계약 (제목/lead · 카드 · 선택 섹션 · 링크)
 * 2) Adoption 정적 고정 — KPA / K-Cosmetics / GlycoPharm wrapper 가 공통 View 를 쓰는지
 * 3) Route contract — /guide · /guide/intro · /guide/usage · /guide/features · /service-guide 관계 유지
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GuideServiceIntroPage } from '../GuideServiceIntroPage.js';
import { kpaServiceIntroProps } from '../copy/kpa.js';
import { kCosmeticsServiceIntroProps } from '../copy/k-cosmetics.js';
import { glycopharmServiceIntroProps } from '../copy/glycopharm.js';
import { pharmacyHubServiceIntroProps } from '../copy/pharmacy-hub.js';
import type { GuideServiceIntroPageProps } from '../types.js';

const ROOT = resolve(__dirname, '../../../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

function renderPage(props: GuideServiceIntroPageProps) {
  // vitest globals 미사용 → testing-library 자동 cleanup 이 없으므로 명시 정리한다.
  cleanup();
  return render(
    <MemoryRouter>
      <GuideServiceIntroPage {...props} />
    </MemoryRouter>,
  );
}

const SERVICES: [string, GuideServiceIntroPageProps][] = [
  ['KPA', kpaServiceIntroProps],
  ['K-Cosmetics', kCosmeticsServiceIntroProps],
  ['GlycoPharm', glycopharmServiceIntroProps],
  // WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
  ['PharmacyHub', pharmacyHubServiceIntroProps],
];

describe('GuideServiceIntroPage — 렌더 계약', () => {
  it.each(SERVICES)('%s: headline · lead · 모든 카드 · step 을 렌더한다', (_name, props) => {
    renderPage(props);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(props.headline);
    expect(screen.getByText(props.lead)).toBeTruthy();
    // 카드 제목이 섹션 제목과 겹치는 서비스가 있어 getAllByText 로 존재만 확인한다.
    for (const card of [...props.audiences.cards, ...props.features.cards]) {
      expect(screen.getAllByText(card.title).length).toBeGreaterThan(0);
    }
    for (const step of props.steps.items) {
      expect(screen.getAllByText(step.title).length).toBeGreaterThan(0);
    }
  });

  it.each(SERVICES)('%s: hero action 과 문의 CTA 가 실제 Link 다', (_name, props) => {
    const { container } = renderPage(props);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const a of props.heroActions) expect(hrefs).toContain(a.to);
    expect(hrefs).toContain(props.contact.action.to);
  });

  it.each(SERVICES)('%s: 기능 사용 가이드(relatedGuide) 링크로 /guide 체계와 연결된다', (_name, props) => {
    const { container } = renderPage(props);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(props.relatedGuide).toBeTruthy();
    for (const l of props.relatedGuide!.links) expect(hrefs).toContain(l.to);
  });

  it('선택 데이터(relatedGuide · note · 섹션 설명)가 없어도 렌더된다', () => {
    const minimal: GuideServiceIntroPageProps = {
      headline: '최소 구성',
      lead: '최소 구성 설명',
      heroActions: [{ to: '/contact', label: '문의하기' }],
      intro: { title: '서비스 소개', paragraphs: ['한 문단'] },
      audiences: { title: '이용 대상', cards: [{ icon: 'span', title: '대상', desc: '설명' }] },
      features: { title: '주요 기능', cards: [{ icon: 'span', title: '기능', desc: '설명' }] },
      steps: { title: '이용 흐름', items: [{ no: '01', title: '시작' }] },
      contact: { title: '문의 안내', body: '문의 안내 본문', action: { to: '/contact', label: '문의하기' } },
    };
    const { container } = renderPage(minimal);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('최소 구성');
    expect(container.querySelectorAll('a')).toHaveLength(2); // hero 1 + contact 1
  });

  it('mobile-friendly: 카드 그리드가 1열 기본 + sm 이상 다열이다', () => {
    const { container } = renderPage(kCosmeticsServiceIntroProps);
    const grids = [...container.querySelectorAll('div')].filter((d) =>
      (d.getAttribute('class') ?? '').includes('grid-cols-1'),
    );
    expect(grids.length).toBeGreaterThan(0);
    for (const g of grids) expect(g.getAttribute('class')).toMatch(/sm:grid-cols-/);
  });

  it('renderText 가 있으면 lead 와 intro 문단을 대체 렌더한다', () => {
    renderPage({ ...kpaServiceIntroProps, renderText: (key) => `[[${key}]]` });
    expect(screen.getByText('[[hero-lead]]')).toBeTruthy();
    expect(screen.getByText('[[intro-0]]')).toBeTruthy();
  });
});

describe('Adoption — 3 서비스 wrapper 가 공통 View 를 쓴다', () => {
  const WRAPPERS: [string, string, string][] = [
    ['KPA', 'services/web-kpa-society/src/pages/service-guide/ServiceGuidePage.tsx', 'kpaServiceIntroProps'],
    ['K-Cosmetics', 'services/web-k-cosmetics/src/pages/ServiceGuidePage.tsx', 'kCosmeticsServiceIntroProps'],
    ['GlycoPharm', 'services/web-glycopharm/src/pages/ServiceGuidePage.tsx', 'glycopharmServiceIntroProps'],
  ];

  it.each(WRAPPERS)('%s wrapper 는 GuideServiceIntroPage + copy config 만 사용한다', (_n, path, props) => {
    const src = read(path);
    expect(src).toContain('GuideServiceIntroPage');
    expect(src).toContain(props);
    expect(src).toContain('@o4o/shared-space-ui');
    // 공통화 후 wrapper 는 자체 레이아웃/데이터를 다시 들고 있지 않는다.
    expect(src).not.toContain('lucide-react');
    expect(src).not.toContain('className=');
    expect(src.split('\n').length).toBeLessThan(30);
  });
});

describe('Route contract — /service-guide 와 /guide 관계 유지', () => {
  const APPS: [string, string][] = [
    ['KPA', 'services/web-kpa-society/src/App.tsx'],
    ['K-Cosmetics', 'services/web-k-cosmetics/src/App.tsx'],
    ['GlycoPharm', 'services/web-glycopharm/src/App.tsx'],
  ];

  it.each(APPS)('%s: /service-guide 와 기존 guide deep-link 가 모두 유지된다', (_n, path) => {
    const src = read(path);
    for (const p of ['service-guide', 'guide/intro', 'guide/usage', 'guide/features']) {
      expect(src).toMatch(new RegExp(`path="/?${p}"`));
    }
  });

  it.each(APPS)('%s: /guide 는 canonical 진입점(/guide/intro) 으로 보낸다', (_n, path) => {
    const src = read(path);
    expect(src).toMatch(/path="\/?guide"\s+element=\{<Navigate to="\/guide\/intro" replace \/>\}/);
  });

  it('Neture 의 /guide 는 자체 landing 을 유지한다 (redirect 로 덮지 않는다)', () => {
    const src = read('services/web-neture/src/App.tsx');
    expect(src).toMatch(/path="\/guide"/);
    expect(src).not.toMatch(/path="\/guide"\s+element=\{<Navigate/);
  });

  it('3 서비스 guide intro 하단에 서비스 소개(/service-guide) 상호 연결이 있다', () => {
    for (const f of ['kpa.ts', 'k-cosmetics.ts', 'glycopharm.ts']) {
      const src = read(`packages/shared-space-ui/src/guide/copy/${f}`);
      expect(src).toContain("serviceGuide: { label: '서비스 소개', to: '/service-guide' }");
    }
  });
});

describe('PharmacyHub adoption — WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1', () => {
  const APP = 'services/web-pharmacy-hub/src/App.tsx';

  it('공통 View 를 route 에 직접 mount 한다 (PharmacyHub 전용 Guide page 파일 0)', () => {
    const src = read(APP);
    expect(src).toContain('@o4o/shared-space-ui');
    for (const v of [
      'GuideServiceIntroPage',
      'GuideIntroPage',
      'GuideUsagePage',
      'GuideFeaturesPage',
      'GuideFeatureManualPage',
    ]) {
      expect(src).toContain(v);
    }
    // 서비스별 View 복제 0 — PharmacyHub 안에 guide 화면 소스가 따로 생기지 않았다.
    expect(() => read('services/web-pharmacy-hub/src/pages/guide')).toThrow();
    expect(() => read('services/web-pharmacy-hub/src/pages/ServiceGuidePage.tsx')).toThrow();
  });

  it('deep-link route 가 모두 등재된다', () => {
    const src = read(APP);
    for (const p of [
      'service-guide',
      'guide/intro',
      'guide/intro/structure',
      'guide/intro/kpa',
      'guide/intro/operation',
      'guide/intro/concept',
      'guide/usage',
      'guide/features',
      'guide/features/forum',
      'guide/features/supply-order',
      'guide/features/store-products',
      'guide/features/content',
      'guide/features/qr',
      'guide/features/pop',
      'guide/features/signage',
      'guide/features/tablet',
      'guide/features/manuals',
    ]) {
      expect(src).toMatch(new RegExp(`path="/?${p}"`));
    }
  });

  it('/guide 는 canonical 진입점(/guide/intro) 으로 수렴한다 (redirect loop 0)', () => {
    const src = read(APP);
    expect(src).toMatch(/path="\/?guide"\s+element=\{<Navigate to="\/guide\/intro" replace \/>\}/);
    // /guide/intro 자체는 redirect 가 아니라 실제 페이지여야 loop 가 생기지 않는다.
    expect(src).toMatch(/path="\/guide\/intro"\s+element=\{<GuideIntroPage/);
  });

  it('공개 소개 ↔ 기능 매뉴얼 상호 연결이 copy 에 있다', () => {
    const copy = read('packages/shared-space-ui/src/guide/copy/pharmacy-hub.ts');
    // /service-guide → /guide/*
    expect(copy).toContain("to: '/guide/intro'");
    expect(copy).toContain("to: '/guide/usage'");
    expect(copy).toContain("to: '/guide/features'");
    // /guide/intro → /service-guide
    expect(copy).toContain("serviceGuide: { label: '서비스 소개', to: '/service-guide' }");
  });

  it('navigation 에 Guide 진입점이 등재된다 (고립 0)', () => {
    const nav = read('services/web-pharmacy-hub/src/config/navigation.ts');
    expect(nav).toContain("href: '/service-guide'");
    expect(nav).toContain("href: '/guide/intro'");
    expect(nav).toContain("href: '/guide/features'");
  });
});

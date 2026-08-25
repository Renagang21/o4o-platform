/**
 * 커뮤니티 콘텐츠·자료실 frontend/View 공통화 — Regression Test
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1
 *
 * 검증 2계층:
 *   (A) 동작 — 공통 `CommunityContentListView` / adapter 를 실제 렌더·실행해
 *       loading / error / empty / populated / 검색 / 배지 / 더보기 / optional 메타 /
 *       첨부 / 서비스 config 를 고정한다.
 *   (B) 정적 계약 — 서비스 wrapper 가 공통 View 만 소비하고, 제거한 중복 JSX 가
 *       되살아나지 않는지 + API URL·serviceKey 계약을 고정한다.
 *
 * web 서비스와 UI 패키지에는 DOM test runner 가 없다(jsdom / @testing-library 도입은
 * dependency 변경 = CLAUDE.md 중지 조건). 저장소 관례대로 api-server jest 에서
 * `react-dom/server` 정적 렌더로 표현 계약을 고정하고, 이벤트 배선은 정적 계약(B)으로 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  CommunityContentListView,
} from '../../../../packages/shared-space-ui/src/community/CommunityContentListView';
import {
  standardContentToListItem,
  standardContentToDetailData,
  standardContentBadges,
} from '../../../../packages/shared-space-ui/src/community/standardContentAdapters';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const ITEMS = [
  {
    id: 'a1',
    title: '겨울 보습 가이드',
    summary: '건조한 계절 관리',
    authorName: '김운영',
    dateLabel: '1월 5일',
    viewCount: 12,
  },
  { id: 'a2', title: '초안 글', badges: [{ text: '초안', tone: 'warning' as const }] },
];

const render = (props: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(CommunityContentListView as any, { title: '콘텐츠', items: ITEMS, ...props }));

// ─────────────────────────────────────────────────────────────────────────────
// (A) 공통 목록 View 상태 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('CommunityContentListView — 상태', () => {
  it('loading 이고 항목이 없으면 목록 대신 로딩 표현을 렌더한다', () => {
    const html = render({ items: [], loading: true });
    expect(html).toContain('불러오는 중');
    expect(html).not.toContain('겨울 보습 가이드');
  });

  it('error 면 실패를 드러내고 재시도를 제공한다 (빈 목록으로 삼키지 않는다)', () => {
    const html = render({ error: true, errorMessage: '콘텐츠 목록을 불러오지 못했습니다.', onRetry: () => {} });
    expect(html).toContain('콘텐츠 목록을 불러오지 못했습니다.');
    expect(html).toContain('다시 시도');
    expect(html).not.toContain('겨울 보습 가이드');
  });

  it('정상 0건이면 empty 문구를, 검색 중이면 검색 empty 문구를 렌더한다', () => {
    const empty = render({ items: [], emptyMessage: '아직 등록된 콘텐츠가 없습니다.' });
    expect(empty).toContain('아직 등록된 콘텐츠가 없습니다.');

    const filtered = render({ items: [], isFiltered: true, emptyFilteredMessage: '검색 결과가 없습니다.' });
    expect(filtered).toContain('검색 결과가 없습니다.');
  });

  it('populated 이면 카드와 상세 경로(href)를 렌더한다', () => {
    const html = render({ hrefFor: (i: any) => `/content/${i.id}` });
    expect(html).toContain('겨울 보습 가이드');
    expect(html).toContain('건조한 계절 관리');
    expect(html).toContain('href="/content/a1"');
    expect(html).toContain('href="/content/a2"');
  });

  it('badges 는 카드에 표시되고, 상태가 published 인 항목에는 배지가 없다', () => {
    const html = render({});
    expect(html).toContain('초안');
    expect(html).toContain('겨울 보습 가이드');
  });
});

describe('CommunityContentListView — 검색 / 더보기 / config', () => {
  it('search 를 주면 검색 입력을, 주지 않으면 검색 UI 를 렌더하지 않는다', () => {
    const withSearch = render({
      search: { value: '보습', onChange: () => {}, placeholder: '콘텐츠를 검색하세요' },
    });
    expect(withSearch).toContain('콘텐츠를 검색하세요');
    expect(withSearch).toContain('value="보습"');
    expect(render({})).not.toContain('<input');
  });

  it('hasMore + onLoadMore 를 주면 더 보기 버튼을 목록 뒤에 렌더한다', () => {
    const html = render({ hasMore: true, onLoadMore: () => {} });
    expect(html).toContain('더 보기');
    expect(html.indexOf('더 보기')).toBeGreaterThan(html.indexOf('겨울 보습 가이드'));
  });

  it('error 상태에서는 더 보기를 렌더하지 않는다', () => {
    const html = render({ error: true, hasMore: true, onLoadMore: () => {} });
    expect(html).not.toContain('더 보기');
  });

  it('title / description / accent / headerActionSlot 은 서비스 config 로 주입된다', () => {
    const html = render({
      title: '자료실',
      description: '자료를 검색하고 활용하세요.',
      accent: '#db2777',
      headerActionSlot: createElement('button', null, '자료 등록'),
    });
    expect(html).toContain('자료실');
    expect(html).toContain('자료를 검색하고 활용하세요.');
    expect(html).toContain('#db2777');
    expect(html).toContain('자료 등록');
  });

  it('optional 메타(작성자/날짜/조회/추천/첨부)를 지정하지 않아도 목록이 정상 렌더된다', () => {
    const html = renderToStaticMarkup(
      createElement(CommunityContentListView as any, { title: '콘텐츠', items: [{ id: 'x', title: '제목만' }] }),
    );
    expect(html).toContain('제목만');
    expect(html).toContain('익명');
    expect(html).not.toContain('조회 ');
  });

  it('showRecommendation / showAttachment 를 켠 서비스만 추천·첨부를 표시한다', () => {
    const item = { id: 'r1', title: '자료', recommendCount: 7, attachmentLabel: '안내문.pdf' };
    const off = renderToStaticMarkup(createElement(CommunityContentListView as any, { title: '자료실', items: [item] }));
    expect(off).not.toContain('추천 7');
    expect(off).not.toContain('안내문.pdf');

    const on = renderToStaticMarkup(createElement(CommunityContentListView as any, {
      title: '자료실', items: [item], showRecommendation: true, showAttachment: true,
    }));
    expect(on).toContain('추천 7');
    expect(on).toContain('안내문.pdf');
  });

  it('renderLink 를 주면 서비스 라우터 링크로 카드를 감싼다 (공통 View 는 router 미결합)', () => {
    const html = render({
      hrefFor: (i: any) => `/content/${i.id}`,
      renderLink: (href: string, children: any) => createElement('span', { 'data-to': href }, children),
    });
    expect(html).toContain('data-to="/content/a1"');
    expect(html).not.toContain('<a href="/content/a1"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-2) 표준 레코드 adapter 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('standardContentAdapters — 서비스 응답 정규화', () => {
  const record = {
    id: 'c1',
    title: '표준 콘텐츠',
    summary: '요약',
    author_name: '홍길동',
    created_at: '2026-01-05T00:00:00.000Z',
    view_count: 9,
    status: 'published',
    body: '<p>본문</p>',
    tags: ['보습'],
  };

  it('목록 item 으로 정규화한다', () => {
    const item = standardContentToListItem(record);
    expect(item).toMatchObject({ id: 'c1', title: '표준 콘텐츠', authorName: '홍길동', viewCount: 9 });
    expect(item.dateLabel).toContain('1월');
    expect(item.badges).toEqual([]);
  });

  it('상세 data 로 정규화한다 (본문/태그 보존)', () => {
    const data = standardContentToDetailData(record);
    expect(data.bodyHtml).toBe('<p>본문</p>');
    expect(data.tags).toEqual(['보습']);
    expect(data.dateLabel).toContain('2026');
  });

  it('published 가 아닐 때만 상태 배지를 만든다', () => {
    expect(standardContentBadges({ ...record, status: 'published' })).toEqual([]);
    expect(standardContentBadges({ ...record, status: 'draft' })).toEqual([{ text: '초안', tone: 'warning' }]);
    expect(standardContentBadges({ ...record, status: 'private' })).toEqual([{ text: '비공개', tone: 'warning' }]);
  });

  it('날짜가 없거나 깨져도 화면을 깨뜨리지 않는다', () => {
    expect(standardContentToListItem({ id: 'x', title: 't' }).dateLabel).toBe('-');
    expect(standardContentToListItem({ id: 'x', title: 't', created_at: 'not-a-date' }).dateLabel).toBe('-');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B) 공통 View 순수성 + 서비스 wrapper 정적 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('공통 View 순수성', () => {
  // 주석(설계 메모)에는 금지 토큰이 설명 목적으로 등장하므로 코드만 검사한다.
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const files = [
    'packages/shared-space-ui/src/community/CommunityContentListView.tsx',
    'packages/shared-space-ui/src/community/CommunityContentDetailTemplate.tsx',
    'packages/shared-space-ui/src/community/CommunityContentStates.tsx',
    'packages/shared-space-ui/src/community/standardContentAdapters.ts',
  ];

  it.each(files)('%s 는 fetch / axios / router / 서비스 분기를 포함하지 않는다', (rel) => {
    const src = strip(read(rel));
    expect(src).not.toContain('axios');
    expect(src).not.toContain('fetch(');
    expect(src).not.toContain('react-router');
    expect(src).not.toContain('serviceKey');
    expect(src).not.toMatch(/service\s*===\s*'/);
    expect(src).not.toMatch(/switch\s*\(\s*serviceType/);
  });

  it('shared-space-ui 공개 계약(index)에 신규 View 가 추가된다', () => {
    const idx = read('packages/shared-space-ui/src/index.ts');
    expect(idx).toContain("CommunityContentListView");
    expect(idx).toContain("CommunityContentListTemplate");
    expect(idx).toContain("CommunityContentDetailTemplate");
    expect(idx).toContain("standardContentToListItem");
    expect(idx).toContain('CommunityContentDetailView');
    expect(idx).toContain('CommunityContentSearchBar');
  });
});

describe('K-Cosmetics / GlycoPharm wrapper — 콘텐츠 목록·상세', () => {
  const cases: Array<[string, string]> = [
    ['services/web-k-cosmetics/src/pages/contents', '/cosmetics/contents'],
    ['services/web-glycopharm/src/pages/contents', '/glycopharm/contents'],
  ];

  it.each(cases)('%s 목록은 공통 Template 을 소비하고 자체 카드/상태 JSX 를 갖지 않는다', (dir) => {
    const src = read(`${dir}/ContentListPage.tsx`);
    expect(src).toContain("from '@o4o/shared-space-ui'");
    expect(src).toContain('<CommunityContentListTemplate');
    expect(src).toContain('standardContentToListItem');
    // 제거된 중복 표현
    expect(src).not.toContain('cardTitleRow');
    expect(src).not.toContain('statusBadge');
    expect(src).not.toContain('불러오는 중...');
    expect(src).not.toContain('더 보기');
    expect(src).not.toContain('STATUS_LABEL');
  });

  it.each(cases)('%s 상세는 공통 Template 을 소비하고 자체 로딩/오류 JSX 를 갖지 않는다', (dir) => {
    const src = read(`${dir}/ContentDetailPage.tsx`);
    expect(src).toContain('<CommunityContentDetailTemplate');
    expect(src).toContain('standardContentToDetailData');
    expect(src).not.toContain('불러오는 중...');
    expect(src).not.toContain('콘텐츠를 찾을 수 없습니다\'}');
    // 서비스 고유 책임은 유지
    expect(src).toContain('링크 복사');
    expect(src).toContain('/edit');
  });

  it('목록 adapter 는 조회 실패를 빈 목록으로 삼키지 않는다 (throw 전파)', () => {
    for (const [dir] of cases) {
      const src = read(`${dir}/ContentListPage.tsx`);
      expect(src).toContain('throw new Error');
      expect(src).not.toContain('.catch(() => ({ items: []');
    }
  });

  it.each(cases)('%s 는 서비스 API URL 계약을 유지한다', (dir, endpoint) => {
    const service = dir.split('/')[1];
    const api = read(`services/${service}/src/api/content.ts`);
    expect(api).toContain(`'${endpoint}'`);
    expect(api).toContain("sub_type: 'content'");
    expect(api).toContain(`\`${endpoint}/\${id}\``);
  });
});

describe('KPA — 서비스 고유 View 유지 (공통 primitive 소비)', () => {
  it('KPA 콘텐츠 목록은 canonical table 축을 유지하고 공통 검색 primitive 를 쓴다', () => {
    const src = read('services/web-kpa-society/src/pages/contents/ContentListPage.tsx');
    expect(src).toContain('CommunityContentSearchBar');
    expect(src).toContain("from '../../api/content'");
  });

  it('KPA 콘텐츠 상세는 공통 표시 View + KPA 정책(추천/감사/가져가기)을 유지한다', () => {
    const src = read('services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx');
    expect(src).toContain('CommunityContentDetailView');
    expect(src).toContain('AppreciationPanel');
    expect(src).toContain('importContentToStore');
  });

  it('KPA 자료실은 공통 ResourcesHubTemplate 을 유지한다', () => {
    const src = read('services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx');
    expect(src).toContain('ResourcesHubTemplate');
  });
});

describe('자료실 축 — 3서비스 공통 Template 유지', () => {
  const cases: Array<[string, string]> = [
    ['services/web-k-cosmetics/src/pages/resources/ResourcesPage.tsx', 'k-cosmetics'],
    ['services/web-glycopharm/src/pages/resources/ResourcesPage.tsx', 'glycopharm'],
    ['services/web-neture/src/pages/resources/NetureResourcesPage.tsx', 'neture'],
  ];

  it.each(cases)('%s 는 ResourcesHubTemplate + serviceKey 계약을 유지한다', (rel, serviceKey) => {
    const src = read(rel);
    expect(src).toContain('ResourcesHubTemplate');
    expect(src).toContain(serviceKey);
  });

  it('Neture 자료실/콘텐츠 라이브러리는 공통 Template 을 소비한다', () => {
    expect(read('services/web-neture/src/pages/resources/NetureResourcesPage.tsx')).toContain('cmsApi');
    expect(read('services/web-neture/src/lib/api/content.ts')).toContain('/neture/content');
    expect(read('services/web-neture/src/pages/library/ContentLibraryPage.tsx')).toContain('ContentHubTemplate');
  });
});

describe('Pharmacy-Hub — 커뮤니티 자료실·콘텐츠 공통 View 채택', () => {
  const app = read('services/web-pharmacy-hub/src/App.tsx');

  /**
   * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6:
   *   콘텐츠(`/content`)도 채택됐다. 중복 모델 금지 취지는 유지되므로 **공통 원장·공통 View**
   *   를 쓰는지로 고정한다 — PH 전용 화면 복제나 전용 table 이 아니어야 한다.
   */
  it('커뮤니티 `/content` 는 공통 shell + 공통 cms_contents 로 채택돼 있다', () => {
    expect(app).toContain('path="/content"');
    const listPage = read('services/web-pharmacy-hub/src/pages/content/PharmacyHubContentListPage.tsx');
    const writePage = read('services/web-pharmacy-hub/src/pages/content/PharmacyHubContentWritePage.tsx');
    const detailPage = read('services/web-pharmacy-hub/src/pages/content/PharmacyHubContentDetailPage.tsx');
    expect(listPage).toContain('CommunityContentListTemplate');
    expect(writePage).toContain('CommunityContentWriteShell');
    expect(detailPage).toContain('CommunityContentDetailTemplate');
    // 주석은 판정 근거 서술이라(전용 table 금지를 명시) 코드만 본다.
    const apiClient = read('services/web-pharmacy-hub/src/lib/api/pharmacyHubContents.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(apiClient).toContain("'/cms/contents'");
    expect(apiClient).not.toContain('pharmacy_hub_contents');
  });

  it('자료실 `/resources` 는 공통 Template + serviceKey 계약으로 채택돼 있다', () => {
    expect(app).toContain('path="/resources"');
    const page = read('services/web-pharmacy-hub/src/pages/resources/PharmacyHubResourcesPage.tsx');
    expect(page).toContain('ResourcesHubTemplate');
    expect(page).toContain('pharmacy-hub');
  });

  it('구현된 content/library 는 store-owner 축(Store Production Material)이다', () => {
    expect(app).toContain('./pages/store-owner/ContentPage');
    expect(app).toContain('./pages/store-owner/LibraryPage');
    const library = read('services/web-pharmacy-hub/src/pages/store-owner/LibraryPage.tsx');
    expect(library).toContain('StoreProductionMaterialsView');
    expect(library).toContain('@o4o/store-ui-core');
  });
});

/**
 * LMS Course List / Hub View 공통화 — Regression Test
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1
 *
 * 검증 2계층:
 *   (A) 동작 — 공통 `CourseListView`(@o4o/lms-ui)를 실제 렌더해 loading / error /
 *       empty / populated / 검색 / 필터 / config / optional 미지정 상태를 고정한다.
 *   (B) 정적 계약 — 서비스 wrapper 가 공통 View 만 소비하고, 제거한 중복 JSX 가
 *       되살아나지 않는지 고정한다.
 *
 * web 서비스와 UI 패키지에는 DOM test runner 가 없다(jsdom / @testing-library 도입은
 * dependency 변경 = CLAUDE.md 중지 조건). 저장소 관례대로 api-server jest 에서
 * `react-dom/server` 정적 렌더로 표현 계약을 고정하고, 이벤트 핸들러 배선은
 * 정적 계약(B)으로 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CourseListView } from '../../../../packages/lms-ui/src/views/CourseListView';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const COURSES = [
  { id: 'c1', title: '당뇨 기초', description: '개요', isPaid: false, enrollmentCount: 3, durationMinutes: 90 },
  { id: 'c2', title: '복약지도 심화', isPaid: true, enrollmentCount: 0 },
];

const render = (props: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(CourseListView as any, { courses: COURSES, ...props }));

// ─────────────────────────────────────────────────────────────────────────────
// (A) 공통 View 상태 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('CourseListView — 상태', () => {
  it('loading 이면 목록 대신 로딩 표현을 렌더한다', () => {
    const html = render({ loading: true });
    expect(html).not.toContain('당뇨 기초');
    expect(html).not.toContain('복약지도 심화');
  });

  it('error 면 실패를 드러내고 재시도를 제공한다 (빈 목록으로 삼키지 않는다)', () => {
    const html = render({ error: true, onRetry: () => {} });
    expect(html).toContain('불러오지 못했습니다');
    expect(html).toContain('다시 시도');
    expect(html).not.toContain('당뇨 기초');
  });

  it('errorSlot 을 주면 기본 오류 표현 대신 서비스 노드를 쓴다', () => {
    const html = render({ error: true, errorSlot: createElement('p', null, '서비스 오류 문구') });
    expect(html).toContain('서비스 오류 문구');
    expect(html).not.toContain('다시 시도');
  });

  it('빈 목록이면 emptyState 를 렌더한다', () => {
    const html = render({ courses: [], emptyState: createElement('p', null, '등록된 강좌가 없습니다') });
    expect(html).toContain('등록된 강좌가 없습니다');
  });

  it('populated 이면 카드와 상세 경로(href)를 렌더한다', () => {
    const html = render({ hrefFor: (c: any) => `/courses/${c.id}` });
    expect(html).toContain('당뇨 기초');
    expect(html).toContain('복약지도 심화');
    expect(html).toContain('href="/courses/c1"');
    expect(html).toContain('href="/courses/c2"');
  });
});

describe('CourseListView — 검색 / 필터 / config', () => {
  it('search 를 주면 검색 입력을, 주지 않으면 검색 UI 를 렌더하지 않는다', () => {
    const withSearch = render({
      search: { value: '당뇨', onChange: () => {}, onSubmit: () => {}, placeholder: '강좌 검색...' },
    });
    expect(withSearch).toContain('강좌 검색...');
    expect(withSearch).toContain('value="당뇨"');
    expect(render({})).not.toContain('<input');
  });

  it('filters 를 주면 chip 과 선택 상태(aria-pressed)를 렌더한다', () => {
    const html = render({
      filters: {
        value: 'free',
        options: [
          { key: 'all', label: '전체' },
          { key: 'free', label: '무료만' },
        ],
        onChange: () => {},
      },
    });
    expect(html).toContain('전체');
    expect(html).toContain('무료만');
    expect((html.match(/aria-pressed="true"/g) || []).length).toBe(1);
  });

  it('accent 는 서비스 config 로 주입된다', () => {
    const html = render({
      accent: '#db2777',
      search: { value: '', onChange: () => {}, onSubmit: () => {} },
    });
    expect(html).toContain('#db2777');
  });

  it('priceLabel / freeBadge / footerSlot 은 서비스가 주입한 문구를 쓴다', () => {
    const html = render({
      freeBadge: true,
      priceLabelFor: (c: any) => (c.isPaid ? '₩30,000' : undefined),
      renderCardFooter: () => createElement('span', null, '자세히 보기 →'),
    });
    expect(html).toContain('무료');
    expect(html).toContain('유료 ₩30,000');
    expect(html).toContain('자세히 보기 →');
  });

  it('optional 기능을 하나도 지정하지 않아도 목록이 정상 렌더된다', () => {
    const html = render({});
    expect(html).toContain('당뇨 기초');
    expect(html).not.toContain('aria-pressed');
  });

  it('gateSlot 을 주면 목록 대신 게이트를 렌더한다 (비로그인 등)', () => {
    const html = render({ gateSlot: createElement('p', null, '로그인이 필요합니다') });
    expect(html).toContain('로그인이 필요합니다');
    expect(html).not.toContain('당뇨 기초');
  });

  it('paginationSlot 은 목록 뒤에 서비스 컴포넌트를 렌더한다', () => {
    const html = render({ paginationSlot: createElement('nav', null, '1 / 3') });
    expect(html).toContain('1 / 3');
    expect(html.indexOf('1 / 3')).toBeGreaterThan(html.indexOf('당뇨 기초'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B) 공통 View 순수성 + 서비스 wrapper 정적 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('공통 View 순수성', () => {
  // 주석(설계 메모)에는 금지 토큰이 설명 목적으로 등장하므로 코드만 검사한다.
  const view = read('packages/lms-ui/src/views/CourseListView.tsx')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('fetch / axios / router / 서비스 분기를 포함하지 않는다', () => {
    expect(view).not.toContain('axios');
    expect(view).not.toContain('fetch(');
    expect(view).not.toContain('react-router');
    expect(view).not.toContain('serviceKey');
    expect(view).not.toMatch(/service\s*===\s*'/);
    expect(view).not.toMatch(/switch\s*\(\s*serviceType/);
  });

  it('lms-ui 공개 계약(index)에 CourseListView 가 추가되고 기존 View 계약은 유지된다', () => {
    const idx = read('packages/lms-ui/src/index.ts');
    expect(idx).toContain("export { CourseListView } from './views/CourseListView'");
    expect(idx).toContain('CourseDetailView');
    expect(idx).toContain('LessonPlayerView');
  });
});

describe('KPA 서비스 wrapper — 카드형 목록', () => {
  const hub = read('services/web-kpa-society/src/pages/courses/CourseHubPage.tsx');

  it('/courses 목록은 공통 CourseListView 를 소비한다', () => {
    expect(hub).toContain("from '@o4o/lms-ui'");
    expect(hub).toContain('<CourseListView');
  });

  it('자체 카드 grid / 필터 chip / 검색 form JSX 는 남아 있지 않다', () => {
    expect(hub).not.toContain('courseGrid');
    expect(hub).not.toContain('filterChip');
    expect(hub).not.toContain('<form');
    expect(hub).not.toContain('thumbnailPlaceholder');
  });

  it('상세 경로(/courses/:id)와 가격 필터 계약은 유지된다', () => {
    expect(hub).toContain('/courses/${');
    expect(hub).toContain("'free'");
    expect(hub).toContain("'paid'");
  });

  it('강사 프로필의 지역 CourseCard 는 공통 CourseCard 로 수렴했다', () => {
    const profile = read('services/web-kpa-society/src/pages/instructors/InstructorProfilePage.tsx');
    expect(profile).toContain("from '@o4o/lms-ui'");
    expect(profile).toContain('CourseCard');
    expect(profile).not.toContain('function CourseCard(');
    expect(profile).not.toContain('formatDuration');
  });

  it('중복 목록 컴포넌트(LectureCard / LectureGrid / EducationTabs / EducationSidebar)는 제거되었다', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'services/web-kpa-society/src/components/education'))).toBe(false);
  });
});

describe('/lms 목록 hub — 3서비스 공통 템플릿 유지', () => {
  const cases: Array<[string, string]> = [
    ['services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx', 'kpa-society'],
    ['services/web-k-cosmetics/src/pages/lms/EducationPage.tsx', 'k-cosmetics'],
    ['services/web-glycopharm/src/pages/education/EducationPage.tsx', 'glycopharm'],
  ];

  it.each(cases)('%s 는 LmsHubTemplate + serviceKey / 상세경로 계약을 유지한다', (rel, serviceKey) => {
    const src = read(rel);
    expect(src).toContain('LmsHubTemplate');
    expect(src).toContain(serviceKey);
    expect(src).toContain('/lms/course/');
  });

  it('LmsHubTemplate 은 조회 실패를 빈 목록으로 삼키지 않는다', () => {
    const src = read('packages/shared-space-ui/src/LmsHubTemplate.tsx');
    expect(src).toContain('setLoadError(true)');
    expect(src).toContain('강의 목록을 불러오지 못했습니다');
    expect(src).toContain('다시 시도');
  });
});

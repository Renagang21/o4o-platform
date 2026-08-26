/**
 * WO-O4O-MAIN-SITE-RESIDUAL-ORPHAN-AXIS-CENSUS-V1
 *   — main-site 잔여 고아 축 은퇴 계약 테스트
 *
 * 판정: RETIRE_CONFIRMED (74 files)
 * ---------------------------------------------------
 * 선행 WO 들이 NextGen ViewRenderer · App Store 병렬축을 걷어낸 뒤에도
 * `apps/main-site/src` 에는 live route graph 어디에도 닿지 않는 고아 축이
 * 74 개 남아 있었다. 이번 WO 는 그 74 개를 축 단위로 증명하고 한 번에 정리했다.
 *
 * 은퇴한 축 (전부 importer 가 orphan 내부에서만 닫힌 부분그래프):
 *
 *   hooks/queries/**                 (17)  UNUSED_QUERY_LAYER / DEAD_API_CLIENT
 *   hooks/useForumAI · useForumRecommendations
 *        · useNotifications · useRealtimeNotifications (4)  ORPHAN_DEAD
 *   components/forum/{ai,notifications,recommendations} (12) UNROUTED_UI → DEAD_UI
 *   components/yaksa/forum/**        (7)   HISTORICAL_KPA_COPY → DEAD_SOURCE
 *   pages/yaksa/forum/**             (7)   HISTORICAL_KPA_COPY → DEAD_SOURCE
 *   lib/yaksa/forum-data.ts          (1)   HISTORICAL_KPA_COPY → DEAD_SOURCE
 *   lib/api/lmsYaksaMember.ts        (1)   DEAD_SOURCE (importer 0)
 *   design/**                        (20)  LEGACY_DESIGN_SYSTEM → DEAD_DESIGN_SOURCE
 *   dead barrel 5 종                  (5)   ORPHAN_DEAD (재export 대상은 live)
 *
 * 판정 근거:
 *   - live reachable 27 ∩ orphan 74 = 0 (main.tsx 기준 정적 import graph BFS)
 *   - 74 개의 importer 는 전부 orphan 자신 — live 진입점 0
 *   - dynamic consumer 0 : main-site 내 import.meta.glob 0 / require() 0,
 *                          React.lazy 는 router/index.tsx 8 개뿐이며 전부 live
 *   - external consumer 0 : 저장소 밖에서 이 축을 import 하는 코드 0.
 *                           api-server / forum-core 의 `YaksaForumMeta` 는
 *                           이름만 겹치는 **백엔드 타입**이다.
 *   - raw-source consumer 0 : 이 파일들을 문자열로 읽는 코드 0
 *   - design 축 : tailwind.config.js 가 동일 hex 값을 직접 인라인하고 있고
 *                 `@/design` importer 는 저장소 전체에서 0 이다.
 *   - yaksa 축 : `services/web-kpa-society` 는 자체 forum 컴포넌트를 갖고 있고
 *                main-site 를 import 하지 않는다 — 동일 소유권이 아니다.
 *
 * 이번 WO 범위 밖으로 남겨 둔 dependency · script 잔재는
 * WO-O4O-MAIN-SITE-RESIDUAL-DEPENDENCY-AND-DEAD-SCRIPT-CLEANUP-V1 에서 종결했다
 * (`main-site-residual-dependency-cleanup.spec.ts`):
 *   - `axios` dependency · `tsx` devDependency → main-site orphan, 제거
 *   - 루트 `verify:shortcodes` · `scripts/audit/check-shortcode-registry.ts`
 *     → 살아 있는 shortcode 도메인을 검사하므로 KEEP_ACTIVE.
 *       은퇴한 main-site 경로 스캔 코드만 제거했다.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC, '..', '..', '..');
const MAIN_SITE_SRC = path.join(REPO_ROOT, 'apps', 'main-site', 'src');

/** 은퇴한 축의 디렉터리 (문서화 고정값) */
const RETIRED_DIRS = [
  path.join(MAIN_SITE_SRC, 'components', 'forum'),
  path.join(MAIN_SITE_SRC, 'components', 'yaksa'),
  path.join(MAIN_SITE_SRC, 'design'),
  path.join(MAIN_SITE_SRC, 'hooks'),
  path.join(MAIN_SITE_SRC, 'pages', 'yaksa'),
  path.join(MAIN_SITE_SRC, 'lib'),
];

/** 은퇴한 dead barrel (재export 대상 파일 자체는 live 이므로 남는다) */
const RETIRED_BARRELS = [
  path.join(MAIN_SITE_SRC, 'layouts', 'index.ts'),
  path.join(MAIN_SITE_SRC, 'pages', 'auth', 'index.ts'),
  path.join(MAIN_SITE_SRC, 'pages', 'dashboard', 'index.ts'),
  path.join(MAIN_SITE_SRC, 'pages', 'forum', 'index.ts'),
  path.join(MAIN_SITE_SRC, 'pages', 'lms', 'index.ts'),
];

/** live route 7 축이 의존하는, 반드시 남아야 하는 경로 */
const LIVE_PATHS = [
  'main.tsx',
  'App.tsx',
  'index.css',
  'router/index.tsx',
  'layouts/MainLayout.tsx',
  'components/common/index.ts',
  'context/index.ts',
  'pages/auth/LoginPage.tsx',
  'pages/dashboard/DashboardPage.tsx',
  'pages/forum/ForumListPage.tsx',
  'pages/forum/ForumDetailPage.tsx',
  'pages/lms/MyCoursesPage.tsx',
  'pages/lms/CourseDetailPage.tsx',
  'pages/lms/LessonPage.tsx',
  'pages/seller/dashboard/index.ts',
].map((p) => path.join(MAIN_SITE_SRC, ...p.split('/')));

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|json)$/.test(entry.name)) out.push(full);
  }
  return out;
};

/** retire 사유 주석은 남겨 두므로 주석 줄을 제거한 "실제 코드"만 스캔한다. */
const codeOf = (file: string): string =>
  fs
    .readFileSync(file, 'utf-8')
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join('\n');

describe('WO-O4O-MAIN-SITE-RESIDUAL-ORPHAN-AXIS-CENSUS-V1', () => {
  describe('은퇴한 고아 축이 되살아나지 않는다', () => {
    it.each(RETIRED_DIRS.map((p) => [path.relative(REPO_ROOT, p), p]))(
      '%s 디렉터리는 존재하지 않는다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(false);
      }
    );

    it.each(RETIRED_BARRELS.map((p) => [path.relative(REPO_ROOT, p), p]))(
      '%s (dead barrel) 는 존재하지 않는다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(false);
      }
    );

    it('은퇴 목록이 디렉터리 6 · barrel 5 로 고정돼 있다', () => {
      expect(RETIRED_DIRS).toHaveLength(6);
      expect(RETIRED_BARRELS).toHaveLength(5);
    });
  });

  describe('live route 7 축은 그대로 보호된다', () => {
    it.each(LIVE_PATHS.map((p) => [path.relative(REPO_ROOT, p), p]))(
      '%s 는 유지된다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(true);
      }
    );

    it('router 가 live lazy 대상 8 개를 그대로 들고 있다', () => {
      const router = fs.readFileSync(path.join(MAIN_SITE_SRC, 'router', 'index.tsx'), 'utf-8');
      for (const name of [
        'DashboardPage',
        'LoginPage',
        'ForumListPage',
        'ForumDetailPage',
        'MyCoursesPage',
        'CourseDetailPage',
        'LessonPage',
        'SellerDashboard',
      ]) {
        expect(router).toContain(name);
      }
    });

    it('router 가 은퇴 축 경로를 참조하지 않는다', () => {
      const router = codeOf(path.join(MAIN_SITE_SRC, 'router', 'index.tsx'));
      expect(router).not.toMatch(/@\/(design|hooks|lib)\b/);
      expect(router).not.toMatch(/@\/pages\/yaksa/);
      expect(router).not.toMatch(/@\/components\/(forum|yaksa)\b/);
    });
  });

  describe('main-site 전체에 은퇴 축 참조 0', () => {
    const files = walk(MAIN_SITE_SRC);

    it('스캔 대상을 실제로 찾았다 (경로가 어긋나면 이 단언이 먼저 깨진다)', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it.each([
      ['design system', /@\/design\b|from '\.\.?\/design/],
      ['hooks 축', /@\/hooks\b/],
      ['lib 축', /@\/lib\b/],
      ['forum UI 축', /@\/components\/forum\b/],
      ['yaksa UI 축', /@\/components\/yaksa\b/],
      ['yaksa page 축', /@\/pages\/yaksa\b/],
    ])('%s import 가 없다', (_label, re) => {
      const hits = files.filter((f) => (re as RegExp).test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('dead barrel 을 통한 재진입이 없다 (@/layouts · @/pages/* 배럴 import 0)', () => {
      const hits = files.filter((f) =>
        /from '@\/(layouts|pages\/(auth|dashboard|forum|lms))'/.test(codeOf(f))
      );
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });

  describe('저장소 어디서도 은퇴 축을 소비하지 않는다', () => {
    const scanRoots = [
      path.join(REPO_ROOT, 'apps'),
      path.join(REPO_ROOT, 'packages'),
      path.join(REPO_ROOT, 'services'),
      path.join(REPO_ROOT, 'scripts'),
    ].filter((d) => fs.existsSync(d));

    /** retire 계약 스펙 자체는 "없어야 할 문자열" 을 단언 대상으로 들고 있다. */
    const files = scanRoots
      .flatMap(walk)
      .filter((f) => /\.tsx?$/.test(f) && !/-retirement\.spec\.ts$/.test(f));

    it("main-site 의 은퇴 축 경로를 문자열로 읽는 코드가 없다", () => {
      const hits = files.filter((f) =>
        /main-site[/\\]src[/\\](design|hooks|lib|components[/\\](forum|yaksa)|pages[/\\]yaksa)/.test(
          codeOf(f)
        )
      );
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('web-kpa-society 는 main-site 를 import 하지 않는다 (소유권 분리 확인)', () => {
      const kpa = path.join(REPO_ROOT, 'services', 'web-kpa-society', 'src');
      if (!fs.existsSync(kpa)) return;
      const hits = walk(kpa).filter((f) => /main-site/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });

  describe('live 축이 쓰는 dependency 는 유지된다', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'apps', 'main-site', 'package.json'), 'utf-8')
    );

    it.each([
      '@o4o/auth-client',
      '@o4o/content-editor',
      '@o4o/ui',
      '@tanstack/react-query',
      'react-router-dom',
    ])('%s 는 dependencies 에 남아 있다', (dep) => {
      expect(pkg.dependencies).toHaveProperty(dep);
    });

    it('main.tsx 가 QueryClientProvider 를 유지한다 (@tanstack/react-query 가 ACTIVE_DEP 인 근거)', () => {
      const mainSrc = fs.readFileSync(path.join(MAIN_SITE_SRC, 'main.tsx'), 'utf-8');
      expect(mainSrc).toContain('QueryClientProvider');
    });
  });
});

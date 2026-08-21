/**
 * Forum Owner Area Commonization Regression Test
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 * 선행 census: IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1 (F31 · F34 = VIEW_DUPLICATED)
 *
 * census 기준 이 축은 4서비스에 3,103줄로 복제돼 있었고 GlycoPharm ↔ K-Cosmetics 는
 * 실질 차이가 accent 색과 이모지 placeholder 1줄뿐이었다. 공통 View 로 수렴한 뒤
 * **다시 복제로 돌아가지 못하게** 정적으로 고정한다.
 *
 * 검증 축
 *   1. 각 서비스 소유자 화면이 공통 컴포넌트를 소비한다 (자체 재구현 금지)
 *   2. 복제의 실체였던 대형 마크업(모달/목록/상태 분기)이 서비스 파일에 남아 있지 않다
 *   3. 서비스 차이는 config/theme/slot 으로만 표현된다 — 공통 컴포넌트에 서비스 분기가 없다
 *   4. 서비스별 정책이 보존된다 (Neture 회원관리 없음 / KPA 신청내역 통합 신청함 이전)
 *   5. accent 는 완성된 Tailwind 클래스 문자열이고, 소비 서비스의 tailwind content 가
 *      shared-space-ui 를 스캔한다 (조각 결합·purge 로 색이 사라지는 회귀 방지)
 *
 * 이 저장소에서 실행이 검증된 러너가 api-server jest 뿐이라 여기에 둔다
 * (kpa-boundary-regression.spec.ts · glycopharm-forum-service-boundary.spec.ts 와 같은 패턴).
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '../../../..');
const SHARED = path.join(REPO, 'packages/shared-space-ui/src/forum-owner');

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO, relPath), 'utf8');
}

function loc(relPath: string): number {
  return read(relPath).split('\n').length;
}

/** 주석(블록/라인/JSX)을 걷어낸 코드 라인만 남긴다. 문서 문구가 단언을 오염시키지 않게 한다. */
function codeOf(source: string): string {
  return source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return (
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('{/*')
      );
    })
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 대상 표 — census F31(대시보드) · F34(회원 관리)
// ─────────────────────────────────────────────────────────────────────────────

interface OwnerPage {
  service: string;
  file: string;
  component: 'ForumOwnerDashboard' | 'ForumOwnerMemberManagement';
  /** census 기준 공통화 이전 LOC */
  before: number;
}

const DASHBOARD_PAGES: OwnerPage[] = [
  { service: 'KPA-Society', file: 'services/web-kpa-society/src/pages/mypage/MyForumDashboardPage.tsx', component: 'ForumOwnerDashboard', before: 285 },
  { service: 'GlycoPharm', file: 'services/web-glycopharm/src/pages/forum/MyForumDashboardPage.tsx', component: 'ForumOwnerDashboard', before: 572 },
  { service: 'K-Cosmetics', file: 'services/web-k-cosmetics/src/pages/forum/MyForumDashboardPage.tsx', component: 'ForumOwnerDashboard', before: 581 },
  { service: 'Neture', file: 'services/web-neture/src/pages/supplier/MyForumDashboardPage.tsx', component: 'ForumOwnerDashboard', before: 576 },
];

const MEMBER_PAGES: OwnerPage[] = [
  { service: 'KPA-Society', file: 'services/web-kpa-society/src/pages/mypage/ForumMemberManagementPage.tsx', component: 'ForumOwnerMemberManagement', before: 381 },
  { service: 'GlycoPharm', file: 'services/web-glycopharm/src/pages/forum/ForumMemberManagementPage.tsx', component: 'ForumOwnerMemberManagement', before: 354 },
  { service: 'K-Cosmetics', file: 'services/web-k-cosmetics/src/pages/forum/ForumMemberManagementPage.tsx', component: 'ForumOwnerMemberManagement', before: 354 },
];

/** census 시점 이미 복제로 존재하던 4서비스 — 감축 폭 단언의 기준이 된다. */
const CENSUS_PAGES = [...DASHBOARD_PAGES, ...MEMBER_PAGES];

/**
 * census 이후 **채택**된 서비스.
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 (§7·§8) 에서 PharmacyHub 가
 * 소유자 영역을 공통 View 채택으로 신설했다. census 당시 NOT_IMPLEMENTED 였으므로
 * "복제 감축" 기준(before LOC)이 없다 — 따라서 총량 단언에는 넣지 않고,
 * 공통 소비 · 복제 지문 0 · wrapper 상한만 census 서비스와 동일하게 고정한다.
 *
 * 이 축의 목적은 "PharmacyHub 에 소유자 영역이 있는가"가 아니라
 * **있다면 반드시 공통 View 로만 존재하는가** 이다 (신규 복제 유입 차단).
 */
interface AdoptedOwnerPage {
  service: string;
  file: string;
  component: 'ForumOwnerDashboard' | 'ForumOwnerMemberManagement';
}

const ADOPTED_PAGES: AdoptedOwnerPage[] = [
  { service: 'Pharmacy-Hub', file: 'services/web-pharmacy-hub/src/pages/forum/MyForumDashboardPage.tsx', component: 'ForumOwnerDashboard' },
  { service: 'Pharmacy-Hub', file: 'services/web-pharmacy-hub/src/pages/forum/ForumMemberManagementPage.tsx', component: 'ForumOwnerMemberManagement' },
];

const ALL_PAGES = [...CENSUS_PAGES, ...ADOPTED_PAGES];

/** 서비스 어댑터 (endpoint 배선 + accent 만 담당) */
const ADAPTERS: Array<{ service: string; file: string }> = [
  { service: 'KPA-Society', file: 'services/web-kpa-society/src/api/forumOwnerAdapter.ts' },
  { service: 'GlycoPharm', file: 'services/web-glycopharm/src/services/forumOwnerAdapter.ts' },
  { service: 'K-Cosmetics', file: 'services/web-k-cosmetics/src/services/forumOwnerAdapter.ts' },
  { service: 'Neture', file: 'services/web-neture/src/services/forumOwnerAdapter.ts' },
  // WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §7·§8 채택분
  { service: 'Pharmacy-Hub', file: 'services/web-pharmacy-hub/src/services/forumOwnerAdapter.ts' },
];

/** 어댑터가 반드시 채워야 하는 accent 토큰 */
const THEME_TOKENS = [
  'accentText',
  'accentSolid',
  'accentSoft',
  'accentSoftText',
  'accentStrongText',
  'accentBadge',
  'accentIconBg',
  'accentRing',
  'accentHover',
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. 공통 컴포넌트 소비
// ─────────────────────────────────────────────────────────────────────────────

describe('소유자 화면은 공통 컴포넌트를 소비한다', () => {
  it.each(ALL_PAGES)('$service — $component 사용', ({ file, component }) => {
    const source = read(file);
    expect(source).toContain(`from '@o4o/shared-space-ui'`);
    expect(source).toContain(`<${component}`);
  });

  it('공통 컴포넌트가 barrel 로 export 된다', () => {
    const index = read('packages/shared-space-ui/src/index.ts');
    expect(index).toContain("export * from './forum-owner'");

    const ownerIndex = fs.readFileSync(path.join(SHARED, 'index.ts'), 'utf8');
    for (const name of [
      'ForumOwnerDashboard',
      'ForumOwnerMemberManagement',
      'createForumOwnerApi',
      'createForumOwnerMembershipApi',
    ]) {
      expect(ownerIndex).toContain(name);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. 대형 마크업 복제가 서비스에 남아 있지 않다
// ─────────────────────────────────────────────────────────────────────────────

describe('서비스 파일에 복제 마크업이 남아 있지 않다', () => {
  /** 복제의 실체였던 마크업/로직 지문 */
  const DUPLICATION_MARKERS = [
    'fixed inset-0 z-50', // 수정/삭제 모달 셸
    '포럼 정보 수정',
    '포럼 삭제 요청',
    '내가 운영 중인 포럼',
    '대기 중인 가입 신청이 없습니다',
    'STATUS_CONFIG',
  ];

  it.each(ALL_PAGES)('$service $component — 복제 지문 0', ({ file }) => {
    const source = read(file);
    const found = DUPLICATION_MARKERS.filter((m) => source.includes(m));
    expect(found).toEqual([]);
  });

  it.each(CENSUS_PAGES)('$service $component — LOC 가 이전 대비 크게 줄었다', ({ file, before }) => {
    const after = loc(file);
    expect(after).toBeLessThan(before);
    // 어댑터 주입 wrapper 수준(≤ 80줄)까지 내려왔는지 고정한다.
    expect(after).toBeLessThanOrEqual(80);
  });

  it.each(ADOPTED_PAGES)('$service $component — 채택분도 wrapper 상한(≤ 80줄)을 지킨다', ({ file }) => {
    expect(loc(file)).toBeLessThanOrEqual(80);
  });

  it('소유자 화면 총 LOC 가 census 기준(3,103) 대비 1/5 미만이다', () => {
    const beforeTotal = CENSUS_PAGES.reduce((sum, p) => sum + p.before, 0);
    const afterTotal = CENSUS_PAGES.reduce((sum, p) => sum + loc(p.file), 0);
    expect(beforeTotal).toBe(3103);
    expect(afterTotal).toBeLessThan(beforeTotal / 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. 공통 컴포넌트에 서비스 분기가 없다
// ─────────────────────────────────────────────────────────────────────────────

describe('공통 컴포넌트는 서비스를 모른다', () => {
  const SERVICE_TOKENS = [
    'glycopharm',
    'GlycoPharm',
    'k-cosmetics',
    'K-Cosmetics',
    'kcosmetics',
    'kpa-society',
    'KPA',
    'neture',
    'Neture',
    'pharmacy-hub',
    'serviceType',
    'serviceKey',
  ];

  const sharedFiles = fs
    .readdirSync(SHARED)
    .filter((f) => /\.tsx?$/.test(f));

  it.each(sharedFiles)('%s — 서비스 식별자/분기 없음', (fileName) => {
    const source = fs.readFileSync(path.join(SHARED, fileName), 'utf8');
    // 주석은 census/WO 설명에 서비스명을 쓰므로 코드 라인만 본다.
    const found = SERVICE_TOKENS.filter((t) => codeOf(source).includes(t));
    expect(found).toEqual([]);
  });

  it('accent 하드코딩(브랜드 색) 이 공통 컴포넌트에 없다', () => {
    const BRAND_COLORS = ['emerald-', 'pink-', 'blue-', 'indigo-'];
    for (const fileName of sharedFiles) {
      const source = fs.readFileSync(path.join(SHARED, fileName), 'utf8');
      const codeLines = codeOf(source);
      for (const color of BRAND_COLORS) {
        expect(`${fileName}:${codeLines.includes(color)}`).toBe(`${fileName}:false`);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. 서비스별 정책 보존
// ─────────────────────────────────────────────────────────────────────────────

describe('서비스 고유 정책이 보존된다', () => {
  it('Neture — 폐쇄형 회원 관리 동선을 만들지 않는다 (memberManageHref 미주입)', () => {
    const page = read('services/web-neture/src/pages/supplier/MyForumDashboardPage.tsx');
    // 주석은 "왜 주지 않는가" 를 설명하므로 코드 라인만 본다.
    expect(codeOf(page)).not.toContain('memberManageHref');
    // 회원 관리 route/page 자체도 신설하지 않았다.
    expect(fs.existsSync(path.join(REPO, 'services/web-neture/src/pages/supplier/ForumMemberManagementPage.tsx'))).toBe(false);
  });

  it('Neture — 공급자 공간 basePath 를 유지한다', () => {
    const page = read('services/web-neture/src/pages/supplier/MyForumDashboardPage.tsx');
    expect(page).toContain("forumHomeHref: '/supplier/forum'");
    expect(page).toContain("requestFormHref: '/supplier/forum/request-category'");
  });

  it('KPA — 신청 내역은 통합 신청함으로 유지 (fetchMyRequests 미주입 + 안내 slot)', () => {
    const adapter = read('services/web-kpa-society/src/api/forumOwnerAdapter.ts');
    expect(adapter).not.toContain('fetchMyRequests:');

    const page = read('services/web-kpa-society/src/pages/mypage/MyForumDashboardPage.tsx');
    expect(page).toContain('noticeSlot');
    expect(page).toContain('/mypage/my-requests?entityType=forum_category');
  });

  it('KPA — 마이페이지 소속(레이아웃 · 네비 · route) 유지', () => {
    const dash = read('services/web-kpa-society/src/pages/mypage/MyForumDashboardPage.tsx');
    expect(dash).toContain('MyPageLayout');

    const members = read('services/web-kpa-society/src/pages/mypage/ForumMemberManagementPage.tsx');
    expect(members).toContain('MyPageNavigation');
    expect(members).toContain("backHref=\"/mypage/my-forums\"");
  });

  it('GlycoPharm / K-Cosmetics — 회원 관리 동선과 basePath 유지', () => {
    for (const svc of ['glycopharm', 'k-cosmetics']) {
      const page = read(`services/web-${svc}/src/pages/forum/MyForumDashboardPage.tsx`);
      expect(page).toContain('memberManageHref');
      expect(page).toContain("forumHomeHref: '/forum'");
      expect(page).toContain('/forum/my-dashboard/');
    }
  });

  it('서비스별 이모지 예시가 유지된다 (GP 💊 / KCos 💄)', () => {
    expect(read('services/web-glycopharm/src/pages/forum/MyForumDashboardPage.tsx')).toContain('💊');
    expect(read('services/web-k-cosmetics/src/pages/forum/MyForumDashboardPage.tsx')).toContain('💄');
  });

  /**
   * WO-O4O-CI-FORUM-OWNER-AREA-COMMONIZATION-TEST-BASELINE-RECOVERY-V1
   *
   * 이전 단언은 census 시점 사실("PharmacyHub 는 소유자 영역이 없다")을 그대로 고정했다.
   * 그 뒤 WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 이 PH 소유자 영역을
   * **공통 View 채택**으로 신설했으므로(복제가 아니다) 그 단언은 낡았다.
   *
   * 이 축이 실제로 지켜야 할 계약은 "없어야 한다"가 아니라
   * **"PH 의 ForumOwner 소비는 공통 View wrapper + adapter 3곳뿐"** 이다.
   * 즉 PH 안에 소유자 화면을 다시 구현한 파일이 생기면 실패한다.
   */
  it('Pharmacy-Hub — 소유자 영역은 공통 View 채택으로만 존재한다 (자체 재구현 0)', () => {
    const phDir = path.join(REPO, 'services/web-pharmacy-hub/src');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && fs.readFileSync(full, 'utf8').includes('ForumOwner')) {
          hits.push(path.relative(phDir, full).split(path.sep).join('/'));
        }
      }
    };
    walk(phDir);

    // 허용되는 소비처는 이 3곳뿐이다 — 늘어나면 복제 회귀로 본다.
    expect(hits.sort()).toEqual([
      'pages/forum/ForumMemberManagementPage.tsx',
      'pages/forum/MyForumDashboardPage.tsx',
      'services/forumOwnerAdapter.ts',
    ]);

    // 그리고 그 소비는 공통 컴포넌트/factory 여야 한다 (자체 구현 금지).
    const dash = read('services/web-pharmacy-hub/src/pages/forum/MyForumDashboardPage.tsx');
    const members = read('services/web-pharmacy-hub/src/pages/forum/ForumMemberManagementPage.tsx');
    const adapter = read('services/web-pharmacy-hub/src/services/forumOwnerAdapter.ts');
    expect(dash).toContain(`from '@o4o/shared-space-ui'`);
    expect(members).toContain(`from '@o4o/shared-space-ui'`);
    expect(adapter).toContain('createForumOwnerApi');
    expect(adapter).toContain('createForumOwnerMembershipApi');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. accent / Tailwind 스캔 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe('accent 주입과 Tailwind 스캔', () => {
  it.each(ADAPTERS)('$service — accent 토큰 9개를 모두 채운다', ({ file }) => {
    const source = read(file);
    for (const token of THEME_TOKENS) {
      expect(source).toContain(`${token}:`);
    }
  });

  it.each(ADAPTERS)('$service — accent 는 완성된 클래스 문자열이다 (조각 결합 금지)', ({ file }) => {
    const source = read(file);
    // `text-${c}-600` 같은 동적 조합은 Tailwind JIT 가 스캔하지 못한다.
    expect(source).not.toMatch(/['"`](?:text|bg|border|ring|hover:[a-z-]+)-\$\{/);
  });

  it('소유 서비스 5곳의 tailwind content 가 shared-space-ui 를 스캔한다', () => {
    for (const svc of ['web-kpa-society', 'web-glycopharm', 'web-k-cosmetics', 'web-neture', 'web-pharmacy-hub']) {
      const config = read(`services/${svc}/tailwind.config.js`);
      expect(`${svc}:${config.includes('packages/shared-space-ui/src')}`).toBe(`${svc}:true`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. adapter 중복 최소화
// ─────────────────────────────────────────────────────────────────────────────

describe('API adapter 중복이 최소화됐다', () => {
  it('매핑/정규화는 공통 factory 가 단독 소유한다', () => {
    const adapterSource = fs.readFileSync(path.join(SHARED, 'adapter.ts'), 'utf8');
    for (const fn of ['mapOwnedForum', 'mapForumRequest', 'mapJoinRequest', 'mapForumMember']) {
      expect(adapterSource).toContain(`export function ${fn}`);
    }
  });

  it.each(ADAPTERS)('$service — 자체 mapper 를 다시 정의하지 않는다', ({ file }) => {
    const source = read(file);
    for (const fn of ['function mapOwnedForum', 'function mapJoinRequest', 'function mapForumMember', 'function unwrapList']) {
      expect(source).not.toContain(fn);
    }
    expect(source).toContain('createForumOwnerApi');
  });

  it.each(ADAPTERS)('$service — adapter 는 배선 수준으로 짧다', ({ file }) => {
    expect(loc(file)).toBeLessThanOrEqual(70);
  });
});

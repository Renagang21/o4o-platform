/**
 * WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §17
 *
 * PharmacyHub 커뮤니티 capability adoption 의 계약을 고정한다.
 *
 * 이번 adoption 은 backend 변경이 0 이다 — PH 는 이미 존재하는 공통 계약
 * (`/api/v1/pharmacy-hub/forum/*` 공통 service forum router, `/api/v1/forum/category-requests`,
 * `/api/v1/forum/operator/*`) 을 client/화면에서 소비하기만 한다.
 * 따라서 이 spec 은 (1) 공통 backend 계약이 PH 를 수용하는지 (2) PH frontend 가
 * 서비스 경계를 지키며 공통 View 를 채택했는지 두 축을 정적으로 고정한다.
 */

import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf8');

const PH_WEB = 'services/web-pharmacy-hub/src';

const forumApi = read(`${PH_WEB}/services/forumApi.ts`);
const forumOwnerAdapter = read(`${PH_WEB}/services/forumOwnerAdapter.ts`);
const appTsx = read(`${PH_WEB}/App.tsx`);
const navigation = read(`${PH_WEB}/config/navigation.ts`);
const requestPage = read(`${PH_WEB}/pages/forum/RequestForumPage.tsx`);
const dashboardPage = read(`${PH_WEB}/pages/forum/MyForumDashboardPage.tsx`);
const memberPage = read(`${PH_WEB}/pages/forum/ForumMemberManagementPage.tsx`);
const listPage = read(`${PH_WEB}/pages/forum/ForumListPage.tsx`);
const detailPage = read(`${PH_WEB}/pages/forum/ForumDetailPage.tsx`);
const serviceCatalog = read('apps/api-server/src/config/service-catalog.ts');
const phRoutes = read('apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts');
const categoryRequestRoutes = read('apps/api-server/src/routes/forum/forum-category-request.routes.ts');
const serviceForumRoutes = read('apps/api-server/src/routes/forum/service-forum.routes.ts');
const closedForumPanel = read('packages/shared-space-ui/src/ClosedForumJoinPanel.tsx');
const sharedIndex = read('packages/shared-space-ui/src/index.ts');

/** 주석은 계약이 아니다 — 경계 검사는 실제 코드에만 적용한다. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ 	]*\/\/.*$/gm, '');

const forumApiCode = stripComments(forumApi);

// ─────────────────────────────────────────────────────────────────────────────
// §5 포럼 개설 신청 (P0)
// ─────────────────────────────────────────────────────────────────────────────

describe('§5 포럼 개설 신청 — 회원 → 신청 → 내 현황 → 운영자 큐', () => {
  it('service-catalog 가 pharmacy-hub 를 알고 있다(공통 신청 API 의 serviceCode 검증 통과 조건)', () => {
    expect(serviceCatalog).toContain("key: 'pharmacy-hub'");
  });

  it('공통 신청 API 는 serviceCode 로 서비스를 판정한다(PH 전용 endpoint 신설 없음)', () => {
    expect(categoryRequestRoutes).toContain('serviceCode');
    expect(categoryRequestRoutes).not.toContain('pharmacy-hub');
  });

  it('PH client 는 공통 신청 endpoint 에 serviceCode=pharmacy-hub 로 제출한다', () => {
    expect(forumApi).toContain("api.post('/forum/category-requests'");
    expect(forumApi).toContain("serviceCode: 'pharmacy-hub'");
  });

  it('내 신청 현황도 공통 endpoint + serviceCode 로 조회한다', () => {
    expect(forumApi).toContain("'/forum/category-requests/my?serviceCode=pharmacy-hub'");
  });

  it('운영자 심사 큐는 기존 공통 operator endpoint 를 그대로 쓴다', () => {
    expect(forumApi).toContain("const OPERATOR_BASE = '/forum/operator'");
    expect(forumApi).toContain("const SVC = 'serviceCode=pharmacy-hub'");
    expect(forumApi).toContain('getRequests');
    expect(forumApi).toContain('review');
  });

  it('신청 화면은 공통 ForumRequestForm wrapper 다(자체 폼 구현 금지)', () => {
    expect(requestPage).toContain("from '@o4o/shared-space-ui'");
    expect(requestPage).toContain('ForumRequestForm');
    expect(requestPage).toContain('createPharmacyHubForumCategoryRequest');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6 비공개(closed) 포럼 가입
// ─────────────────────────────────────────────────────────────────────────────

describe('§6 비공개 포럼 가입 — 공통 membership 계약 소비', () => {
  it('공통 forum router 가 membership endpoint 를 제공한다(PH 마운트 대상)', () => {
    expect(serviceForumRoutes).toContain('/categories/:id/join-requests');
    expect(serviceForumRoutes).toContain('/categories/:id/membership-status');
    expect(serviceForumRoutes).toContain('/categories/:id/members');
  });

  it('PH 는 서비스 스코프 base 로만 membership 을 호출한다(generic unscoped API 신설 금지 §15)', () => {
    expect(forumApi).toContain("const FORUM_BASE = '/pharmacy-hub/forum'");
    expect(forumApi).toContain('${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/join-requests');
    expect(forumApi).toContain('${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/membership-status');
  });

  it('가입 신청 패널은 공통 컴포넌트로 제공된다(서비스별 복제 금지 §4)', () => {
    expect(sharedIndex).toContain('ClosedForumJoinPanel');
    expect(closedForumPanel).toContain('getMembershipStatus');
    expect(closedForumPanel).toContain('requestJoin');
    expect(closedForumPanel).toContain('ALREADY_MEMBER');
    expect(closedForumPanel).toContain('PENDING_REQUEST');
  });

  it('PH 목록·상세는 403 CLOSED_FORUM_ACCESS_DENIED 를 가입 동선으로 바꾼다', () => {
    expect(forumApi).toContain("CLOSED_FORUM_ACCESS_DENIED");
    expect(listPage).toContain('ClosedForumJoinPanel');
    expect(detailPage).toContain('ClosedForumJoinPanel');
    expect(detailPage).toContain('closedForumIdFromError');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7·§8·§9 내 포럼 대시보드 / 회원 관리 / 삭제 요청
// ─────────────────────────────────────────────────────────────────────────────

describe('§7·§8·§9 포럼 소유자 영역 — 공통 View 채택', () => {
  it('대시보드·회원관리 화면은 공통 View wrapper 다', () => {
    expect(dashboardPage).toContain('ForumOwnerDashboard');
    expect(memberPage).toContain('ForumOwnerMemberManagement');
    expect(dashboardPage).toContain("from '@o4o/shared-space-ui'");
    expect(memberPage).toContain("from '@o4o/shared-space-ui'");
  });

  it('adapter 는 공통 factory 에 PH 호출 함수만 주입한다', () => {
    expect(forumOwnerAdapter).toContain('createForumOwnerApi');
    expect(forumOwnerAdapter).toContain('createForumOwnerMembershipApi');
    // 신청 내역 섹션을 켠다 — §5 의 "내 신청 현황" 을 이 화면이 함께 담당한다
    expect(forumOwnerAdapter).toContain('fetchMyRequests: fetchMyPharmacyHubForumRequests');
  });

  it('소유자 API 는 공통 라우터 경로 계약을 그대로 쓴다', () => {
    expect(forumApi).toContain('${FORUM_BASE}/categories/mine');
    expect(forumApi).toContain('/owner`');
    expect(forumApi).toContain('/delete-request`');
  });

  it('삭제는 요청(운영자 심사)만 있고 소유자 직접 hard delete 를 만들지 않는다 §9', () => {
    expect(forumApi).toContain('requestDeletePharmacyHubForum');
    // hard delete 는 기존 운영자 전용 API 에만 존재한다
    const ownerSection = forumApi.slice(forumApi.indexOf('requestDeletePharmacyHubForum'));
    expect(ownerSection).not.toContain('/hard?');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §14 navigation parity / dead link 0
// ─────────────────────────────────────────────────────────────────────────────

describe('§14 navigation — 기능 존재 + 진입점 없음 상태를 남기지 않는다', () => {
  const NEW_ROUTES = ['/forum/request', '/forum/my-dashboard'];

  it.each(NEW_ROUTES)('%s route 가 App.tsx 에 등재돼 있다', (route) => {
    expect(appTsx).toContain(`path="${route}"`);
  });

  it('회원 관리 route 가 등재돼 있다', () => {
    expect(appTsx).toContain('path="/forum/my-dashboard/:forumId/members"');
  });

  it.each(NEW_ROUTES)('%s 가 공개 navigation 에 노출된다', (route) => {
    expect(navigation).toContain(`href: '${route}'`);
  });

  it('새 커뮤니티 route 는 MembershipGate 뒤에 있다(권한 모델 신설 없음 §15)', () => {
    const block = appTsx.slice(
      appTsx.indexOf('path="/forum/request"'),
      appTsx.indexOf('path="/forum/my-posts"') > appTsx.indexOf('path="/forum/request"')
        ? appTsx.indexOf('path="/forum/my-posts"')
        : appTsx.length,
    );
    expect(block).toContain('MembershipGate');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15 cross-service isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('§15 서비스 경계 — cross-service mixing 0', () => {
  it('PH forum client 는 다른 서비스 base 를 호출하지 않는다', () => {
    for (const other of ['/kpa/forum', '/cosmetics/forum', '/glycopharm/forum', '/neture/forum']) {
      expect(forumApiCode).not.toContain(other);
    }
  });

  it('공통 base 를 쓰는 호출은 전부 serviceCode=pharmacy-hub 를 동반한다', () => {
    // query string 또는 body 어느 쪽이든 serviceCode 가 붙어야 한다.
    const re = /['`]\/forum\/[^'`]*['`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(forumApiCode)) !== null) {
      if (m[0].includes('/forum/operator')) continue; // svcQuery()/SVC 로 별도 부착
      const callSite = forumApiCode.slice(m.index, m.index + 200);
      expect(callSite).toMatch(/serviceCode(=|: ')pharmacy-hub/);
    }
  });

  it('PH forum 마운트는 공통 factory + PH serviceKey/쓰기 가드다(backend 무변경)', () => {
    expect(phRoutes).toContain('createServiceForumRouter({');
    expect(phRoutes).toContain("scope: 'community'");
    expect(phRoutes).toContain('requireActiveServiceMembership(SERVICE_KEY)');
  });
});

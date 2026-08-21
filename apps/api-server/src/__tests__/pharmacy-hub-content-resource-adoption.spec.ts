/**
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §18
 *
 * PH Content/Resource adoption 의 계약을 고정한다.
 *
 * 이번 adoption 은 **신규 backend API 0 / 신규 table 0 / migration 0** 이다 —
 * PH 는 이미 존재하는 공통 CMS 조회 API(`/api/v1/cms/contents`)와 공통 View
 * (`@o4o/shared-space-ui` ResourcesHubTemplate)를 소비하기만 한다.
 * 따라서 이 spec 은 (1) 공통 backend 계약이 serviceKey 로 PH 를 수용하는지
 * (2) PH frontend 가 서비스 경계를 지키며 공통 View 를 복제 없이 채택했는지 고정한다.
 */

import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf8');

const PH_WEB = 'services/web-pharmacy-hub/src';

const resourcesApi = read(`${PH_WEB}/lib/api/pharmacyHubResources.ts`);
const resourcesPage = read(`${PH_WEB}/pages/resources/PharmacyHubResourcesPage.tsx`);
const appTsx = read(`${PH_WEB}/App.tsx`);
const navigation = read(`${PH_WEB}/config/navigation.ts`);
const communityHome = read(`${PH_WEB}/pages/community/CommunityHomePage.tsx`);
const cmsQueryHandler = read('apps/api-server/src/routes/cms-content/cms-content-query.handler.ts');
const cmsMutationHandler = read('apps/api-server/src/routes/cms-content/cms-content-mutation.handler.ts');
const phRoutes = read('apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts');
const sharedIndex = read('packages/shared-space-ui/src/index.ts');

/** 주석은 계약이 아니다 — 경계 검사는 실제 코드에만 적용한다. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const resourcesApiCode = stripComments(resourcesApi);
const resourcesPageCode = stripComments(resourcesPage);

// ─────────────────────────────────────────────────────────────────────────────
// §8 모델 판정 — SHARED_CORE_WITH_SERVICE_SCOPE (cms_contents + serviceKey)
// ─────────────────────────────────────────────────────────────────────────────

describe('§8 Content/Resource 모델 — 공통 원장 + serviceKey 경계', () => {
  it('공통 CMS 조회 API 는 serviceKey 로 서비스를 필터한다(PH 전용 endpoint 신설 없음)', () => {
    expect(cmsQueryHandler).toContain('where.serviceKey = serviceKey as string');
  });

  it('공통 CMS 쓰기 인가는 serviceKey 파생이다 — PH 전용 allowlist 가 필요 없다', () => {
    expect(cmsMutationHandler).toContain('`${serviceKey}:admin`');
    expect(cmsMutationHandler).toContain('`${serviceKey}:operator`');
    // 서비스명 하드코딩 allowlist 가 재등장하면 PH 는 다시 막힌다(LMS operator 축의 실패 유형).
    expect(stripComments(cmsMutationHandler)).not.toContain("'pharmacy-hub'");
  });

  it('PH 전용 content/resource backend route 를 신설하지 않았다(§14 tier 1 재사용)', () => {
    const code = stripComments(phRoutes);
    expect(code).not.toContain("'/resources'");
    expect(code).not.toContain("'/contents'");
    expect(code).not.toContain('ContentQueryService');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 공통 View 채택 — 복제 0
// ─────────────────────────────────────────────────────────────────────────────

describe('§9 자료실 View — 공통 ResourcesHubTemplate 채택', () => {
  it('공통 패키지가 템플릿을 export 한다', () => {
    expect(sharedIndex).toContain('ResourcesHubTemplate');
  });

  it('PH 페이지는 공통 템플릿 wrapper 다(PH 전용 ResourceTable 복제 금지)', () => {
    expect(resourcesPage).toContain("from '@o4o/shared-space-ui'");
    expect(resourcesPage).toContain('ResourcesHubTemplate');
    expect(resourcesPage).toContain('ResourcesHubConfig');
  });

  it('shared View 내부에 serviceKey 분기를 누적하지 않는다 — 주입은 config 로만 한다', () => {
    expect(resourcesPageCode).toContain("serviceKey: 'pharmacy-hub'");
    const template = read('packages/shared-space-ui/src/ResourcesHubTemplate.tsx');
    expect(stripComments(template)).not.toContain('pharmacy-hub');
  });

  it('learner 화면에 operator 기능을 섞지 않는다 §13 (등록·수정·삭제 액션 없음)', () => {
    for (const opAction of ['createAction', 'getEditHref', 'onDelete', 'onBulkDelete']) {
      expect(resourcesPageCode).not.toContain(opAction);
    }
  });

  it('empty / loading / error 상태 문구를 config 로 제공한다', () => {
    expect(resourcesPage).toContain('emptyMessage');
    expect(resourcesPage).toContain('emptyFilteredMessage');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7 cross-service isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('§7 서비스 경계 — cross-service mixing 0', () => {
  it('PH client 는 공통 CMS API 를 serviceKey=pharmacy-hub 로만 호출한다', () => {
    expect(resourcesApiCode).toContain("const SERVICE_KEY = 'pharmacy-hub'");
    expect(resourcesApiCode).toContain('serviceKey: SERVICE_KEY');
  });

  it('PH client 는 다른 서비스 base 를 호출하지 않는다', () => {
    for (const other of ['/kpa/', '/cosmetics/', '/glycopharm/', '/neture/']) {
      expect(resourcesApiCode).not.toContain(other);
    }
  });

  it('상세 조회는 UUID 단독이라 클라이언트에서 serviceKey 를 재확인한다(Boundary Guard #1 보완)', () => {
    expect(resourcesApiCode).toContain('PH_RESOURCE_SERVICE_MISMATCH');
  });

  it('조회 실패를 빈 목록으로 삼키지 않는다(load-error 계약)', () => {
    expect(resourcesApiCode).toContain('PH_RESOURCE_LIST_FAILED');
    expect(resourcesApiCode).toContain('PH_RESOURCE_DETAIL_FAILED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §12 route / navigation adoption
// ─────────────────────────────────────────────────────────────────────────────

describe('§12 navigation — route 고립 0 / dead link 0', () => {
  it('/resources route 가 App.tsx 에 등재돼 있다', () => {
    expect(appTsx).toContain('path="/resources"');
  });

  it('/resources 는 MembershipGate 뒤에 있다(권한 모델 신설 없음)', () => {
    const idx = appTsx.indexOf('path="/resources"');
    expect(appTsx.slice(idx, idx + 300)).toContain('MembershipGate');
  });

  it('/resources 가 공개 navigation 에 노출된다', () => {
    expect(navigation).toContain("href: '/resources'");
  });

  it('구현되지 않은 /content 링크를 navigation 에 만들지 않는다 §10·§12', () => {
    expect(navigation).not.toContain("href: '/content'");
    expect(appTsx).not.toContain('path="/content"');
  });

  it('커뮤니티 홈은 backend 가 공급하지 않는 자료 탭을 만들지 않는다(빈 탭 금지)', () => {
    const tabsBlock = communityHome.slice(
      communityHome.indexOf('const LATEST_TABS'),
      communityHome.indexOf('export default'),
    );
    expect(tabsBlock).not.toContain("key: 'resource'");
  });
});

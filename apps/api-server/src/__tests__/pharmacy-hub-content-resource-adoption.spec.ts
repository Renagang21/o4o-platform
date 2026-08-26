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
    // WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1:
    //   serviceKey 는 이제 opt-in 필터가 아니라 **강제 read 경계**이며,
    //   alias 집합(kpa/kpa-society)을 위해 `In(scope.serviceKeys)` 로 들어간다.
    expect(cmsQueryHandler).toContain('where.serviceKey = In(scope.serviceKeys)');
    expect(cmsQueryHandler).toContain('CMS_SERVICE_KEY_REQUIRED_ERROR');
  });

  it('공통 CMS 쓰기 인가는 serviceKey 파생이다 — PH 전용 allowlist 가 필요 없다', () => {
    // WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1:
    //   파생은 유지하되 **role scope 축으로 접어서** 파생한다. `${serviceKey}:operator` 를
    //   그대로 조립하면 KPA(kpa ↔ kpa-society)·KCos(cosmetics ↔ k-cosmetics)가 항상 어긋난다.
    //   PH 는 self-map 이라 resolveCmsRolePrefix('pharmacy-hub') === 'pharmacy-hub' 로 동일하다.
    expect(cmsMutationHandler).toContain('resolveCmsRolePrefix(serviceKey)');
    expect(cmsMutationHandler).toContain('`${rolePrefix}:admin`');
    expect(cmsMutationHandler).toContain('`${rolePrefix}:operator`');
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

  /**
   * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 (audit #27)
   *
   * 이전 WO 는 "등록·수정·삭제 액션 없음"을 §13 의 표현으로 얼려 두었다. 그런데 KPA 정본에서
   * 자료 등록·수정은 **회원 capability** 다 (`/resources/new`, `/resources/:id/edit` — 로그인만
   * 요구하고 operator role 을 요구하지 않는다). 따라서 PH 미보유는 §13 준수가 아니라
   * MISSING_ADOPTION 이었다.
   *
   * §13 이 실제로 금지하는 것은 **남의 자료를 편집·삭제하는 운영자 축**이다. 그 경계를 얼린다:
   *   금지(운영자 축) : getEditHref · onDelete · onBulkDelete
   *   허용(회원 축)   : createAction · getOwnerEditHref · onOwnerDelete (+ getCurrentUserId 로 소유자 판정)
   */
  it('learner 화면에 operator 축(남의 자료 편집·삭제)을 섞지 않는다 §13', () => {
    for (const opAction of ['getEditHref', 'onDelete', 'onBulkDelete']) {
      expect(resourcesPageCode).not.toContain(opAction);
    }
  });

  it('회원 자신의 자료 등록·수정 축은 공통 template 슬롯으로 연결한다 (#27)', () => {
    expect(resourcesPageCode).toContain('createAction');
    expect(resourcesPageCode).toContain('getOwnerEditHref');
    // 소유자 판정 없이 owner 액션을 노출하지 않는다.
    expect(resourcesPageCode).toContain('getCurrentUserId');
  });

  /**
   * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §7 (production defect)
   *   회원 등록 자료는 `draft` 로 시작하는데 목록이 `status: 'published'` 로 고정돼 있어
   *   등록자가 자기 자료를 다시 찾을 수 없었다 → `getOwnerEditHref` 수정 경로가 도달 불가.
   *   콘텐츠 목록과 같은 `mine` 축을 둔다(백엔드 `mine=true` 는 이미 존재 — 신규 API 0).
   */
  it('등록자가 자기 자료(초안·검토중)에 도달하는 축이 있다 — 수정 경로 고립 0', () => {
    expect(resourcesApiCode).toContain("mine ? { mine: 'true' } : { status: 'published' }");
    expect(resourcesPageCode).toContain('listPharmacyHubResources');
    expect(resourcesPageCode).toContain("'전체 자료'");
    expect(resourcesPageCode).toContain("'내 자료'");
  });

  it('자료 등록·수정 링크와 route 가 짝을 이룬다(데드링크 0)', () => {
    const appTsx = read('services/web-pharmacy-hub/src/App.tsx');
    expect(resourcesPageCode).toContain("href: '/resources/new'");
    expect(appTsx).toContain('path="/resources/new"');
    expect(resourcesPageCode).toContain('/resources/${id}/edit');
    expect(appTsx).toContain('path="/resources/:id/edit"');
  });

  it('없는 DELETE API 를 부르지 않는다 — 회원 삭제는 archived 전이다 (§3 금지 패턴)', () => {
    const api = stripComments(read('services/web-pharmacy-hub/src/lib/api/pharmacyHubResources.ts'));
    expect(api).not.toMatch(/api\.delete\(/);
    expect(api).toContain("setPharmacyHubResourceStatus(id, 'archived')");
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

  it('공통 GlobalHeader 가 children 을 렌더하지 않으므로 실제 진입점을 별도로 둔다 §12', () => {
    // packages/ui GlobalHeader 는 nav item 의 children 을 렌더하지 않는다(플랫폼 공통 제약).
    // 따라서 자료실은 커뮤니티 홈 카드 + footer 라는 실렌더 진입점을 함께 가진다.
    expect(communityHome).toContain("href: '/resources'");
    const footerBlock = navigation.slice(navigation.indexOf('PH_FOOTER_SECTIONS'));
    expect(footerBlock).toContain("href: '/resources'");
  });

  /*
   * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §2·§6:
   *   이 두 계약은 "PH 에 Content 가 없다"는 **당시 사실**을 고정한 것이었다.
   *   §6 에서 회원 Content 가 실제로 구현됐고 §2 에서 backend 최신활동 축도 추가됐으므로,
   *   같은 취지(빈 탭·데드링크 금지)를 **현재 사실 기준**으로 다시 고정한다.
   */
  it('/content 링크와 route 가 짝을 이룬다(데드링크 0)', () => {
    expect(navigation).toContain("href: '/content'");
    expect(appTsx).toContain('path="/content"');
  });

  it('최신활동 탭은 backend 가 실제로 공급하는 축만 노출한다(빈 탭 금지)', () => {
    const tabsBlock = communityHome.slice(
      communityHome.indexOf('const LATEST_TABS'),
      communityHome.indexOf('export default'),
    );
    const phRoutes = read('apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts');
    const latestBlock = phRoutes.slice(
      phRoutes.indexOf("homeRouter.get("),
      phRoutes.indexOf("router.use('/home'"),
    );
    for (const axis of ['forum', 'course', 'content', 'resource']) {
      if (!tabsBlock.includes(`key: '${axis}'`)) continue;
      expect(latestBlock).toContain(`'${axis}'`);
    }
    // 반대 방향 — backend 가 공급하는 축은 탭으로 노출된다(고립 축 0).
    expect(tabsBlock).toContain("key: 'content'");
    expect(tabsBlock).toContain("key: 'resource'");
  });
});

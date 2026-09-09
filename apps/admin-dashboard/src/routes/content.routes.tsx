import { Navigate, Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

/**
 * WO-O4O-ADMIN-POSTS-CATEGORIES-TAGS-LEGACY-REDIRECT-V1
 *
 * WordPress 계열 legacy 화면(/posts · /categories · /posts/tags)의 백엔드 route 는
 * 2025-12-11 `6354e8755` (Phase 8-3 Legacy Entity Removal) 에서 Post/Page 엔티티와 함께
 * 의도적으로 제거되었다. 화면만 남아 직접 URL 로 접근하면 조작 가능한 관리 화면처럼 보이지만
 * 조회·저장 모두 404 로 실패한다.
 *
 * 판정 근거: docs/investigations/IR-O4O-ADMIN-CONTENT-CATEGORIES-LEGACY-ROUTE-AUDIT-V1.md (REMOVE)
 *
 * 외부 bookmark 사용을 코드로 배제할 수 없으므로 hard delete 가 아니라 redirect 로 둔다.
 * 컴포넌트 파일과 backend route 복구는 이번 범위 밖이다.
 * 대상 화면은 카테고리 기능의 등가물이 아니라 현재 살아 있는 CMS 콘텐츠 화면이다.
 */
const LEGACY_CONTENT_REDIRECT = '/admin/cms/contents';

// 글 관리 — Posts/Categories/CategoryEdit/Tags 는 위 legacy redirect 로 대체되어 참조하지 않는다.
// 페이지 관리(PagesRouter/PageList)도 동일하게 legacy redirect 로 대체했다
// (WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1).

// Content Core Shell Pages (WO-O4O-OPERATOR-NAV-CONTENT-SHELL-V1)
const ContentOverviewPage = lazy(() => import('@/pages/content'));
const ContentAssetsPage = lazy(() => import('@/pages/content/assets'));
const ContentAssetDetailPage = lazy(() => import('@/pages/content/assets/[assetId]'));
const ContentPoliciesPage = lazy(() => import('@/pages/content/policies'));
const ContentAnalyticsPage = lazy(() => import('@/pages/content/analytics'));

// CMS V2 Pages (Phase C-2.5 & C-3)

// CMS V2 Visual Designer (Phase C-3)

// CMS Content Admin (P3: WO-P3-CMS-ADMIN-CRUD-P0)
const CMSContentList = lazy(() => import('@/pages/cms/contents/CMSContentList'));

// CMS Slot Management (P3: WO-P3-CMS-SLOT-MANAGEMENT-P1)
const CMSSlotList = lazy(() => import('@/pages/cms/slots/CMSSlotList'));

// [RETIRED] CMS Channel Management — WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1

// [RETIRED] Channel Operations Dashboard — WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1

// Ops Metrics Dashboard (NEXT: WO-NEXT-OPS-METRICS-P0)
const OpsMetricsDashboard = lazy(() => import('@/pages/ops/OpsMetricsDashboard'));

// CPT Engine
const CPTEngine = lazy(() => import('@/pages/cpt-engine'));
const FormPresets = lazy(() => import('@/pages/cpt-engine/presets/FormPresets'));
const ViewPresets = lazy(() => import('@/pages/cpt-engine/presets/ViewPresets'));
const TemplatePresets = lazy(() => import('@/pages/cpt-engine/presets/TemplatePresets'));

// CPT/ACF Router

// Media & Custom Fields
const MediaLibrary = lazy(() => import('@/pages/media/Media'));
// Content Resource — media_assets 관리 (WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1)
const ContentResourceMediaAssets = lazy(() => import('@/pages/content-resource/MediaAssetsPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Content routes — posts, categories, pages, content core, CMS V2, CPT, media, analytics
 */
export function ContentRoutes() {
  return [
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 제거 내역
    //
    //   조사 정본: docs/investigations/IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1.md
    //
    //   [1] CMS V2 13 routes — `/admin/cms/{cpts,fields,views,pages}` 계열 + `views/:id/designer`
    //       **백엔드가 없다.** `apps/api-server/src/modules/cms/` 에는 entity 만 있고
    //       라우트·컨트롤러 0건, `register-routes.ts` 미등록이다. `/api/v1/cms` 에 마운트되는 것은
    //       `cms-content.routes.ts`(contents · slots · stats) 뿐이다.
    //       프로덕션 실측 404 — 2026-08-10 `/api/v1/cms/fields` · `/api/v1/cms/cpts`.
    //       화면 5개 디렉터리 · ViewComponentRegistry 등록 10건 · `lib/cms.ts` dead 메서드도 함께 제거.
    //       ⚠ entity 와 `cms_cpts`·`cms_fields`·`cms_views`·`cms_pages` 테이블은 **보존**한다.
    //
    //   [2] `/content/collections` — 화면 주석에 "기능 미구현 · DB 미구현 · Mock 데이터 없음" 명시.
    //       `/content` shell 의 Collections 타일도 함께 제거해 데드링크를 남기지 않았다.
    //
    //   [3] `/analytics/*` — 21줄 "분석 페이지는 개발 중입니다" 플레이스홀더. 메뉴 진입점 0건.
    //
    //   [4] `/acf/*` · `/acf/groups` — `/admin/custom-field-groups` 를 호출하는데 그 백엔드는
    //       저장소 전체에 **0 refs** 다. 프로덕션 호출 0건.
    //
    //   [5] `/admin/cpt-acf/*` — 하위 16 routes 전부가 14줄
    //       "Temporarily disabled for CI/CD compatibility" 스텁 컴포넌트(9개)였다.
    //
    //   ⓘ `/cpt-engine/*` 는 **유지**한다. 백엔드 `/api/v1/cpt/*` 는 41 endpoint 가 실재하며
    //     삭제 판정에는 외부 소비처 전수조사가 선행돼야 한다(별도 WO). 메뉴 미연결 상태 유지.
    // 글 관리 · 카테고리 & 태그 — legacy redirect (WO-O4O-ADMIN-POSTS-CATEGORIES-TAGS-LEGACY-REDIRECT-V1)
    //   guard 를 두지 않는다. 이동 대상 /admin/cms/contents 가 자체 guard 를 갖고 있고,
    //   dead 화면 접근을 권한 오류로 막는 것보다 현재 화면으로 보내는 편이 목적에 맞다.
    <Route key="/posts" path="/posts" element={
      <Navigate to={LEGACY_CONTENT_REDIRECT} replace />
    } />,
    <Route key="/posts/categories" path="/posts/categories" element={
      <Navigate to={LEGACY_CONTENT_REDIRECT} replace />
    } />,
    <Route key="/categories" path="/categories" element={
      <Navigate to={LEGACY_CONTENT_REDIRECT} replace />
    } />,
    <Route key="/categories/new" path="/categories/new" element={
      <Navigate to={LEGACY_CONTENT_REDIRECT} replace />
    } />,
    <Route key="/categories/edit/:id" path="/categories/edit/:id" element={
      <Navigate to={LEGACY_CONTENT_REDIRECT} replace />
    } />,
    <Route key="/posts/tags" path="/posts/tags" element={
      <Navigate to={LEGACY_CONTENT_REDIRECT} replace />
    } />,

    // 페이지 관리 — legacy `/posts` API(404) 기반 화면이라 위 redirect 와 동일 처리한다.
    <Route key="/pages/*" path="/pages/*" element={
      <Navigate to={LEGACY_CONTENT_REDIRECT} replace />
    } />,

    // Content Core Shell (WO-O4O-OPERATOR-NAV-CONTENT-SHELL-V1)
    <Route key="/content" path="/content" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentOverviewPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/assets" path="/content/assets" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentAssetsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/assets/:assetId" path="/content/assets/:assetId" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentAssetDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/policies" path="/content/policies" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentPoliciesPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/analytics" path="/content/analytics" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentAnalyticsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CMS V2 관리 (Phase C-2.5)
    // CPT Routes

    // Field Routes

    // View Routes

    // Visual Designer Route (Phase C-3)

    // Page Routes

    // CMS Content Routes (P3: WO-P3-CMS-ADMIN-CRUD-P0)
    <Route key="/admin/cms/contents" path="/admin/cms/contents" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSContentList />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CMS Slot Routes (P3: WO-P3-CMS-SLOT-MANAGEMENT-P1)
    <Route key="/admin/cms/slots" path="/admin/cms/slots" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSSlotList />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // [RETIRED] /admin/cms/channels · /admin/cms/channels/ops
    //   WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1
    //   프로덕션 channels 0행. canonical 재생 경로는 Tablet ScreenSet 축이다.
    //   (여기의 'channels' 는 CMS 방송 채널이며, 매장 판매채널 organization_channels 와 무관하다.)

    // Ops Metrics Dashboard (NEXT: WO-NEXT-OPS-METRICS-P0)
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 백엔드 경계로 정렬
    //   `/api/v1/admin/ops/metrics` = `authenticate` + `requireAdmin`(platform:super_admin 전용).
    //   메뉴에서는 CMS 그룹의 `운영 상태` 로 재배치했다 — 응답의 실데이터가
    //   `lockedSlots`·`emptyCriticalSlots`·`expiredContents` 세 개뿐이고
    //   `channels`·`services`·`opsStatus` 는 Channel 축 은퇴로 하드코딩 0 이기 때문이다.
    <Route key="/admin/ops/metrics" path="/admin/ops/metrics" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <OpsMetricsDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 미디어 관리
    <Route key="/media/*" path="/media/*" element={
      <AdminProtectedRoute requiredPermissions={['media:read']}>
        <Suspense fallback={<PageLoader />}>
          <MediaLibrary />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Content Resource — Media Assets 관리 (WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1)
    //   media_assets(/platform/media-library) metadata 조회·수정. 레거시 /media(/content/media)와 별개.
    <Route key="/content-resource/media-assets" path="/content-resource/media-assets" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentResourceMediaAssets />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 분석

    // CPT Engine - New Unified Dashboard
    <Route key="/cpt-engine/*" path="/cpt-engine/*" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <CPTEngine />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CPT Presets
    <Route key="/cpt-engine/presets/forms" path="/cpt-engine/presets/forms" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <FormPresets />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/cpt-engine/presets/views" path="/cpt-engine/presets/views" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <ViewPresets />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/cpt-engine/presets/templates" path="/cpt-engine/presets/templates" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <TemplatePresets />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CPT/ACF Archive & Forms

    // ACF Legacy Routes
  ];
}

import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';
import { AppRouteGuard } from '@/components/AppRouteGuard';


// WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
//   Yaksa Community 화면 3건(`@o4o/forum-core-yaksa/src/admin-ui/pages/*`) 의 동적 import 제거.
//   `@o4o/forum-core-yaksa` Vite alias 와 `packages/forum-yaksa` 패키지를 함께 제거했다.

// Pharmacy AI Insight (Phase 5 - Active)
const PharmacyAiInsightSummary = lazy(() => import('@o4o/pharmacy-ai-insight').then(m => ({ default: m.SummaryPage })));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * App routes — pharmacy AI
 */
export function AppRoutes() {
  return [
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1:
    //   Forum 관리자 화면 6개 라우트(/forum · /forum/boards · /forum/categories ·
    //   /forum/posts/:id · /forum/posts/new · /forum/posts/:id/edit) 와 admin 로컬
    //   `pages/forum` 을 제거했다.
    //
    //   판정 근거 (IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1 §5-2):
    //     - Dashboard/Boards/Categories 는 **서비스 커뮤니티의 일상 운영** 기능이며
    //       플랫폼 구조 관리가 아니다.
    //     - 각 서비스 operator 콘솔에 이미 정본이 있다 — KPA Society 는 포럼 5개 메뉴
    //       (포럼 운영 / 신청 관리 / 목록 관리 / 삭제 요청 / 분석,
    //        `services/web-kpa-society/src/config/operatorMenuGroups.ts` forum 그룹).
    //     - 관리자 사이트발 프로덕션 호출은 30일간 `/api/v1/forum/categories` 2건뿐이었다
    //       (같은 기간 서비스 프런트발 `/api/v1/forum*` 은 400건+).
    //     - Dashboard 화면은 `/forum/users` · `/forum/moderation` 로 이동하는
    //       **데드링크 2건**을 갖고 있었다(라우트 미정의 → catch-all).
    //
    //   ⚠ 공용 자산은 건드리지 않는다:
    //     - `@o4o/forum-core` 패키지(admin-ui 포함) 와 `packages/forum-core/src/index.ts`
    //       재수출은 그대로 둔다. 공용 모듈이며 이 WO 의 범위가 아니다.
    //     - 백엔드 `/api/v1/forum` · `/api/v1/kpa/forum` 도 그대로 둔다 —
    //       서비스 프런트가 실사용 중이다.
    //     - `components/routing/ViewComponentRegistry.ts` 의 forum view 4건은
    //       manifest 기반 동적 라우팅용 등록이며 사이드바·라우트와 별개다 → 보존.


    // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
    //   /yaksa/communities 계열 3개 라우트 제거.
    //   `forum-yaksa` 는 app_registry 에 등록된 적이 없어 AppRouteGuard 가 항상
    //   /error/app-disabled 로 리다이렉트했고, admin 메뉴 진입점도 0건이었다.
    //   백엔드 라우트(`createRoutes`)와 호출 대상 API(`/yaksa/forum/communities/*`) 도
    //   구현이 존재하지 않았다 — 상세 근거는
    //   docs/checks/WO-O4O-FORUM-YAKSA-AND-LEGACY-BUILD-TEST-RESIDUE-BOUNDARY-AUDIT-V1-CHECK.md
    //   현재 운영 중인 공용 포럼(/forum 계열, /api/v1/forum · /api/v1/kpa/forum)은 영향 없음.

    // Pharmacy AI Insight - 약사 전용 AI 인사이트 (Phase 5)
    <Route key="/pharmacy-ai-insight" path="/pharmacy-ai-insight" element={
      <AdminProtectedRoute requiredPermissions={['pharmacy-ai-insight.read']}>
        <AppRouteGuard appId="pharmacy-ai-insight">
          <Suspense fallback={<PageLoader />}>
            <PharmacyAiInsightSummary />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/pharmacy-ai-insight/summary" path="/pharmacy-ai-insight/summary" element={
      <AdminProtectedRoute requiredPermissions={['pharmacy-ai-insight.read']}>
        <AppRouteGuard appId="pharmacy-ai-insight">
          <Suspense fallback={<PageLoader />}>
            <PharmacyAiInsightSummary />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // WO-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1:
    //   /cgm-pharmacist 계열 5개 라우트 제거.
    //   `cgm-pharmacist-app` 은 app_registry 에 등록된 적이 없어 AppRouteGuard 가
    //   항상 /error/app-disabled 로 리다이렉트하던 도달 불가 라우트였다.

    // WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1 (C축):
    //   /sellerops/* 라우트와 admin 로컬 pages/sellerops (10파일) 을 제거했다.
    //   근거:
    //     - appId 'sellerops' 는 app_registry 에 등록된 적이 없어(프로덕션 6행 실측)
    //       AppRouteGuard 가 항상 /error/app-disabled 로 리다이렉트하던 도달 불가 라우트다.
    //     - 9개 화면 중 8개가 setTimeout 데모 데이터였고, 유일한 write 인
    //       ListingCreatePage 의 POST /sellerops/listings 는 api-server 에 존재하지 않았다.
    //     - 진입 네비게이션 0건 · appsCatalog appId 등록 0건
    //       (WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1 에서 이미 제거됨).
    //     - 판매자(플랫폼 직접판매) 축은 PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE.
    //   serviceGroup id 'sellerops' 는 살아 있는 카탈로그 항목('market-trial')이
    //   소비하므로 유지한다. ('cosmetics-seller-extension' 은
    //   WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1 에서 제거되었다.)

    // WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1 (A축):
    //   /supplierops/* 라우트와 admin 로컬 pages/supplierops (11파일) 을 제거했다.
    //   판정 LEGACY_DEAD. 근거:
    //     - appId 'supplierops' 는 appsCatalog 에도 app_registry 에도 없다
    //       (프로덕션 app_registry 6행 실측 · 카탈로그 appId 등록 0건) →
    //       AppRouteGuard 가 항상 /error/app-disabled 로 보내던 도달 불가 라우트.
    //     - 진입 네비게이션 0건 · ViewComponentRegistry 등록 0건.
    //     - 13화면 중 4화면(Dashboard/Profile/Orders/Settlement)은 setTimeout 데모,
    //       3화면은 이미 안내 페이지로 대체돼 있었다.
    //     - 공급자 화면의 canonical 면은 Neture 다
    //       (CLAUDE.md Priority Chain 3-A). admin-dashboard 는 공급자 canonical 면이 아니다.
    //     - 기존 가드가 legacy `supplier` role literal 기반이라 WO §6 의 등록 조건
    //       (active membership + service scope + canonical role + org ownership) 을
    //       충족하지 못한다 → "파일이 존재한다"는 이유로 재등록하지 않는다(WO §5).
    //   backend(/kpa/supplier/*, /neture/supplier/csv-import/*)는 건드리지 않았다.
    //   serviceGroup id 'supplierops' 는 multi-tenant 소비처가 있어 유지한다.

    // WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS-AND-POST-REFACTOR-FINAL-CLOSURE-V1 (B축):
    //   /partnerops/* 라우트(8경로)와 admin 로컬 pages/partnerops (PartnerOpsRouter ·
    //   PartnerOpsGuidePage) 를 제거했다. 판정 LEGACY_DEAD_SURFACE. 근거:
    //     - `/api/v1/partnerops/*` 8개 엔드포인트 전부 프로덕션 404 실측
    //       (선행 WO-O4O-PARTNEROPS-AFFILIATE-SURFACE-RETIRE-OR-GUIDE-V1 에서
    //        `packages/partnerops` 제거 후 백엔드 라우터가 남지 않았다).
    //     - 8경로가 이미 전부 안내 페이지 1장으로 수렴해 있었다 → 실기능 0.
    //     - 진입 네비게이션 0건 · ViewComponentRegistry 등록도 함께 제거.
    //     - 가드가 legacy `partner` role literal 기반이라 canonical RBAC(F9) 계약
    //       바깥이다 → "파일이 존재한다"는 이유로 재등록하지 않는다.
    //   유지한 것(제거 금지):
    //     - serviceGroup id 'partnerops' — appsCatalog 의 살아 있는 항목
    //       'partner-core' 가 소비한다(sellerops/supplierops 선례와 동일).
    //     - appsCatalog appId 'partnerops' 항목과 프로덕션 `app_registry` 의
    //       active 행 — 운영 데이터이므로 WO §6.2 에 따라 손대지 않고 보고한다.
    //     - Neture 파트너 · partner-core 계약(F7) · partner_* 테이블은 별개 축이다.
  ];
}

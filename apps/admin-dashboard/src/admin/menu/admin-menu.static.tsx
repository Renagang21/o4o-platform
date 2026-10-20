/**
 * Admin Menu — O4O 플랫폼 관리자 사이트 메뉴 정본
 *
 * **이 파일이 `admin.neture.co.kr` 사이드바의 유일한 SSOT 다.**
 *
 * WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 (3단계)
 *   전수조사 결과에 따라 정보구조를 재편했다.
 *   조사 정본: `docs/investigations/IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1.md`
 *
 * 파일명의 `static` 은 역사적 이름이다. 과거에는 `/api/v1/navigation/admin` 이 정본이고 이 파일이
 * fallback 이었으나, 그 endpoint 는 Phase R1 이후 영구 stub(`data: []`)이었고
 * WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1 에서 backend stub 과
 * `useAdminMenu` 의 API 분기를 모두 제거했다. 이 파일이 유일한 메뉴 정본이다.
 *
 * ## 사이트의 역할 (2026-09-09 확정)
 *
 * `admin.neture.co.kr` = **O4O 플랫폼 전체 관리자 사이트**.
 *   - 서비스 전반 설정과 운영자 권한
 *   - 공통 상품/기준 데이터
 *   - 전 서비스 공통 콘텐츠·CMS 정책
 *   - 플랫폼 차원 집계
 *
 * 다음은 이 사이트의 대상이 **아니다** — 각 서비스의 `/operator` 콘솔이 정본이다.
 *   - 특정 서비스 전용 업무 (KPA·K-Cosmetics·PharmacyHub·Neture)
 *   - 서비스별 게시판·콘텐츠 일상 운영
 *   - 개별 매장 업무 / 매장 실행 자산 제작
 *
 * ## 이번 재편에서 제거한 항목과 근거 (IR §5-2)
 *
 * | 제거 | 근거 |
 * |---|---|
 * | `Forum` 그룹 3항목 | 서비스 커뮤니티 일상 운영. KPA operator 콘솔에 포럼 5개 메뉴가 이미 정본으로 존재 |
 * | `Yaksa (KPA)` 그룹 4항목 | KPA 전용. `KPA_SCOPE_CONFIG.platformBypass=false` + `blockedServicePrefixes:['platform',…]` → **플랫폼 관리자는 구조적으로 403** |
 * | `CMS > Post Types·Fields·Views·Pages` | **백엔드 부재.** `modules/cms/` 는 entities 만 있고 라우트 0건·미등록 → 프로덕션 404 실측 |
 * | `Content > Collections` | 화면 주석에 "기능 미구현 · DB 미구현" 명시 |
 * | `매장 네트워크` · `오프라인 매장` | 이름과 달리 **Cosmetics 단일 서비스** 집계(`cosmetics_stores` + `checkout_orders`). K-Cosmetics operator 에 매장 관리·주문 현황이 이미 존재 |
 * | `Content Manager` | 748줄 **목업** — API 호출 0건, 하드코딩 샘플 데이터 |
 * | `Insights` 구분선 | 하위 항목이 재배치되어 그룹이 소멸 |
 *
 * 제거는 **관리자 진입점 기준**이다. 백엔드 API·엔티티·테이블은 이 WO 에서 삭제하지 않는다
 * (`checkout_orders` = 공급자→매장 B2B 주문 정본 · `physical_stores` · `/api/v1/cpt/*` 포함).
 *
 * ## 이름을 실제 범위에 맞춘 항목
 *
 * - `Ops Metrics` → `CMS 그룹 > 운영 상태`.
 *   응답의 `channels`·`services`·`opsStatus` 는 Channel 축 은퇴로 **하드코딩 0** 이고, 실데이터는
 *   `lockedSlots`·`emptyCriticalSlots`·`expiredContents` **셋 뿐**이다. 즉 CMS 콘텐츠·슬롯 상태
 *   지표이므로 CMS 그룹이 정확한 위치다. `Ops`/`Insights` 라는 이름은 실제 범위를 과장했다.
 * - `Digital Signage > Content Hub` → `사이니지 콘텐츠 조회`.
 *   browse-only 이고 `serviceKey` 가 `'neture'` **하드코딩**이다(`v2/ContentHub.tsx`).
 *   전 서비스 공통 자산 통제 기능이 아니므로 이름에서 그 함의를 뺀다.
 *
 * 2026-10-19 정리: AppStore·사이니지 조회·동영상 제작 제거. 정책 안내는 작업 화면 도움말로 이동.
 * 근거: WO-O4O-ADMIN-MENU-TIDY-PHASE1-V1. 공용 모듈 상태 판정과 서비스 운영 기능은 유지.
 *
 * ## 메뉴 가시성은 인가 경계가 아니다
 *
 * 실제 인가는 route guard(`AdminProtectedRoute`)와 백엔드가 담당한다. 다만 백엔드가
 * `platform:super_admin` 만 허용하는 화면은 `config/rolePermissions.ts` 에서 같은 경계를 선언해
 * **쓸 수 없는 메뉴를 보여주지 않는다** (`admin-menu-route-backend-alignment.test.ts` 가 고정).
 */

import { ReactElement } from 'react';
import {
  LayoutDashboard,
  Database,
  Package,
  Settings,
  Users,
  FileText,
  BarChart2,
  ClipboardList,
  Activity,
  Image,
  Layers,
  Shield,
  Coins,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: ReactElement;
  path?: string;
  separator?: boolean;
  children?: MenuItem[];
  // WO-O4O-ADMIN-RBAC-LEGACY-AND-NAVIGATION-CLEANUP-CONSOLIDATED-V1:
  //   `roles` 메타데이터 제거. 메뉴 가시성 게이트는 rolePermissions.ts 의 menuPermissions +
  //   hasMenuPermission(menuId 기준)이 담당하며, 이 필드는 useAdminMenu 가 pass-through 할 뿐
  //   어디에서도 읽히지 않는 dead metadata 였다(무효 형식 'platform_admin' 까지 섞여 있었음).
}

/**
 * 관리자 메뉴 트리
 *
 * ```text
 * 관리자 홈                  /admin
 * 계정 · 운영 권한 / 약국 협력사업 / 플랫폼 HUB
 * 관리 설정                  권한 할당 · 서비스 운영자 · 포인트 운영 · 플랫폼 설정
 * O4O 상품 DB                 기존 7개 업무 유지(상세 재배치는 후속)
 * 콘텐츠·자료                 자료 안내 · 미디어 라이브러리
 * 콘텐츠 게시                 콘텐츠 관리 · 게시 위치 · 운영 상태
 * ```
 */
export const adminMenuStatic: MenuItem[] = [
  // ============================================
  // OVERVIEW
  // ============================================
  {
    id: 'dashboard',
    label: '관리자 홈',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/admin',
  },

  // ============================================
  // PLATFORM HUB — 유일한 진짜 플랫폼 전역 집계 화면
  //   KPA(kpa_members / kpa_applications / forum_post) + Neture(neture_suppliers /
  //   product_approvals) 를 한 화면에 모은다. 백엔드 guard = platform:super_admin.
  // ============================================
  { id: 'platform-account-governance', label: '계정 · 운영 권한', icon: <Layers className="w-5 h-5" />, path: '/admin/platform' },
  { id: 'semi-franchise-registry', label: '약국 협력사업', icon: <Layers className="w-5 h-5" />, path: '/admin/semi-franchises' },
  { id: 'pharmacy-service-settings', label: '약국 서비스 설정', icon: <Layers className="w-5 h-5" />, path: '/admin/pharmacy-service-settings' },
  {
    id: 'platform-hub',
    label: '플랫폼 HUB',
    icon: <Layers className="w-5 h-5" />,
    path: '/admin/platform/hub',
  },

  // ============================================
  // CORE — 사람 · 권한 · 금융 · 설정 (Admin 거버넌스)
  //   CLAUDE.md §11 — Admin = 구조 + 정책 + 거버넌스 + 금융
  // ============================================
  {
    id: 'core',
    label: '관리 설정',
    icon: <Shield className="w-5 h-5" />,
    children: [
      // WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 / WO-O4O-ADMIN-USERS-RBAC-CONSOLE-REPOSITIONING-V1
      // 두 entry 는 동일 RBAC SSOT (`role_assignments`) 위의 다른 facet preset:
      //   /users     — 전체 권한 할당 (assignment-row, 모든 role)
      //   /operators — 운영 권한(admin/operator/super_admin) preset 적용 + Add/Revoke
      // 둘 다 `/api/v1/admin/users` 를 소비하므로 같은 경계(platform:super_admin)를 쓴다.
      {
        id: 'core-users',
        label: '권한 할당',
        icon: <Users className="w-4 h-4" />,
        path: '/users',
      },
      {
        id: 'core-operators',
        label: '서비스 운영자',
        icon: <Shield className="w-4 h-4" />,
        path: '/operators',
      },
      // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: '분회 서비스 가입 승인'(core-kpa-branch-service-members) 제거.
      //   서비스 회원 가입 승인은 그 서비스 운영자(kpa-branch:admin)가 분회 서비스 화면에서 한다.
      //   Admin 은 서비스 운영자만 지정한다.
      // WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1
      //   포인트 운영은 금액성 write(지급/차감)를 가진 화면이라 Admin 거버넌스 그룹에 둔다.
      //   백엔드 `/api/v1/points/admin/*` = requireAuth + requireAdmin(platform:super_admin).
      {
        id: 'core-points',
        label: '포인트 운영',
        icon: <Coins className="w-4 h-4" />,
        path: '/operator/points',
      },
      {
        id: 'core-settings',
        label: '플랫폼 설정',
        icon: <Settings className="w-4 h-4" />,
        path: '/settings',
      },
    ],
  },

  // ============================================
  // O4O PRODUCT DB (공공/공통 기본 상품 DB)
  // WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
  //
  // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1:
  //   사이드바 5항목 ↔ 화면 내 탭 7항목이 어긋나 있었다(`ProductDbLayout.tsx` TABS).
  //   누락된 `설명서 검수`(프로덕션 쓰기 실사용) · `이미지 상태` 를 등재해 **1:1 로 정합**시킨다.
  //   route 는 이미 존재하며(`o4o-product-db.routes.tsx`) 신규 화면·API 는 없다.
  // ============================================
  {
    id: 'o4o-product-db',
    label: 'O4O 상품 DB',
    icon: <Database className="w-5 h-5" />,
    children: [
      {
        id: 'o4o-product-db-overview',
        label: '현황',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/admin/o4o-product-db/overview',
      },
      {
        id: 'o4o-product-db-candidates',
        label: '공공데이터 후보',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/o4o-product-db/candidates',
      },
      {
        // WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P2)
        id: 'o4o-product-db-store-requests',
        label: '상품 등록 요청',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/o4o-product-db/store-requests',
      },
      {
        id: 'o4o-product-db-masters',
        label: '기본 상품',
        icon: <Package className="w-4 h-4" />,
        path: '/admin/o4o-product-db/masters',
      },
      {
        // WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
        id: 'o4o-product-db-supplier-store-descriptions',
        label: '설명서 검수',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/o4o-product-db/supplier-store-descriptions',
      },
      {
        id: 'o4o-product-db-image-quality',
        label: '이미지 상태',
        icon: <Image className="w-4 h-4" />,
        path: '/admin/o4o-product-db/image-quality',
      },
      {
        id: 'o4o-product-db-maintenance',
        label: '데이터 정비',
        icon: <Settings className="w-4 h-4" />,
        path: '/admin/o4o-product-db/maintenance',
      },
    ],
  },

  // ============================================
  // CONTENT — 공통 콘텐츠 자산 · 정책
  //   `Collections` 제거(기능 미구현 명시). 독립 `Policies` 는 1차 정비에서 제거하고
  //   미디어·콘텐츠·게시 위치 화면의 관리 도움말로 옮겼다.
  //   `Assets` → `미디어 라이브러리`(/content-resource/media-assets) 로 교체하고 `Analytics` 를 제거했다
  //   (WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1).
  //   둘 다 cms_media 하나에 의존했고 그 테이블은 운영에 존재한 적이 없어 상시 500 이었다.
  // ============================================
  {
    id: 'content',
    label: '콘텐츠·자료',
    icon: <FileText className="w-5 h-5" />,
    children: [
      {
        id: 'content-overview',
        label: '자료 안내',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/content',
      },
      {
        // WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1:
        //   깨진 `Assets`(/content/assets · cms_media) 진입점을 미디어 정본 화면으로 교체한다.
        //   대상 = media_assets · /api/v1/platform/media-library*.
        id: 'content-media-library',
        label: '미디어 라이브러리',
        icon: <Image className="w-4 h-4" />,
        path: '/content-resource/media-assets',
      },
    ],
  },

  // ============================================
  // CMS
  //   실동작 축은 `cms_contents` · `cms_content_slots` 둘이다.
  //   [REMOVED] Post Types / Fields / Views / Pages —
  //     `/api/v1/cms/{cpts,fields,views,pages}` 백엔드가 존재하지 않아 프로덕션 404 였다.
  //     entity(`modules/cms/entities`)와 테이블은 보존한다(삭제는 별도 판정).
  //   [RETIRED] cms-channels / cms-channel-ops — WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-...-V1
  // ============================================
  {
    id: 'cms',
    label: '콘텐츠 게시',
    icon: <Database className="w-5 h-5" />,
    children: [
      {
        id: 'cms-contents',
        label: '콘텐츠 관리',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/contents',
      },
      {
        id: 'cms-slots',
        label: '게시 위치',
        icon: <Layers className="w-4 h-4" />,
        path: '/admin/cms/slots',
      },
      {
        // 구 `Ops Metrics`. 실데이터가 CMS 슬롯·콘텐츠 상태 3개(lockedSlots /
        // emptyCriticalSlots / expiredContents)뿐이므로 CMS 그룹이 정확한 위치다.
        id: 'ops-metrics',
        label: '운영 상태',
        icon: <Activity className="w-4 h-4" />,
        path: '/admin/ops/metrics',
      },
    ],
  },
];

// WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1
//   'Reports'(신상신고) 메뉴 그룹 3개 leaf 제거 — `/reporting/*` API 가 백엔드에 mount 된 적이 없다.
//
// WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1
//   약사회 전용 Membership 4개 메뉴 제거(@o4o/membership-yaksa 패키지와 함께).

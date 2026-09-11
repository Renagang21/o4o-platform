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
 *   - 플랫폼 전역 사용자·역할·권한
 *   - 공통 상품/기준 데이터
 *   - 전 서비스 공통 콘텐츠·CMS 정책
 *   - 공통 AppStore
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
  Monitor,
  Image,
  Layers,
  Shield,
  Coins,
  UserCheck,
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
 * Overview                  /admin
 * 플랫폼 HUB                 /admin/platform/hub
 * Core                      RBAC · 운영자 · 분회 서비스 가입 승인 · 포인트 · 설정
 * O4O 상품 DB                공통 기준 상품 데이터 (화면 내 탭과 1:1)
 * Content                   공통 콘텐츠 자산·정책
 * CMS                       Contents · Slots · 운영 상태
 * AppStore                  Browse Apps
 * 사이니지 콘텐츠 조회        /admin/digital-signage/content
 * ```
 */
export const adminMenuStatic: MenuItem[] = [
  // ============================================
  // OVERVIEW
  // ============================================
  {
    id: 'dashboard',
    label: 'Overview',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/admin',
  },

  // ============================================
  // PLATFORM HUB — 유일한 진짜 플랫폼 전역 집계 화면
  //   KPA(kpa_members / kpa_applications / forum_post) + Neture(neture_suppliers /
  //   product_approvals) 를 한 화면에 모은다. 백엔드 guard = platform:super_admin.
  // ============================================
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
    label: 'Core',
    icon: <Shield className="w-5 h-5" />,
    children: [
      // WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 / WO-O4O-ADMIN-USERS-RBAC-CONSOLE-REPOSITIONING-V1
      // 두 entry 는 동일 RBAC SSOT (`role_assignments`) 위의 다른 facet preset:
      //   /users     — 전체 권한 할당 (assignment-row, 모든 role)
      //   /operators — 운영 권한(admin/operator/super_admin) preset 적용 + Add/Revoke
      // 둘 다 `/api/v1/admin/users` 를 소비하므로 같은 경계(platform:super_admin)를 쓴다.
      {
        id: 'core-users',
        label: 'RBAC Role Assignments',
        icon: <Users className="w-4 h-4" />,
        path: '/users',
      },
      {
        id: 'core-operators',
        label: 'Service Operators',
        icon: <Shield className="w-4 h-4" />,
        path: '/operators',
      },
      // WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1
      //   kpa-branch 서비스 가입 승인/반려. 서비스 전용 업무지만 "사람·권한" 축이고,
      //   백엔드 `/api/v1/kpa-branch/admin/service-members*` 는 kpa-society 와 달리
      //   platformBypass 라 플랫폼 관리자가 정상 통과한다. 승인 = service_memberships 만
      //   (분회 소속 branch_memberships 는 분회 운영자 콘솔이 정본 — 여기서 결합하지 않는다).
      {
        id: 'core-kpa-branch-service-members',
        label: '분회 서비스 가입 승인',
        icon: <UserCheck className="w-4 h-4" />,
        path: '/admin/kpa-branch/service-members',
      },
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
        label: 'Platform Settings',
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
  //   `Collections` 제거(기능 미구현 명시). `Policies` 는 데이터 화면이 아니라
  //   content-core 의 Owner/Status/Visibility 정책 **안내 문서** 화면이므로 이름을 맞춘다.
  // ============================================
  {
    id: 'content',
    label: 'Content',
    icon: <FileText className="w-5 h-5" />,
    children: [
      {
        id: 'content-overview',
        label: 'Overview',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/content',
      },
      {
        id: 'content-assets',
        label: 'Assets',
        icon: <Image className="w-4 h-4" />,
        path: '/content/assets',
      },
      {
        id: 'content-policies',
        label: '정책 안내',
        icon: <Shield className="w-4 h-4" />,
        path: '/content/policies',
      },
      {
        id: 'content-analytics',
        label: 'Analytics',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/content/analytics',
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
    label: 'CMS',
    icon: <Database className="w-5 h-5" />,
    children: [
      {
        id: 'cms-contents',
        label: 'Contents',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/contents',
      },
      {
        id: 'cms-slots',
        label: 'Slots',
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

  // ============================================
  // APPSTORE — 공통 앱 카탈로그 (`app_registry`)
  // ============================================
  {
    id: 'appstore',
    label: 'AppStore',
    icon: <Package className="w-5 h-5" />,
    children: [
      {
        id: 'appstore-browse',
        label: 'Browse Apps',
        icon: <Package className="w-4 h-4" />,
        path: '/apps/store',
      },
    ],
  },

  // ============================================
  // 사이니지 콘텐츠 조회 (browse-only)
  //   그룹에 자식이 하나뿐이라 최상위 leaf 로 평탄화했다.
  //   `serviceKey='neture'` 하드코딩 상태이므로 플랫폼 전역 자산 통제 기능이 아니다.
  //   전 서비스 공통 사이니지 정책 화면은 현재 존재하지 않는다(신설 시 별도 WO).
  // ============================================
  {
    id: 'digital-signage-content',
    label: '사이니지 콘텐츠 조회',
    icon: <Monitor className="w-5 h-5" />,
    path: '/admin/digital-signage/content',
  },
];

// WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1
//   'Reports'(신상신고) 메뉴 그룹 3개 leaf 제거 — `/reporting/*` API 가 백엔드에 mount 된 적이 없다.
//
// WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1
//   약사회 전용 Membership 4개 메뉴 제거(@o4o/membership-yaksa 패키지와 함께).

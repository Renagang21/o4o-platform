/**
 * Admin Menu Static Config
 *
 * WO-ADMIN-MENU-FALLBACK-STATIC-V1
 * Static fallback menu for when Navigation API is unavailable.
 *
 * Structure: Overview / Core / Content / Services / Insights
 * This file replaces the deprecated wordpressMenuFinal.tsx
 *
 * @see docs/architecture/admin-goal-state-definition.md
 */

import { ReactElement } from 'react';
import {
  LayoutDashboard,
  Database,
  Palette,
  Package,
  Settings,
  Users,
  FileText,
  UserCheck,
  BarChart2,
  ClipboardList,
  Activity,
  Monitor,
  Image,
  Calendar,
  TrendingUp,
  MessageSquare,
  Layers,
  Shield,
  Briefcase,
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
 * Static fallback menu items
 *
 * Structure:
 * +-- Overview (Dashboard)
 * +-- Core (Users, Operators, Membership, Settings)
 * +-- Content
 * +-- CMS
 * +-- AppStore
 * +-- Forum
 * +-- Services (Yaksa, Digital Signage)
 * +-- Insights (Ops Metrics, Content Manager, Reports)
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
  // CORE
  // ============================================
  {
    id: 'core',
    label: 'Core',
    icon: <Shield className="w-5 h-5" />,
    children: [
      // WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 / WO-O4O-ADMIN-USERS-RBAC-CONSOLE-REPOSITIONING-V1
      // 두 entry 는 동일 RBAC SSOT (`role_assignments`) 위의 다른 facet preset:
      //   /users     — 전체 권한 할당 (assignment-row, 모든 role) · platform super_admin 전용
      //   /operators — 운영 권한(admin/operator/super_admin) preset 적용 + Add/Revoke
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
      {
        id: 'core-membership',
        label: 'Membership',
        icon: <UserCheck className="w-4 h-4" />,
        path: '/admin/membership/dashboard',
      },
      {
        id: 'core-membership-members',
        label: 'Members',
        icon: <Users className="w-4 h-4" />,
        path: '/admin/membership/members',
      },
      {
        id: 'core-membership-verifications',
        label: 'Verifications',
        icon: <UserCheck className="w-4 h-4" />,
        path: '/admin/membership/verifications',
      },
      // WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-MENU-ROUTE-AND-EMPTY-STATE-V1
      //   회원 분류 관리 화면(CategoryManagement)은 route 는 이미 존재했으나
      //   (yaksa.routes.tsx — /admin/membership/categories) 메뉴 진입점이 없어
      //   어디에서도 들어갈 수 없는 상태였다. 기존 route 를 그대로 재사용하고
      //   Membership 3개 항목 바로 뒤(회원 관리 묶음 안)에 메뉴만 연결한다.
      //   노출 범위는 rolePermissions.ts 의 menuPermissions 로 platform 관리자 역할에 한정한다.
      {
        id: 'core-membership-categories',
        label: 'Member Categories',
        icon: <Layers className="w-4 h-4" />,
        path: '/admin/membership/categories',
      },
      // WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1
      //   포인트 운영은 금액성 write(지급/차감) 를 가진 화면이라 Admin 영역에 배치한다
      //   (CLAUDE.md §11 — Admin = 구조 + 정책 + 거버넌스 + **금융**).
      //   이 메뉴에 'Admin' 이라는 별도 그룹은 없고, RBAC·Operators·Membership·Platform Settings 를
      //   담은 `Core` 그룹이 Admin 거버넌스 그룹에 해당하므로 여기에 넣는다(신규 그룹 생성 없음).
      //   화면 자체 guard 는 admin·super_admin 이며 변경하지 않는다.
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
  // O4O PRODUCT DB (공공/공통 기본 상품 DB — read-only)
  // WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
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
        id: 'o4o-product-db-maintenance',
        label: '데이터 정비',
        icon: <Settings className="w-4 h-4" />,
        path: '/admin/o4o-product-db/maintenance',
      },
    ],
  },

  // Content
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
        id: 'content-collections',
        label: 'Collections',
        icon: <Layers className="w-4 h-4" />,
        path: '/content/collections',
      },
      {
        id: 'content-policies',
        label: 'Policies',
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


  // CMS
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
        id: 'cms-channels',
        label: 'Channels',
        icon: <Monitor className="w-4 h-4" />,
        path: '/admin/cms/channels',
      },
      {
        id: 'cms-channel-ops',
        label: 'Channel Ops',
        icon: <Activity className="w-4 h-4" />,
        path: '/admin/cms/channels/ops',
      },
      {
        id: 'cms-cpts',
        label: 'Post Types',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/cpts',
      },
      {
        id: 'cms-fields',
        label: 'Fields',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/fields',
      },
      {
        id: 'cms-views',
        label: 'Views',
        icon: <Palette className="w-4 h-4" />,
        path: '/admin/cms/views',
      },
      {
        id: 'cms-pages',
        label: 'Pages',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/pages',
      },
    ],
  },

  // AppStore
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

  // Forum
  {
    id: 'forum',
    label: 'Forum',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      {
        id: 'forum-dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/forum',
      },
      {
        id: 'forum-boards',
        label: 'Boards',
        icon: <MessageSquare className="w-4 h-4" />,
        path: '/forum/boards',
      },
      {
        id: 'forum-categories',
        label: 'Categories',
        icon: <Layers className="w-4 h-4" />,
        path: '/forum/categories',
      },
    ],
  },

  // ============================================
  // SERVICES
  // ============================================
  {
    id: 'services-separator',
    label: 'Services',
    icon: <Briefcase className="w-5 h-5" />,
    separator: true,
  },

  // Yaksa (KPA)
  {
    id: 'yaksa',
    label: 'Yaksa (KPA)',
    icon: <Activity className="w-5 h-5" />,
    children: [
      // WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1
      //   기존 항목 `Service Dashboard → /admin/yaksa-hub` 를 **교체**한다(추가 아님).
      //   그 경로는 `AppRouteGuard appId="yaksa-scheduler"` 로 감싸여 있고 해당 앱이 비활성이라
      //   실제로는 `/error/app-disabled?app=yaksa-scheduler` 로 귀결되는 죽은 링크였다.
      //   근거: IR-O4O-ADMIN-MENU-AND-ROUTE-NEXT-BATCH-SELECTION-V1 §5-1 (A안 확정)
      //   `/admin/yaksa-hub` route 자체와 yaksa-scheduler 앱 상태는 변경하지 않는다.
      {
        id: 'yaksa-admin-center',
        label: '지부/분회 관리자 센터',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/admin/yaksa',
      },
      {
        id: 'yaksa-hub-contents',
        label: 'HUB 콘텐츠',
        icon: <FileText className="w-4 h-4" />,
        path: '/operator/hub-contents',
      },
      {
        id: 'yaksa-content-approvals',
        label: '콘텐츠 승인',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/operator/approvals',
      },
      // WO-O4O-KPA-ADMIN-SNAPSHOT-BROWSE-V1
      {
        id: 'yaksa-snapshots',
        label: '공급 자산 조회',
        icon: <Layers className="w-4 h-4" />,
        path: '/operator/kpa/snapshots',
      },
      {
        id: 'yaksa-force-assets',
        label: 'Force Asset 관리',
        icon: <Shield className="w-4 h-4" />,
        path: '/operator/kpa/force-assets',
      },
    ],
  },



  // Digital Signage
  {
    id: 'digital-signage',
    label: 'Digital Signage',
    icon: <Monitor className="w-5 h-5" />,
    children: [
      {
        id: 'signage-operations',
        label: 'Operations',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/admin/digital-signage/operations',
      },
      {
        id: 'signage-displays',
        label: 'Displays',
        icon: <Monitor className="w-4 h-4" />,
        path: '/admin/digital-signage/displays',
      },
      {
        id: 'signage-media',
        label: 'Media Sources',
        icon: <Image className="w-4 h-4" />,
        path: '/admin/digital-signage/media/sources',
      },
      {
        id: 'signage-schedules',
        label: 'Schedules',
        icon: <Calendar className="w-4 h-4" />,
        path: '/admin/digital-signage/schedules',
      },
    ],
  },


  // ============================================
  // INSIGHTS
  // ============================================
  {
    id: 'insights-separator',
    label: 'Insights',
    icon: <TrendingUp className="w-5 h-5" />,
    separator: true,
  },

  {
    id: 'ops-metrics',
    label: 'Ops Metrics',
    icon: <Activity className="w-5 h-5" />,
    path: '/admin/ops/metrics',
  },

  // WO-O4O-ADMIN-MENU-CONNECT-READY-ONLY-V1:
  //   메뉴 진입선이 없던 기존 화면 3개를 연결한다(신규 화면·route·API 없음).
  //   선행 검증: WO-O4O-ADMIN-API-DOUBLE-PREFIX-FIX-V1 CHECK — 배포 후 프로덕션 read-only 로
  //   조회 API 2xx · 실데이터 렌더 · 콘솔 오류 0 확인된 READY 3건.
  //   Insights 섹션에 배치한 이유: 세 화면 모두 서비스 경계를 가로지르는 **운영 현황**이며
  //   같은 섹션의 Ops Metrics 와 성격이 같다. Core 는 사람·권한·설정 축이라 맞지 않는다.
  //   route guard 는 셋 다 requiredRoles={['admin']} 로, 이미 메뉴에 연결된
  //   Ops Metrics(/admin/ops/metrics) 와 동일하다 → 기존 권한 경계를 그대로 따른다.
  //   (menuPermissions 별도 항목 없음 = "설정 없음 = 허용" 관례. Ops Metrics 와 동일.)
  {
    id: 'platform-hub',
    label: '플랫폼 HUB',
    icon: <Layers className="w-5 h-5" />,
    path: '/admin/platform/hub',
  },
  {
    id: 'store-network',
    label: '매장 네트워크',
    icon: <BarChart2 className="w-5 h-5" />,
    path: '/admin/store-network',
  },
  {
    id: 'physical-stores',
    label: '오프라인 매장',
    icon: <Briefcase className="w-5 h-5" />,
    path: '/admin/physical-stores',
  },

  {
    id: 'service-content-manager',
    label: 'Content Manager',
    icon: <Layers className="w-5 h-5" />,
    path: '/admin/service-content-manager',
  },

  // WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1
  //   'Reports'(신상신고) 메뉴 그룹 3개 leaf 제거 —
  //   Overview / Submissions / Templates 화면이 호출하는 `/reporting/*` API 는
  //   백엔드에 mount 된 적이 없어 전부 404 였다(죽은 링크).
];

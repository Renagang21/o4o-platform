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
      {
        id: 'yaksa-hub',
        label: 'Service Dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/admin/yaksa-hub',
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


  {
    id: 'service-content-manager',
    label: 'Content Manager',
    icon: <Layers className="w-5 h-5" />,
    path: '/admin/service-content-manager',
  },

  {
    id: 'reporting',
    label: 'Reports',
    icon: <ClipboardList className="w-5 h-5" />,
    children: [
      {
        id: 'reporting-overview',
        label: 'Overview',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/admin/reporting/dashboard',
      },
      {
        id: 'reporting-submissions',
        label: 'Submissions',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/reporting/reports',
      },
      {
        id: 'reporting-templates',
        label: 'Templates',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/reporting/templates',
      },
    ],
  },
];

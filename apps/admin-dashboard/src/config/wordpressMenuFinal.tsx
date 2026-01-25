/**
 * Admin Menu Structure v2.0
 *
 * WO-ADMIN-ARCHITECTURE-RESTRUCTURE-V1
 * Goal State Aligned: Core / Services / Insights
 *
 * @deprecated Phase P0 Task A: This file is deprecated.
 * Navigation should be defined in app manifests.
 * This file is kept as a FALLBACK during the transition period.
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
  Heart,
  Link2,
  DollarSign,
  Sparkles,
  Percent,
  Activity,
  Monitor,
  Image,
  Calendar,
  PlayCircle,
  LayoutGrid,
  Clock,
  AlertTriangle,
  Brain,
  MessageSquare,
  Layers,
  Shield,
  TrendingUp,
  Briefcase,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: ReactElement;
  path?: string;
  separator?: boolean;
  children?: MenuItem[];
  roles?: string[]; // Required roles to see this menu
}

/**
 * Admin Menu Structure v2.0 (Goal State Aligned)
 *
 * Structure:
 * ├─ Overview (Dashboard)
 * ├─ Core (플랫폼 핵심 기능)
 * │  ├─ Users & Roles
 * │  ├─ Membership
 * │  ├─ CMS
 * │  └─ AppStore
 * ├─ Services (서비스별 관리)
 * │  ├─ Yaksa (KPA Society)
 * │  ├─ Glycopharm
 * │  ├─ GlucoseView
 * │  ├─ K-Cosmetics
 * │  ├─ Neture
 * │  └─ Digital Signage
 * └─ Insights (의사결정 지원)
 *    ├─ Service Health
 *    └─ Reporting
 */
export const wordpressMenuItems: MenuItem[] = [
  // ============================================
  // OVERVIEW - 운영자 진입점
  // ============================================
  {
    id: 'dashboard',
    label: 'Overview',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/admin',
    roles: ['admin', 'super_admin'],
  },

  // ============================================
  // CORE - 플랫폼 핵심 기능
  // ============================================
  {
    id: 'core',
    label: 'Core',
    icon: <Shield className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      // Users & Roles
      {
        id: 'core-users',
        label: 'Users & Roles',
        icon: <Users className="w-4 h-4" />,
        path: '/users',
      },
      // Membership (플랫폼 범용 Core로 통합)
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
      // Platform Settings
      {
        id: 'core-settings',
        label: 'Platform Settings',
        icon: <Settings className="w-4 h-4" />,
        path: '/settings',
      },
    ],
  },

  // Content (콘텐츠 단일 진실 원천 - Core 메뉴)
  // WO-O4O-OPERATOR-NAV-CONTENT-SHELL-V1
  {
    id: 'content',
    label: 'Content',
    icon: <FileText className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
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

  // Participation (응답 수집/결과 - WO-ADMIN-NETURE-LMS-REFACTOR-V1)
  {
    id: 'participation',
    label: 'Participation',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'participation-overview',
        label: 'Overview',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/admin/participation',
      },
      {
        id: 'participation-surveys',
        label: '설문 목록',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/participation/surveys',
      },
      {
        id: 'participation-responses',
        label: '응답 현황',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/admin/participation/responses',
      },
    ],
  },

  // Learning (순서/흐름 관리 - WO-ADMIN-NETURE-LMS-REFACTOR-V1)
  // ⚠️ 교육/평가가 아닌 콘텐츠 순서 안내 도구
  {
    id: 'learning',
    label: 'Learning (Flow)',
    icon: <PlayCircle className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'learning-overview',
        label: 'Overview',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/admin/learning',
      },
      {
        id: 'learning-flows',
        label: 'Flow 목록',
        icon: <Layers className="w-4 h-4" />,
        path: '/admin/learning/flows',
      },
      {
        id: 'learning-progress',
        label: '진행 현황',
        icon: <TrendingUp className="w-4 h-4" />,
        path: '/admin/learning/progress',
      },
    ],
  },

  // CMS (플랫폼 콘텐츠 관리 - Core 하위)
  {
    id: 'cms',
    label: 'CMS',
    icon: <Database className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
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

  // AppStore (플랫폼 확장 관리 - Core 하위)
  {
    id: 'appstore',
    label: 'AppStore',
    icon: <Package className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'appstore-browse',
        label: 'Browse Apps',
        icon: <Package className="w-4 h-4" />,
        path: '/apps/store',
      },
      {
        id: 'appstore-installed',
        label: 'Installed Apps',
        icon: <Package className="w-4 h-4" />,
        path: '/admin/appstore/installed',
      },
    ],
  },

  // Forum (플랫폼 포럼 관리 - Core 하위)
  {
    id: 'forum',
    label: 'Forum',
    icon: <MessageSquare className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
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
  // SERVICES - 서비스별 관리
  // ============================================
  {
    id: 'services-separator',
    label: 'Services',
    icon: <Briefcase className="w-5 h-5" />,
    separator: true,
    roles: ['admin', 'super_admin'],
  },

  // Yaksa (KPA Society) - 서비스 관리 도구
  {
    id: 'yaksa',
    label: 'Yaksa (KPA)',
    icon: <Activity className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'yaksa-hub',
        label: 'Service Dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/admin/yaksa-hub',
      },
      {
        id: 'yaksa-forum',
        label: 'Forum',
        icon: <MessageSquare className="w-4 h-4" />,
        path: '/forum',
      },
      {
        id: 'yaksa-ai-insight',
        label: 'AI Insight',
        icon: <Brain className="w-4 h-4" />,
        path: '/pharmacy-ai-insight',
      },
      {
        id: 'yaksa-cgm',
        label: 'CGM Patient Care',
        icon: <Heart className="w-4 h-4" />,
        path: '/cgm-pharmacist',
      },
    ],
  },

  // Glycopharm
  {
    id: 'glycopharm',
    label: 'Glycopharm',
    icon: <Activity className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'glycopharm-pharmacies',
        label: 'Pharmacies',
        icon: <Heart className="w-4 h-4" />,
        path: '/glycopharm/pharmacies',
      },
      {
        id: 'glycopharm-products',
        label: 'Products',
        icon: <Package className="w-4 h-4" />,
        path: '/glycopharm/products',
      },
      {
        id: 'glycopharm-applications',
        label: 'Applications',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/service-applications/glycopharm',
      },
    ],
  },

  // GlucoseView
  {
    id: 'glucoseview',
    label: 'GlucoseView',
    icon: <Activity className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'glucoseview-vendors',
        label: 'CGM Vendors',
        icon: <Monitor className="w-4 h-4" />,
        path: '/glucoseview/vendors',
      },
      {
        id: 'glucoseview-profiles',
        label: 'View Profiles',
        icon: <LayoutGrid className="w-4 h-4" />,
        path: '/glucoseview/view-profiles',
      },
      {
        id: 'glucoseview-connections',
        label: 'Connections',
        icon: <Link2 className="w-4 h-4" />,
        path: '/glucoseview/connections',
      },
      {
        id: 'glucoseview-applications',
        label: 'Applications',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/service-applications/glucoseview',
      },
    ],
  },

  // K-Cosmetics
  {
    id: 'k-cosmetics',
    label: 'K-Cosmetics',
    icon: <Heart className="w-5 h-5" />,
    roles: ['admin', 'super_admin', 'partner'],
    children: [
      {
        id: 'cosmetics-dashboard',
        label: 'Dashboard',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/cosmetics-partner/dashboard',
      },
      {
        id: 'cosmetics-links',
        label: 'Partner Links',
        icon: <Link2 className="w-4 h-4" />,
        path: '/cosmetics-partner/links',
      },
      {
        id: 'cosmetics-routines',
        label: 'Routines',
        icon: <Sparkles className="w-4 h-4" />,
        path: '/cosmetics-partner/routines',
      },
      {
        id: 'cosmetics-earnings',
        label: 'Earnings',
        icon: <DollarSign className="w-4 h-4" />,
        path: '/cosmetics-partner/earnings',
      },
      {
        id: 'cosmetics-commissions',
        label: 'Commission Policies',
        icon: <Percent className="w-4 h-4" />,
        path: '/cosmetics-partner/commission-policies',
      },
    ],
  },

  // Neture
  {
    id: 'neture',
    label: 'Neture',
    icon: <Package className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'neture-products',
        label: 'Products',
        icon: <Package className="w-4 h-4" />,
        path: '/neture/products',
      },
      {
        id: 'neture-partners',
        label: 'Partners',
        icon: <Users className="w-4 h-4" />,
        path: '/neture/partners',
      },
    ],
  },

  // Digital Signage
  {
    id: 'digital-signage',
    label: 'Digital Signage',
    icon: <Monitor className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
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
  // INSIGHTS - 의사결정 지원
  // ============================================
  {
    id: 'insights-separator',
    label: 'Insights',
    icon: <TrendingUp className="w-5 h-5" />,
    separator: true,
    roles: ['admin', 'super_admin'],
  },

  // Ops Metrics (WO-NEXT-OPS-METRICS-P0)
  {
    id: 'ops-metrics',
    label: 'Ops Metrics',
    icon: <Activity className="w-5 h-5" />,
    path: '/admin/ops/metrics',
    roles: ['admin', 'super_admin'],
  },

  // Service Content Manager (통합 콘텐츠 관리)
  {
    id: 'service-content-manager',
    label: 'Content Manager',
    icon: <Layers className="w-5 h-5" />,
    path: '/admin/service-content-manager',
    roles: ['admin', 'super_admin', 'platform_admin'],
  },

  // Reporting (의사결정 요약 도구)
  {
    id: 'reporting',
    label: 'Reports',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
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

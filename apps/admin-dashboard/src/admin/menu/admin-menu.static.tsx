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
  TrendingUp,
  Brain,
  MessageSquare,
  Layers,
  Shield,
  Briefcase,
  Store,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: ReactElement;
  path?: string;
  separator?: boolean;
  children?: MenuItem[];
  roles?: string[];
}

/**
 * Static fallback menu items
 *
 * Structure:
 * +-- Overview (Dashboard)
 * +-- Core (Users, Operators, Membership, Settings)
 * +-- Content
 * +-- Participation
 * +-- Learning (Flow)
 * +-- CMS
 * +-- AppStore
 * +-- Forum
 * +-- Services (Yaksa, Glycopharm, GlucoseView, K-Cosmetics, Neture, Signage)
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
    roles: ['admin', 'super_admin'],
  },

  // ============================================
  // CORE
  // ============================================
  {
    id: 'core',
    label: 'Core',
    icon: <Shield className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'core-users',
        label: 'Users & Roles',
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

  // Content
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

  // Participation
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

  // Learning (Flow)
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

  // CMS
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

  // AppStore
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

  // Forum
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
  // SERVICES
  // ============================================
  {
    id: 'services-separator',
    label: 'Services',
    icon: <Briefcase className="w-5 h-5" />,
    separator: true,
    roles: ['admin', 'super_admin'],
  },

  // Yaksa (KPA)
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
        id: 'neture-suppliers',
        label: 'Suppliers',
        icon: <Package className="w-4 h-4" />,
        path: '/neture/suppliers',
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
  // INSIGHTS
  // ============================================
  {
    id: 'insights-separator',
    label: 'Insights',
    icon: <TrendingUp className="w-5 h-5" />,
    separator: true,
    roles: ['admin', 'super_admin'],
  },

  {
    id: 'ops-metrics',
    label: 'Ops Metrics',
    icon: <Activity className="w-5 h-5" />,
    path: '/admin/ops/metrics',
    roles: ['admin', 'super_admin'],
  },

  {
    id: 'store-network',
    label: 'Store Network',
    icon: <Store className="w-5 h-5" />,
    path: '/admin/store-network',
    roles: ['admin', 'super_admin'],
  },

  {
    id: 'physical-stores',
    label: 'Physical Stores',
    icon: <Link2 className="w-5 h-5" />,
    path: '/admin/physical-stores',
    roles: ['admin', 'super_admin'],
  },

  {
    id: 'service-content-manager',
    label: 'Content Manager',
    icon: <Layers className="w-5 h-5" />,
    path: '/admin/service-content-manager',
    roles: ['admin', 'super_admin', 'platform_admin'],
  },

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

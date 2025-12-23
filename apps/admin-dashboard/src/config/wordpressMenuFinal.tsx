/**
 * @deprecated Phase P0 Task A: This file is deprecated.
 *
 * MIGRATION GUIDE:
 * Navigation should be defined in app manifests using either:
 * 1. navigation.admin (flat structure with parentId)
 * 2. menus.admin (nested structure with children)
 *
 * These are automatically registered to NavigationRegistry during app activation.
 * useAdminMenu hook fetches navigation from /api/v1/navigation/admin API.
 *
 * This file is kept as a FALLBACK during the transition period.
 * It will be removed after all apps migrate their navigation to manifests.
 *
 * @see packages/cms-core/src/lifecycle/activate.ts
 * @see packages/cms-core/src/view-system/navigation-registry.ts
 * @see apps/api-server/src/routes/navigation.routes.ts
 */

import { ReactElement } from 'react';
import {
  LayoutDashboard,
  Database,
  Palette,
  Globe,
  Package,
  Settings,
  Users,
  Bell,
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
 * @deprecated This menu structure is deprecated.
 * Use manifest.navigation.admin or manifest.menus.admin instead.
 *
 * NextGen O4O Platform Menu Structure (Phase D-0)
 *
 * Clean, minimal menu focused on:
 * - CMS V2 (CPTs, Fields, Views, Pages)
 * - Visual Designer
 * - Multi-Site Builder
 * - AppStore
 * - System Management
 */
export const wordpressMenuItems: MenuItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/admin',
    roles: ['admin', 'super_admin'],
  },

  // Yaksa Admin Hub (Phase 19-D)
  {
    id: 'yaksa-hub',
    label: 'Yaksa Hub',
    icon: <Activity className="w-5 h-5" />,
    path: '/admin/yaksa-hub',
    roles: ['admin', 'super_admin'],
  },

  // Yaksa Tools (Forum Context → Tools)
  {
    id: 'yaksa-tools',
    label: 'Yaksa Tools',
    icon: <MessageSquare className="w-5 h-5" />,
    roles: ['admin', 'super_admin', 'pharmacist'],
    children: [
      {
        id: 'yaksa-forum',
        label: 'Forum',
        icon: <MessageSquare className="w-4 h-4" />,
        path: '/forum/boards',
      },
      {
        id: 'pharmacy-ai-insight',
        label: 'AI Insight (Pharmacy)',
        icon: <Brain className="w-4 h-4" />,
        path: '/pharmacy-ai-insight',
      },
      {
        id: 'cgm-pharmacist',
        label: 'CGM 환자 관리',
        icon: <Heart className="w-4 h-4" />,
        path: '/cgm-pharmacist',
      },
    ],
  },

  // CMS V2
  {
    id: 'cms',
    label: 'CMS',
    icon: <Database className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'cms-cpts',
        label: 'Custom Post Types',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/cpts',
      },
      {
        id: 'cms-fields',
        label: 'Custom Fields',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/fields',
      },
      {
        id: 'cms-views',
        label: 'View Templates',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/views',
      },
      {
        id: 'cms-pages',
        label: 'CMS Pages',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/cms/pages',
      },
    ],
  },

  // Designer
  {
    id: 'designer',
    label: 'Designer',
    icon: <Palette className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'view-designer',
        label: 'View Designer',
        icon: <Palette className="w-4 h-4" />,
        path: '/admin/cms/views',  // Navigate to views list, then select a view to edit with designer
      },
    ],
  },

  // Multi-Site Builder
  {
    id: 'site-builder',
    label: 'Multi-Site Builder',
    icon: <Globe className="w-5 h-5" />,
    roles: ['super_admin', 'admin'],
    children: [
      {
        id: 'site-builder-main',
        label: 'Site Builder',
        icon: <Globe className="w-4 h-4" />,
        path: '/admin/site-builder',
      },
      {
        id: 'site-instances',
        label: 'Site Instances',
        icon: <Globe className="w-4 h-4" />,
        path: '/admin/instances',
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

  // Digital Signage
  {
    id: 'digital-signage',
    label: 'Digital Signage',
    icon: <Monitor className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'digital-signage-operations',
        label: 'Operations',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/admin/digital-signage/operations',
      },
      {
        id: 'digital-signage-display-status',
        label: 'Display Status',
        icon: <Activity className="w-4 h-4" />,
        path: '/admin/digital-signage/operations/display-status',
      },
      {
        id: 'digital-signage-action-history',
        label: 'Action History',
        icon: <Clock className="w-4 h-4" />,
        path: '/admin/digital-signage/operations/history',
      },
      {
        id: 'digital-signage-problems',
        label: 'Problems',
        icon: <AlertTriangle className="w-4 h-4" />,
        path: '/admin/digital-signage/operations/problems',
      },
      {
        id: 'digital-signage-media-sources',
        label: 'Media Sources',
        icon: <Image className="w-4 h-4" />,
        path: '/admin/digital-signage/media/sources',
      },
      {
        id: 'digital-signage-media-lists',
        label: 'Media Lists',
        icon: <Image className="w-4 h-4" />,
        path: '/admin/digital-signage/media/lists',
      },
      {
        id: 'digital-signage-displays',
        label: 'Displays',
        icon: <Monitor className="w-4 h-4" />,
        path: '/admin/digital-signage/displays',
      },
      {
        id: 'digital-signage-display-slots',
        label: 'Display Slots',
        icon: <LayoutGrid className="w-4 h-4" />,
        path: '/admin/digital-signage/display-slots',
      },
      {
        id: 'digital-signage-schedules',
        label: 'Schedules',
        icon: <Calendar className="w-4 h-4" />,
        path: '/admin/digital-signage/schedules',
      },
      {
        id: 'digital-signage-actions',
        label: 'Action Monitor',
        icon: <PlayCircle className="w-4 h-4" />,
        path: '/admin/digital-signage/actions',
      },
    ],
  },

  // Membership
  {
    id: 'membership',
    label: 'Membership',
    icon: <UserCheck className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'membership-dashboard',
        label: 'Dashboard',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/admin/membership/dashboard',
      },
      {
        id: 'membership-members',
        label: 'Members',
        icon: <Users className="w-4 h-4" />,
        path: '/admin/membership/members',
      },
      {
        id: 'membership-verifications',
        label: 'Verifications',
        icon: <UserCheck className="w-4 h-4" />,
        path: '/admin/membership/verifications',
      },
      {
        id: 'membership-categories',
        label: 'Categories',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/membership/categories',
      },
    ],
  },

  // Reporting (신상신고)
  {
    id: 'reporting',
    label: '신상신고',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'reporting-dashboard',
        label: 'Dashboard',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/admin/reporting/dashboard',
      },
      {
        id: 'reporting-reports',
        label: '신고서 목록',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/reporting/reports',
      },
      {
        id: 'reporting-templates',
        label: '템플릿 관리',
        icon: <ClipboardList className="w-4 h-4" />,
        path: '/admin/reporting/templates',
      },
    ],
  },

  // Cosmetics Partner (파트너/인플루언서)
  {
    id: 'cosmetics-partner',
    label: 'Cosmetics Partner',
    icon: <Heart className="w-5 h-5" />,
    roles: ['admin', 'super_admin', 'partner'],
    children: [
      {
        id: 'cosmetics-partner-dashboard',
        label: 'Dashboard',
        icon: <BarChart2 className="w-4 h-4" />,
        path: '/cosmetics-partner/dashboard',
      },
      {
        id: 'cosmetics-partner-links',
        label: 'Links',
        icon: <Link2 className="w-4 h-4" />,
        path: '/cosmetics-partner/links',
      },
      {
        id: 'cosmetics-partner-routines',
        label: 'Routines',
        icon: <Sparkles className="w-4 h-4" />,
        path: '/cosmetics-partner/routines',
      },
      {
        id: 'cosmetics-partner-earnings',
        label: 'Earnings',
        icon: <DollarSign className="w-4 h-4" />,
        path: '/cosmetics-partner/earnings',
      },
      {
        id: 'cosmetics-partner-commission-policies',
        label: 'Commission Policies',
        icon: <Percent className="w-4 h-4" />,
        path: '/cosmetics-partner/commission-policies',
      },
    ],
  },

  // System
  {
    id: 'system',
    label: 'System',
    icon: <Settings className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    children: [
      {
        id: 'system-users',
        label: 'Users',
        icon: <Users className="w-4 h-4" />,
        path: '/users',
      },
      {
        id: 'system-settings',
        label: 'Settings',
        icon: <Settings className="w-4 h-4" />,
        path: '/settings',
      },
      {
        id: 'system-notifications',
        label: 'Notifications',
        icon: <Bell className="w-4 h-4" />,
        path: '/admin/notifications',
      },
      {
        id: 'system-logs',
        label: 'Logs',
        icon: <FileText className="w-4 h-4" />,
        path: '/admin/logs',
      },
    ],
  },
];

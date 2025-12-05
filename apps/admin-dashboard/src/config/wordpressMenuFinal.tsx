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
        path: '/admin/cms/views/designer',
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

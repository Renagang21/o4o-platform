/**
 * App Registry
 *
 * Central registry of all available apps in the O4O Platform.
 * Apps can be enabled/disabled through this registry.
 */

import type { AppRegistryEntry } from './types';

/**
 * App Registry - All available apps
 *
 * To add a new app:
 * 1. Create app package in packages/@o4o-apps/<app-name>/
 * 2. Add manifest.json with app metadata
 * 3. Register app here
 * 4. Run app loader to merge views/components
 */
export const AppRegistry: AppRegistryEntry[] = [
  {
    id: 'commerce',
    label: 'E-Commerce',
    enabled: true,
    manifestPath: '@o4o-apps/commerce/manifest.json',
    packageName: '@o4o-apps/commerce',
  },
  {
    id: 'customer',
    label: 'Customer Portal',
    enabled: true,
    manifestPath: '@o4o-apps/customer/manifest.json',
    packageName: '@o4o-apps/customer',
  },
  {
    id: 'admin',
    label: 'Admin Dashboard',
    enabled: true,
    manifestPath: '@o4o-apps/admin/manifest.json',
    packageName: '@o4o-apps/admin',
  },
  // Dropshipping app - currently archived to legacy
  // {
  //   id: 'dropshipping',
  //   label: 'Dropshipping',
  //   enabled: false,
  //   manifestPath: '@o4o-apps/dropshipping/manifest.json',
  //   packageName: '@o4o-apps/dropshipping',
  // },

  // Forum apps
  {
    id: 'forum',
    label: 'Forum',
    enabled: true,
    manifestPath: '@o4o/forum-core/manifest.json',
    packageName: '@o4o/forum-core',
  },
  {
    id: 'forum-neture',
    label: 'Neture Forum',
    enabled: true,
    manifestPath: '@o4o/forum-core-neture/manifest.json',
    packageName: '@o4o/forum-core-neture',
  },
  {
    id: 'forum-yaksa',
    label: 'Yaksa Forum',
    enabled: true,
    manifestPath: '@o4o/forum-core-yaksa/manifest.json',
    packageName: '@o4o/forum-core-yaksa',
  },

  // Future apps can be added here
  // {
  //   id: 'lms',
  //   label: 'Learning Management System',
  //   enabled: false,
  //   manifestPath: '@o4o-apps/lms/manifest.json',
  //   packageName: '@o4o-apps/lms',
  // },
  // {
  //   id: 'signage',
  //   label: 'Digital Signage',
  //   enabled: false,
  //   manifestPath: '@o4o-apps/signage/manifest.json',
  //   packageName: '@o4o-apps/signage',
  // },
];

/**
 * Get enabled apps
 */
export function getEnabledApps(): AppRegistryEntry[] {
  return AppRegistry.filter((app) => app.enabled);
}

/**
 * Get app by ID
 */
export function getAppById(id: string): AppRegistryEntry | undefined {
  return AppRegistry.find((app) => app.id === id);
}

/**
 * Check if app is enabled
 */
export function isAppEnabled(id: string): boolean {
  const app = getAppById(id);
  return app?.enabled ?? false;
}

/**
 * Get apps by category
 */
export function getAppsByCategory(_category: string): AppRegistryEntry[] {
  // This would require loading manifests first
  // For now, returns all apps
  return AppRegistry;
}

/**
 * Search apps by name or label
 */
export function searchApps(query: string): AppRegistryEntry[] {
  const lowerQuery = query.toLowerCase();
  return AppRegistry.filter(
    (app) =>
      app.id.toLowerCase().includes(lowerQuery) ||
      app.label.toLowerCase().includes(lowerQuery)
  );
}

/**
 * App Store Manager Function Component
 *
 * Manages the app store UI and handles app installation/removal.
 */

import type { FunctionComponent } from '@/components/registry/function';
import { getAllLoadedApps } from '@/appstore';
import { AppRegistry } from '@/appstore/registry';

export const appStoreManager: FunctionComponent = (_props, _context) => {
  // Get loaded apps
  const loadedApps = getAllLoadedApps();

  // Get all apps from registry
  const allApps = AppRegistry.map((entry) => {
    const loadedApp = loadedApps.get(entry.id);
    return loadedApp?.manifest || {
      id: entry.id,
      name: entry.label,
      version: '0.0.0',
      enabled: entry.enabled,
      description: `App package: ${entry.packageName || entry.id}`,
    };
  });

  // Get installed app IDs
  const installedAppIds = Array.from(loadedApps.keys());

  return {
    type: 'AppList',
    props: {
      apps: allApps,
      installedAppIds,
      onInstall: (appId: string) => {
        // TODO: Implement app installation
        alert(`Installing app: ${appId}\n\nThis feature will be implemented soon.`);
      },
      onUninstall: (appId: string) => {
        // TODO: Implement app uninstallation
        alert(`Uninstalling app: ${appId}\n\nThis feature will be implemented soon.`);
      },
      onToggleEnable: (appId: string, enabled: boolean) => {
        // TODO: Implement app enable/disable
        alert(
          `${enabled ? 'Enabling' : 'Disabling'} app: ${appId}\n\nThis feature will be implemented soon.`
        );
      },
    },
  };
};

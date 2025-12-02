/**
 * AppStore Module
 *
 * Central export for NextGen AppStore functionality.
 */

export * from './types';
export * from './registry';
export * from './manifestLoader';
export * from './loader';

// Re-export commonly used functions
export {
  AppRegistry,
  getEnabledApps,
  getAppById,
  isAppEnabled,
} from './registry';

export {
  loadManifest,
  loadManifests,
} from './manifestLoader';

export {
  initializeAppStore,
  loadApp,
  loadAllApps,
  reloadApp,
  getAppStoreState,
  getLoadedApp,
  getAllLoadedApps,
} from './loader';

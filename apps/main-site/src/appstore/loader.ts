/**
 * App Loader
 *
 * Core engine for loading apps and merging them into the NextGen system.
 * Handles:
 * - Manifest loading
 * - View registration
 * - Function component registration
 * - UI component registration
 * - Dependency resolution
 */

import type { AppRegistryEntry, LoadedApp, AppStoreState } from './types';
import { loadManifest } from './manifestLoader';
import { AppRegistry, getEnabledApps } from './registry';

/**
 * Global AppStore state
 */
const appStoreState: AppStoreState = {
  apps: new Map(),
  registry: AppRegistry,
  loading: false,
  error: null,
};

/**
 * Load a single app
 *
 * @param registryEntry - App registry entry
 * @returns Loaded app with views, components, and UI
 */
export async function loadApp(registryEntry: AppRegistryEntry): Promise<LoadedApp> {
  console.log(`[AppLoader] Loading app: ${registryEntry.id}`);

  try {
    // 1. Load manifest
    const manifest = await loadManifest(registryEntry.manifestPath);

    if (!manifest.enabled) {
      console.log(`[AppLoader] App ${registryEntry.id} is disabled, skipping`);
      throw new Error(`App ${registryEntry.id} is disabled`);
    }

    // 2. Load views
    const views = new Map<string, any>();
    if (manifest.views) {
      // Handle both array and object formats
      const viewEntries = Array.isArray(manifest.views)
        ? manifest.views.map((path) => {
            const id = path.replace('views/', '').replace('.json', '');
            return [id, path];
          })
        : Object.entries(manifest.views);

      for (const [viewId, viewPath] of viewEntries) {
        try {
          // In production, this would dynamically import view JSON files
          // For now, we'll create stub view definitions
          views.set(viewId, {
            viewId,
            source: `app:${manifest.id}`,
            path: viewPath,
          });
        } catch (error) {
          console.warn(`[AppLoader] Failed to load view ${viewId}:`, error);
        }
      }
    }

    // 3. Load function components (support both 'components' and 'functions' fields)
    const components = new Map<string, React.ComponentType<any>>();
    const functionSources = [
      ...(manifest.components ? Object.entries(manifest.components) : []),
      ...(manifest.functions ? Object.entries(manifest.functions) : []),
    ];

    for (const [componentName, _componentPath] of functionSources) {
      try {
        // In production, this would dynamically import component files
        // For now, we'll create stub components
        components.set(componentName, createStubComponent(componentName, manifest.id));
      } catch (error) {
        console.warn(`[AppLoader] Failed to load component ${componentName}:`, error);
      }
    }

    // 4. Load UI components
    const uiComponents = new Map<string, React.ComponentType<any>>();
    if (manifest.ui) {
      for (const [uiName, _uiPath] of Object.entries(manifest.ui)) {
        try {
          // In production, this would dynamically import UI component files
          uiComponents.set(uiName, createStubComponent(uiName, manifest.id));
        } catch (error) {
          console.warn(`[AppLoader] Failed to load UI component ${uiName}:`, error);
        }
      }
    }

    console.log(
      `[AppLoader] Successfully loaded app ${registryEntry.id}: ` +
        `${views.size} views, ${components.size} components, ${uiComponents.size} UI components`
    );

    return {
      manifest,
      views,
      components,
      uiComponents,
    };
  } catch (error) {
    console.error(`[AppLoader] Failed to load app ${registryEntry.id}:`, error);
    throw error;
  }
}

/**
 * Load all enabled apps
 */
export async function loadAllApps(): Promise<void> {
  console.log('[AppLoader] Loading all enabled apps...');
  appStoreState.loading = true;
  appStoreState.error = null;

  try {
    const enabledApps = getEnabledApps();
    console.log(`[AppLoader] Found ${enabledApps.length} enabled apps`);

    // Load apps in parallel
    const loadPromises = enabledApps.map(async (registryEntry) => {
      try {
        const loadedApp = await loadApp(registryEntry);
        appStoreState.apps.set(registryEntry.id, loadedApp);
        return { success: true, appId: registryEntry.id };
      } catch (error) {
        console.error(`[AppLoader] Failed to load app ${registryEntry.id}:`, error);
        return { success: false, appId: registryEntry.id, error };
      }
    });

    const results = await Promise.all(loadPromises);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    console.log(
      `[AppLoader] Loaded ${successCount} apps successfully, ${failCount} failed`
    );

    // Merge into registries
    mergeIntoRegistries();
  } catch (error) {
    console.error('[AppLoader] Critical error loading apps:', error);
    appStoreState.error = error as Error;
    throw error;
  } finally {
    appStoreState.loading = false;
  }
}

/**
 * Merge loaded apps into global registries
 */
function mergeIntoRegistries(): void {
  console.log('[AppLoader] Merging apps into global registries...');

  // Import registry merger functions
  const { mergeApp } = require('./registryMerger');

  // Merge each loaded app
  appStoreState.apps.forEach((loadedApp, appId) => {
    console.log(`[AppLoader] App ${appId}:`);
    console.log(`  - Views: ${loadedApp.views.size}`);
    console.log(`  - Components: ${loadedApp.components.size}`);
    console.log(`  - UI Components: ${loadedApp.uiComponents.size}`);

    // Merge into registries
    mergeApp(appId, loadedApp);
  });

  console.log('[AppLoader] All apps merged into registries');
}

/**
 * Get app store state
 */
export function getAppStoreState(): AppStoreState {
  return appStoreState;
}

/**
 * Get loaded app by ID
 */
export function getLoadedApp(appId: string): LoadedApp | undefined {
  return appStoreState.apps.get(appId);
}

/**
 * Get all loaded apps
 */
export function getAllLoadedApps(): Map<string, LoadedApp> {
  return appStoreState.apps;
}

/**
 * Reload a specific app
 */
export async function reloadApp(appId: string): Promise<void> {
  console.log(`[AppLoader] Reloading app: ${appId}`);

  const registryEntry = AppRegistry.find((app) => app.id === appId);
  if (!registryEntry) {
    throw new Error(`App not found in registry: ${appId}`);
  }

  // Remove old app data
  appStoreState.apps.delete(appId);

  // Load fresh
  const loadedApp = await loadApp(registryEntry);
  appStoreState.apps.set(appId, loadedApp);

  // Re-merge registries
  mergeIntoRegistries();

  console.log(`[AppLoader] App ${appId} reloaded successfully`);
}

/**
 * Create stub component (temporary - will be replaced with real dynamic imports)
 */
function createStubComponent(name: string, appId: string): React.ComponentType<any> {
  // Use React.createElement to avoid JSX in .ts file
  const React = (globalThis as any).React || { createElement: () => null };

  return function StubComponent(props: any) {
    return React.createElement(
      'div',
      { style: { padding: '20px', border: '1px dashed #ccc', borderRadius: '4px' } },
      React.createElement('h3', {}, name),
      React.createElement(
        'p',
        {},
        React.createElement('small', {}, `App: ${appId}`)
      ),
      React.createElement(
        'p',
        {},
        React.createElement('em', {}, 'Component stub - will be replaced with actual implementation')
      ),
      React.createElement(
        'pre',
        { style: { fontSize: '12px', background: '#f5f5f5', padding: '10px' } },
        JSON.stringify(props, null, 2)
      )
    );
  };
}

/**
 * Initialize AppStore on app startup
 */
export async function initializeAppStore(): Promise<void> {
  console.log('[AppStore] Initializing...');
  await loadAllApps();
  console.log('[AppStore] Initialization complete');
}

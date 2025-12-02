/**
 * Registry Merger
 *
 * Merges app components into global registries.
 * Handles Function Components, UI Components, and Views.
 */

import { FunctionRegistry } from '@/components/registry/function';
import { UIComponentRegistry } from '@/components/registry/ui';
import type { LoadedApp } from './types';

/**
 * Merge app components into FunctionRegistry
 */
export function mergeFunctionComponents(appId: string, loadedApp: LoadedApp): void {
  const { components } = loadedApp;

  console.log(`[RegistryMerger] Merging ${components.size} function components from ${appId}`);

  components.forEach((component, componentName) => {
    const registryKey = `${appId}:${componentName}`;

    // Check if component already exists
    if (FunctionRegistry[registryKey]) {
      console.warn(
        `[RegistryMerger] Function component ${registryKey} already exists, overwriting`
      );
    }

    // Add to registry
    // Note: We're using type assertion here because FunctionRegistry is a const object
    // In production, this should be a mutable Map or use a registration function
    (FunctionRegistry as any)[registryKey] = component;

    // Also add without app prefix for convenience
    if (!FunctionRegistry[componentName]) {
      (FunctionRegistry as any)[componentName] = component;
    }

    console.log(`[RegistryMerger] Registered function component: ${registryKey}`);
  });
}

/**
 * Merge app UI components into UIComponentRegistry
 */
export function mergeUIComponents(appId: string, loadedApp: LoadedApp): void {
  const { uiComponents } = loadedApp;

  console.log(`[RegistryMerger] Merging ${uiComponents.size} UI components from ${appId}`);

  uiComponents.forEach((component, componentName) => {
    const registryKey = `${appId}:${componentName}`;

    // Check if component already exists
    if (UIComponentRegistry[registryKey]) {
      console.warn(
        `[RegistryMerger] UI component ${registryKey} already exists, overwriting`
      );
    }

    // Add to registry
    (UIComponentRegistry as any)[registryKey] = component;

    // Also add without app prefix for convenience
    if (!UIComponentRegistry[componentName]) {
      (UIComponentRegistry as any)[componentName] = component;
    }

    console.log(`[RegistryMerger] Registered UI component: ${registryKey}`);
  });
}

/**
 * Merge app views into view registry
 *
 * Views are stored in a global view registry that ViewRenderer can access.
 * For now, we'll just log what would be merged.
 */
export function mergeViews(appId: string, loadedApp: LoadedApp): void {
  const { views } = loadedApp;

  console.log(`[RegistryMerger] Merging ${views.size} views from ${appId}`);

  views.forEach((_viewData, viewId) => {
    const registryKey = `${appId}:${viewId}`;
    console.log(`[RegistryMerger] Would register view: ${registryKey}`);
    // TODO: Implement actual view registry merge
    // This should integrate with ViewRenderer's view loading system
  });
}

/**
 * Remove app components from FunctionRegistry
 */
export function unmergeFunctionComponents(appId: string, componentNames: string[]): void {
  console.log(
    `[RegistryMerger] Removing ${componentNames.length} function components from ${appId}`
  );

  componentNames.forEach((componentName) => {
    const registryKey = `${appId}:${componentName}`;

    if (FunctionRegistry[registryKey]) {
      delete (FunctionRegistry as any)[registryKey];
      console.log(`[RegistryMerger] Removed function component: ${registryKey}`);
    }

    // Also remove unprefixed version if it matches
    if (FunctionRegistry[componentName]) {
      delete (FunctionRegistry as any)[componentName];
    }
  });
}

/**
 * Remove app UI components from UIComponentRegistry
 */
export function unmergeUIComponents(appId: string, componentNames: string[]): void {
  console.log(`[RegistryMerger] Removing ${componentNames.length} UI components from ${appId}`);

  componentNames.forEach((componentName) => {
    const registryKey = `${appId}:${componentName}`;

    if (UIComponentRegistry[registryKey]) {
      delete (UIComponentRegistry as any)[registryKey];
      console.log(`[RegistryMerger] Removed UI component: ${registryKey}`);
    }

    // Also remove unprefixed version if it matches
    if (UIComponentRegistry[componentName]) {
      delete (UIComponentRegistry as any)[componentName];
    }
  });
}

/**
 * Remove app views from view registry
 */
export function unmergeViews(appId: string, viewIds: string[]): void {
  console.log(`[RegistryMerger] Removing ${viewIds.length} views from ${appId}`);

  viewIds.forEach((viewId) => {
    const registryKey = `${appId}:${viewId}`;
    console.log(`[RegistryMerger] Would remove view: ${registryKey}`);
    // TODO: Implement actual view registry unmerge
  });
}

/**
 * Merge all components from a loaded app
 */
export function mergeApp(appId: string, loadedApp: LoadedApp): void {
  console.log(`[RegistryMerger] Merging all components from app: ${appId}`);

  mergeFunctionComponents(appId, loadedApp);
  mergeUIComponents(appId, loadedApp);
  mergeViews(appId, loadedApp);

  console.log(`[RegistryMerger] App ${appId} merged successfully`);
}

/**
 * Unmerge all components from a loaded app
 */
export function unmergeApp(appId: string, loadedApp: LoadedApp): void {
  console.log(`[RegistryMerger] Unmerging all components from app: ${appId}`);

  const componentNames = Array.from(loadedApp.components.keys());
  const uiComponentNames = Array.from(loadedApp.uiComponents.keys());
  const viewIds = Array.from(loadedApp.views.keys());

  unmergeFunctionComponents(appId, componentNames);
  unmergeUIComponents(appId, uiComponentNames);
  unmergeViews(appId, viewIds);

  console.log(`[RegistryMerger] App ${appId} unmerged successfully`);
}

/**
 * Get all components registered by an app
 */
export function getAppComponents(appId: string): {
  functionComponents: string[];
  uiComponents: string[];
} {
  const functionComponents = Object.keys(FunctionRegistry).filter((key) =>
    key.startsWith(`${appId}:`)
  );
  const uiComponents = Object.keys(UIComponentRegistry).filter((key) =>
    key.startsWith(`${appId}:`)
  );

  return {
    functionComponents,
    uiComponents,
  };
}

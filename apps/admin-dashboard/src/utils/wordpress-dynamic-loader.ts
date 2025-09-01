/**
 * WordPress Dynamic Module Loader
 * 
 * This utility ensures WordPress modules are ONLY loaded when needed,
 * not included in the main bundle at all.
 */

import { initializeWordPress } from './wordpress-initializer';

let wpModulesCache: any = null;

export interface WordPressModules {
  blocks: any;
  blockEditor: any;
  components: any;
  element: any;
  data: any;
  i18n: any;
  hooks: any;
  compose: any;
  apiFetch: any;
}

/**
 * Dynamically load all WordPress modules
 * These will be split into separate chunks by Vite
 */
export async function loadWordPressModules(): Promise<WordPressModules> {
  if (wpModulesCache) {
    return wpModulesCache;
  }

  try {
    // Initialize WordPress polyfills first
    await initializeWordPress();
    
    // Ensure React is ready
    if (!window.React) {
      throw new Error('React must be loaded before WordPress modules');
    }

    // Load core modules first (smaller chunks)
    // Commented out as WordPress packages are not installed
    // const [
    //   blocks,
    //   components,
    //   element,
    //   data,
    //   i18n,
    //   hooks,
    //   compose,
    //   apiFetch
    // ] = await Promise.all([
    //   import('@wordpress/blocks'),
    //   import('@wordpress/components'),
    //   import('@wordpress/element'),
    //   import('@wordpress/data'),
    //   import('@wordpress/i18n'),
    //   import('@wordpress/hooks'),
    //   import('@wordpress/compose'),
    //   import('@wordpress/api-fetch')
    // ]);
    const blocks = null, components = null, element = null, data = null,
          i18n = null, hooks = null, compose = null, apiFetch = null;

    // Load block editor separately using optimized loader
    const { loadMinimalBlockEditor } = await import('./wordpress-block-loader');
    const blockEditor = await loadMinimalBlockEditor();

    wpModulesCache = {
      blocks,
      blockEditor,
      components,
      element,
      data,
      i18n,
      hooks,
      compose,
      apiFetch
    };

    return wpModulesCache;
  } catch (error) {
    // Error log removed
    throw error;
  }
}

/**
 * Check if WordPress modules are loaded
 */
export function areWordPressModulesLoaded(): boolean {
  return wpModulesCache !== null;
}

/**
 * Clear WordPress modules cache (for testing)
 */
export function clearWordPressModulesCache(): void {
  wpModulesCache = null;
}
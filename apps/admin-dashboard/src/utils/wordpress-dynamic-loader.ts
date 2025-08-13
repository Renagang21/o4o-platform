/**
 * WordPress Dynamic Module Loader
 * 
 * This utility ensures WordPress modules are ONLY loaded when needed,
 * not included in the main bundle at all.
 */

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
    // Ensure React is ready first
    if (!window.React) {
      throw new Error('React must be loaded before WordPress modules');
    }

    // Load WordPress modules in parallel
    const [
      blocks,
      blockEditor,
      components,
      element,
      data,
      i18n,
      hooks,
      compose,
      apiFetch
    ] = await Promise.all([
      import(/* webpackChunkName: "wp-blocks" */ '@wordpress/blocks'),
      import(/* webpackChunkName: "wp-block-editor" */ '@wordpress/block-editor'),
      import(/* webpackChunkName: "wp-components" */ '@wordpress/components'),
      import(/* webpackChunkName: "wp-element" */ '@wordpress/element'),
      import(/* webpackChunkName: "wp-data" */ '@wordpress/data'),
      import(/* webpackChunkName: "wp-i18n" */ '@wordpress/i18n'),
      import(/* webpackChunkName: "wp-hooks" */ '@wordpress/hooks'),
      import(/* webpackChunkName: "wp-compose" */ '@wordpress/compose'),
      import(/* webpackChunkName: "wp-api-fetch" */ '@wordpress/api-fetch')
    ]);

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
    console.error('Failed to load WordPress modules:', error);
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
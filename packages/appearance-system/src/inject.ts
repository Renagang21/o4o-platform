/**
 * Style Injection Helpers
 *
 * Utilities for injecting generated CSS into the DOM or returning as strings.
 * This module provides a consistent interface for style injection across:
 * - Client-side (browser DOM)
 * - Server-side (SSR/SSG)
 * - Build-time (static generation)
 */

/**
 * Inject CSS string into the document head
 * Used for client-side dynamic style injection
 *
 * @param css - CSS string to inject
 * @param id - Optional style element ID for replacement
 */
export function injectCSS(css: string, id?: string): void {
  if (typeof document === 'undefined') {
    console.warn('injectCSS called in non-browser environment');
    return;
  }

  // TODO: Phase 2 - Implement CSS injection logic
  // - Check if style element with ID exists
  // - Update or create new style element
  // - Insert into document head
  console.log('TODO: Inject CSS', { id, cssLength: css.length });
}

/**
 * Remove injected CSS from the document
 *
 * @param id - Style element ID to remove
 */
export function removeCSS(id: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const styleElement = document.getElementById(id);
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Create a style element string for SSR
 * Returns HTML string that can be inserted into server-rendered pages
 *
 * @param css - CSS string
 * @param id - Optional style element ID
 * @returns HTML style element string
 */
export function createStyleElement(css: string, id?: string): string {
  const idAttr = id ? ` id="${id}"` : '';
  return `<style${idAttr}>${css}</style>`;
}

/**
 * Wrap CSS in a scoped container
 * Useful for component-level style isolation
 *
 * @param css - CSS string
 * @param scope - Scope selector (e.g., '.o4o-widget')
 * @returns Scoped CSS string
 */
export function scopeCSS(css: string, scope: string): string {
  // TODO: Phase 3 - Implement CSS scoping logic
  // - Parse CSS rules
  // - Prepend scope to each selector
  // - Return scoped CSS
  return `/* TODO: Scope ${scope} */\n${css}`;
}

/**
 * Common style element IDs used across the platform
 */
export const STYLE_IDS = {
  APPEARANCE_SYSTEM: 'o4o-appearance-system',
  CUSTOMIZER: 'o4o-customizer',
  THEME: 'o4o-theme',
  COMPONENTS: 'o4o-components',
} as const;

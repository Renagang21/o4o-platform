/**
 * Auto-Discovery Shortcode Registration System
 *
 * Convention:
 * - File: PartnerDashboard.tsx → shortcode: [partner_dashboard]
 * - File: SupplierProducts.tsx → shortcode: [supplier_products]
 *
 * No manual registration needed!
 */

import { ComponentType } from 'react';
import { registerLazyShortcode } from './registry.js';

/**
 * Convert PascalCase filename to snake_case shortcode name
 * PartnerDashboard → partner_dashboard
 * SupplierProducts → supplier_products
 */
function pascalToSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Extract component name from file path
 * ./dropshipping/PartnerDashboard.tsx → PartnerDashboard
 */
function extractComponentName(path: string): string {
  const match = path.match(/\/([^/]+)\.tsx?$/);
  return match ? match[1] : '';
}

/**
 * Auto-register all shortcode components
 * Scans all .tsx files in the current package and registers them
 */
export function autoRegisterShortcodes() {
  // Vite's import.meta.glob for dynamic imports
  // Matches: ./dropshipping/PartnerDashboard.tsx, ./auth/LoginForm.tsx, etc.
  const componentModules = import.meta.glob<{ default: ComponentType<any> }>(
    './**/*.tsx',
    { eager: false }
  );

  const registered: string[] = [];

  for (const [path, importFn] of Object.entries(componentModules)) {
    // Skip utility files, types, etc.
    if (
      path.includes('/types.tsx') ||
      path.includes('/utils.tsx') ||
      path.includes('/helpers.tsx') ||
      path.includes('/index.tsx') ||
      path.includes('/__tests__/')
    ) {
      continue;
    }

    const componentName = extractComponentName(path);
    if (!componentName) continue;

    const shortcodeName = pascalToSnakeCase(componentName);

    // Register with lazy loading
    registerLazyShortcode({
      name: shortcodeName,
      loader: async () => {
        try {
          const module = await importFn();
          // Try to get named export first, then default
          const Component = (module as any)[componentName] || module.default;

          if (!Component) {
            console.error(`[Auto-Register] Component "${componentName}" not found in ${path}`);
            return { default: () => null };
          }

          return { default: Component };
        } catch (err) {
          console.error(`[Auto-Register] Failed to load "${componentName}":`, err);
          return { default: () => null };
        }
      },
      description: `Auto-registered: ${shortcodeName}`
    });

    registered.push(shortcodeName);
  }

  if (import.meta.env.DEV) {
    console.log(`[Auto-Register] ✅ Registered ${registered.length} shortcodes:`, registered);
  }

  return registered;
}

/**
 * Export for manual use if needed
 */
export { pascalToSnakeCase, extractComponentName };

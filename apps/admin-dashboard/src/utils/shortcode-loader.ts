/**
 * Shortcode Loader
 *
 * Type-safe shortcode registration system for Main Site
 * Follows a simple convention: index.ts files export ShortcodeDefinition arrays
 *
 * @example
 * // In components/shortcodes/auth/index.ts
 * export const authShortcodes: ShortcodeDefinition[] = [...]
 *
 * // In main.tsx
 * await loadShortcodes()
 */

import { registerLazyShortcode, hasShortcodeRegistered as hasShortcode, ShortcodeDefinition } from '@o4o/shortcodes';

/**
 * Type guard to check if a value is a ShortcodeDefinition
 */
function isShortcodeDefinition(value: unknown): value is ShortcodeDefinition {
  if (!value || typeof value !== 'object') return false;

  const def = value as Record<string, unknown>;
  return (
    typeof def.name === 'string' &&
    typeof def.component === 'function'
  );
}

/**
 * Type guard to check if a value is an array of ShortcodeDefinitions
 */
function isShortcodeDefinitionArray(value: unknown): value is ShortcodeDefinition[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;

  return value.every(isShortcodeDefinition);
}

/**
 * Extract shortcode definitions from a module
 * Looks for exported arrays of ShortcodeDefinition objects
 */
function extractShortcodesFromModule(module: Record<string, unknown>): {
  definitions: ShortcodeDefinition[];
  source: string;
}[] {
  const results: { definitions: ShortcodeDefinition[]; source: string }[] = [];

  for (const [exportName, exportValue] of Object.entries(module)) {
    if (isShortcodeDefinitionArray(exportValue)) {
      results.push({
        definitions: exportValue,
        source: exportName
      });
    }
  }

  return results;
}

/**
 * Register a single shortcode with duplicate check
 */
function registerShortcode(
  definition: ShortcodeDefinition,
  sourcePath: string,
  sourceExport: string
): boolean {
  // Skip if already registered
  if (hasShortcode(definition.name)) {
    if (import.meta.env.DEV) {
      console.debug(`[Shortcode] ⏭️  Skipped [${definition.name}] (already registered)`);
    }
    return false;
  }

  // Register with lazy loading
  registerLazyShortcode({
    name: definition.name,
    loader: async () => ({ default: definition.component }),
    description: definition.description || `Registered from ${sourceExport} in ${sourcePath}`,
    attributes: definition.attributes,
    validate: definition.validate
  });

  return true;
}

/**
 * Load and register all shortcodes from component modules
 */
export async function loadShortcodes(): Promise<{
  total: number;
  registered: number;
  skipped: number;
  failed: number;
  names: string[];
}> {
  const stats = {
    total: 0,
    registered: 0,
    skipped: 0,
    failed: 0,
    names: [] as string[]
  };

  // Scan only index files to avoid dynamic/static import mixing warnings
  // Each index file should export a ShortcodeDefinition[] array
  const componentModules = import.meta.glob('../components/shortcodes/**/index.{ts,tsx}', {
    eager: false
  });

  for (const [path, importFn] of Object.entries(componentModules)) {
    // Skip utility files, tests, and type definitions (shouldn't match index files, but just in case)
    if (
      path.includes('/types.') ||
      path.includes('/utils.') ||
      path.includes('/helpers.') ||
      path.includes('/__tests__/') ||
      path.endsWith('.test.ts') ||
      path.endsWith('.test.tsx') ||
      path.endsWith('.spec.ts') ||
      path.endsWith('.spec.tsx')
    ) {
      continue;
    }

    try {
      const module = await importFn() as Record<string, unknown>;
      const shortcodeGroups = extractShortcodesFromModule(module);

      // Process each exported ShortcodeDefinition array
      for (const { definitions, source } of shortcodeGroups) {
        for (const definition of definitions) {
          stats.total++;

          const registered = registerShortcode(definition, path, source);

          if (registered) {
            stats.registered++;
            stats.names.push(definition.name);

            if (import.meta.env.DEV) {
              console.debug(`[Shortcode] ✅ [${definition.name}] from ${source}[] in ${path}`);
            }
          } else {
            stats.skipped++;
          }
        }
      }
    } catch (error) {
      stats.failed++;
      console.error(`[Shortcode] ❌ Failed to load ${path}:`, error);
    }
  }

  return stats;
}

/**
 * Log shortcode loading summary (development only)
 */
export function logShortcodeSummary(stats: Awaited<ReturnType<typeof loadShortcodes>>): void {
  if (!import.meta.env.DEV) return;

  console.group('📦 Shortcode Registry');
  console.debug(`✅ Registered: ${stats.registered} shortcodes`);

  if (stats.skipped > 0) {
    console.debug(`⏭️  Skipped: ${stats.skipped} (already registered)`);
  }

  if (stats.failed > 0) {
    console.warn(`❌ Failed: ${stats.failed}`);
  }

  if (stats.names.length > 0) {
    console.debug('📋 Available shortcodes:', stats.names.sort());
  }

  console.groupEnd();
}

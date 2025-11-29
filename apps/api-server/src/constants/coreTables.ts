/**
 * Core Tables Registry
 *
 * Centralized registry of all tables owned by core apps.
 * Extension apps cannot claim ownership of these tables.
 *
 * This registry is used by:
 * - AppTableOwnershipResolver: to validate ownership claims
 * - AppDataCleaner: to prevent extension apps from deleting core tables
 */

/**
 * Core table registry by app
 * Maps core app ID to its owned tables
 */
export const CORE_TABLES_REGISTRY: Record<string, string[]> = {
  'forum-core': [
    'forum_post',
    'forum_category',
    'forum_comment',
    'forum_tag',
    'forum_like',
    'forum_bookmark',
  ],
  // Future core apps can be added here:
  // 'dropshipping-core': ['ds_product', 'ds_supplier', 'ds_order', ...],
  // 'commerce-core': ['commerce_product', 'commerce_order', 'commerce_payment', ...],
};

/**
 * Core CPT registry by app
 * Maps core app ID to its owned CPTs
 */
export const CORE_CPT_REGISTRY: Record<string, string[]> = {
  'forum-core': [
    'forum_post',
    'forum_category',
    'forum_comment',
    'forum_tag',
  ],
  // Future core apps:
  // 'dropshipping-core': ['ds_product', 'ds_supplier', 'ds_partner', ...],
};

/**
 * Core ACF registry by app
 * Maps core app ID to its owned ACF groups
 */
export const CORE_ACF_REGISTRY: Record<string, string[]> = {
  'forum-core': [],
  // Future core apps:
  // 'cosmetic-core': ['cosmetic_meta', 'ingredient_meta', ...],
};

/**
 * Get all core tables across all core apps
 */
export function getAllCoreTables(): string[] {
  return Object.values(CORE_TABLES_REGISTRY).flat();
}

/**
 * Get all core CPTs across all core apps
 */
export function getAllCoreCPTs(): string[] {
  return Object.values(CORE_CPT_REGISTRY).flat();
}

/**
 * Get all core ACF groups across all core apps
 */
export function getAllCoreACFs(): string[] {
  return Object.values(CORE_ACF_REGISTRY).flat();
}

/**
 * Check if a table is owned by a core app
 */
export function isCoreTable(tableName: string): boolean {
  return getAllCoreTables().includes(tableName);
}

/**
 * Check if a CPT is owned by a core app
 */
export function isCoreCPT(cptName: string): boolean {
  return getAllCoreCPTs().includes(cptName);
}

/**
 * Check if an ACF group is owned by a core app
 */
export function isCoreACF(acfName: string): boolean {
  return getAllCoreACFs().includes(acfName);
}

/**
 * Find which core app owns a specific table
 * Returns the app ID or null if not found
 */
export function findTableOwner(tableName: string): string | null {
  for (const [appId, tables] of Object.entries(CORE_TABLES_REGISTRY)) {
    if (tables.includes(tableName)) {
      return appId;
    }
  }
  return null;
}

/**
 * Find which core app owns a specific CPT
 * Returns the app ID or null if not found
 */
export function findCPTOwner(cptName: string): string | null {
  for (const [appId, cpts] of Object.entries(CORE_CPT_REGISTRY)) {
    if (cpts.includes(cptName)) {
      return appId;
    }
  }
  return null;
}

/**
 * Find which core app owns a specific ACF group
 * Returns the app ID or null if not found
 */
export function findACFOwner(acfName: string): string | null {
  for (const [appId, acfs] of Object.entries(CORE_ACF_REGISTRY)) {
    if (acfs.includes(acfName)) {
      return appId;
    }
  }
  return null;
}

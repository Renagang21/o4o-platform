/**
 * Canonical schema baseline — provenance · version · expected fingerprint
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 *
 * The baseline is a schema-only snapshot of the production database taken AFTER the
 * last historical migration (typeorm_migrations id 678). It contains no data, no seed,
 * no roles rows, no permission data, no credentials, no owners, no privileges, no host.
 *
 * Contract:
 *   - FRESH_EMPTY databases are built from CANONICAL_SCHEMA_BASELINE_STATEMENTS, verified
 *     against `expectedFingerprint`, then marked in `o4o_schema_baselines`.
 *   - The 644 historical migrations in src/database/migrations/ are NEVER replayed and NEVER
 *     bulk-inserted into typeorm_migrations. They remain as history for LEGACY_ESTABLISHED
 *     databases only.
 *   - New migrations after this cutoff are registered in src/database/incremental/manifest.ts.
 *
 * Regeneration (only via an explicit WO, with a new baselineVersion):
 *   pg_dump --schema-only --no-owner --no-privileges --schema=public --schema=cosmetics --schema=neture
 *   node scripts/db/build-canonical-schema-baseline.mjs <dump.sql>
 */

export const CANONICAL_SCHEMA_BASELINE_META = {
  /** Identifies this snapshot. Bump only when the baseline is regenerated. */
  baselineVersion: '2026-09-15-id678',
  bootstrapToolVersion: '1.0.0',

  /** Repository commit whose migration set the snapshot corresponds to. */
  sourceCommit: '22facc22c',
  sourceCapturedAt: '2026-09-15',
  sourceServerVersion: 'PostgreSQL 15.18',

  /** Last row of production typeorm_migrations at capture time (id 678). */
  lastHistoricalMigration: 'BaselineRbacAndAccountTables20270413000000',
  lastHistoricalMigrationId: 678,
  /** Number of migration files kept in src/database/migrations/ (historical, never replayed). */
  historicalMigrationFileCount: 644,

  canonicalSchemas: ['public', 'cosmetics', 'neture'] as const,
  requiredExtensions: [{ name: 'uuid-ossp', schema: 'public' }] as const,

  /** sha256 of computeSchemaFingerprint(...).lines joined by LF — captured read-only from production.
   * Lines pass through normalizeFingerprintLine() first (see schema-fingerprint.ts). The raw,
   * un-normalized production catalog hashes to 947c461bd1a543a90644769b0ade51eb8675b1f8a4ce3a80f51f7a15151c8165
   * and differs from a rebuilt schema in exactly 69 lines (66 CONSTRAINT + 3 INDEX) solely by the
   * deparse form of `IN (...)` predicates: ANY ((ARRAY[...])::text[]) vs ANY (ARRAY[(...)::text, ...]).
   * Normalized, production and a fresh bootstrap (PostgreSQL 15 and 17) hash identically. */
  expectedFingerprint: '58eb27a1c17a484b49a87cb5942da782972f1778968abceec36b42af4024bdb6',
  expectedFingerprintLineCount: 5876,

  /** Object census of the normalized snapshot (statements executed by the bootstrap runner). */
  census: { schemas: 2, enums: 37, tables: 287, sequences: 9, indexes: 770, alterTable: 535, alterSequence: 9, comments: 21, total: 1670 },

  /**
   * Retired objects that MUST NOT appear in the snapshot (verified 0 at generation).
   * user_roles · organization_units · organization_roles · glycopharm_* · cms legacy (acf/cpt/menus/…)
   * · custom_fields · custom_media · custom_post_types · custom_posts.
   */
  retiredObjectPatterns: [
    /^user_roles$/, /^organization_units$/, /^organization_roles$/, /^glycopharm_/,
    /^cms_acf_/, /^cms_cpt_/, /^cms_menus$/, /^cms_menu_items$/, /^cms_menu_locations$/, /^cms_settings$/,
    /^cms_templates$/, /^cms_template_parts$/, /^cms_views$/, /^cms_pages$/, /^cms_fields$/,
    /^custom_fields$/, /^custom_media$/, /^custom_post_types$/, /^custom_posts$/,
  ] as const,

  /**
   * KNOWN_COMPATIBILITY_DEBT — present in production, no entity, no retirement WO.
   * Included in the snapshot as-is; disposition is a separate WO.
   */
  knownCompatibilityDebtTables: [
    'yaksa_categories', 'yaksa_member_affiliations', 'yaksa_member_categories', 'yaksa_member_verifications',
    'yaksa_members', 'yaksa_membership_roles', 'yaksa_membership_years', 'yaksa_post_logs', 'yaksa_posts',
  ] as const,
} as const;

/**
 * Historical migration anchors — names that exist in every LEGACY_ESTABLISHED history
 * (first · early seed · RBAC SSOT · last constraint change · last row). Used by the classifier.
 */
export const LEGACY_HISTORY_ANCHORS = [
  'CreateUsersTable1700000000000',
  'SeedPlatformServices2026020500002',
  'CreateRoleAssignmentsTable1708736400000',
  'ReplaceRoleAssignmentsActiveUniqueConstraint20270301000000',
  'BaselineRbacAndAccountTables20270413000000',
] as const;

/** Core tables every established (legacy or bootstrapped) database must have. */
export const CORE_TABLES = [
  { schema: 'public', table: 'users' },
  { schema: 'public', table: 'roles' },
  { schema: 'public', table: 'role_assignments' },
  { schema: 'public', table: 'permissions' },
  { schema: 'public', table: 'role_permissions' },
  { schema: 'public', table: 'settings' },
  { schema: 'public', table: 'platform_services' },
  { schema: 'public', table: 'service_memberships' },
  { schema: 'public', table: 'organizations' },
  { schema: 'public', table: 'organization_members' },
  { schema: 'public', table: 'app_registry' },
  { schema: 'public', table: 'checkout_orders' },
  { schema: 'public', table: 'store_products' },
  { schema: 'public', table: 'linked_accounts' },
  { schema: 'public', table: 'account_activities' },
  { schema: 'cosmetics', table: 'cosmetics_products' },
  { schema: 'neture', table: 'neture_products' },
] as const;

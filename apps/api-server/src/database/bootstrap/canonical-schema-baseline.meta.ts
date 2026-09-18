/**
 * Canonical schema baseline — provenance · version · expected fingerprint
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1,
 *  rolled over by WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1)
 *
 * The baseline is a schema-only snapshot equal to the production schema at typeorm_migrations
 * id 685 (previous baseline 2026-09-15-id678 + the 7 incremental migrations absorbed by this
 * rollover). It was generated from an ISOLATED PostgreSQL built by the previous bootstrap + all
 * absorbed incrementals, whose fingerprint was verified equal to the production live fingerprint
 * before the snapshot was taken. It contains no data, no seed, no roles rows, no permission data,
 * no credentials, no owners, no privileges, no host.
 *
 * Contract:
 *   - FRESH_EMPTY databases are built from CANONICAL_SCHEMA_BASELINE_STATEMENTS, verified
 *     against `expectedFingerprint`, then marked in `o4o_schema_baselines`.
 *   - Historical migration source files (src/database/migrations/, frozen by
 *     src/database/incremental/historical-migrations.manifest.json) are NOT runtime provenance.
 *     They are NEVER loaded, NEVER replayed and NEVER bulk-inserted into typeorm_migrations.
 *   - Legacy (production) history provenance is verified by the ORDERED HISTORY FINGERPRINT in
 *     src/database/incremental/legacy-history-baseline.ts — never by migration names.
 *   - New migrations after this baseline are registered in src/database/incremental/manifest.ts.
 *
 * Regeneration (only via an explicit WO, with a new baselineVersion — never reuse an old one):
 *   pg_dump --schema-only --no-owner --no-privileges --schema=public --schema=cosmetics --schema=neture
 *   node scripts/db/build-canonical-schema-baseline.mjs <dump.sql>
 */

export const CANONICAL_SCHEMA_BASELINE_META = {
  /** Identifies this snapshot. Bump only when the baseline is regenerated. */
  baselineVersion: '2026-09-18-id685',
  /** Baseline this snapshot supersedes (its marker never existed on any deployed database). */
  supersedesBaselineVersion: '2026-09-15-id678',
  /** Incremental migrations of the superseded baseline absorbed into this snapshot. */
  absorbedIncrementalMigrationCount: 7,
  bootstrapToolVersion: '1.1.0',

  /** Repository commit whose migration set the snapshot corresponds to. */
  sourceCommit: 'a5d56fd04',
  sourceCapturedAt: '2026-09-18',
  /** Isolated generation server. Production (PostgreSQL 15) live fingerprint was verified identical. */
  sourceServerVersion: 'PostgreSQL 15.17',

  canonicalSchemas: ['public', 'cosmetics', 'neture'] as const,
  requiredExtensions: [{ name: 'uuid-ossp', schema: 'public' }] as const,

  /** sha256 of computeSchemaFingerprint(...).lines joined by LF (normalized lines — see schema-fingerprint.ts).
   * Verified on 2026-09-18: production live (read-only) == isolated rollover source == fresh bootstrap of this snapshot. */
  expectedFingerprint: '0ca1a71b9a511f0147583c919eb37814b1ad28f1ba042ceba1038393bb54df70',
  expectedFingerprintLineCount: 5745,

  /** Object census of the normalized snapshot (statements executed by the bootstrap runner). */
  census: { schemas: 2, enums: 34, tables: 279, sequences: 9, indexes: 752, alterTable: 528, alterSequence: 9, comments: 22, total: 1635 },

  /**
   * Retired objects that MUST NOT appear in the snapshot (verified 0 at generation).
   * user_roles · organization_units · organization_roles · cms legacy (acf/cpt/menus/…)
   * · custom_fields · custom_media · custom_post_types · custom_posts
   * · Legacy Partner physical schema (neture_partner* · partner_* · supplier_partner_commissions).
   */
  retiredObjectPatterns: [
    /^user_roles$/, /^organization_units$/, /^organization_roles$/,
    /^cms_acf_/, /^cms_cpt_/, /^cms_menus$/, /^cms_menu_items$/, /^cms_menu_locations$/, /^cms_settings$/,
    /^cms_templates$/, /^cms_template_parts$/, /^cms_views$/, /^cms_pages$/, /^cms_fields$/,
    /^custom_fields$/, /^custom_media$/, /^custom_post_types$/, /^custom_posts$/,
    /^neture_partner/, /^neture_partnership_/, /^neture_seller_partner_contracts$/, /^partner_/, /^supplier_partner_commissions$/,
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

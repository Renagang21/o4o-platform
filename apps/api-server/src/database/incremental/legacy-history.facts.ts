/**
 * Legacy history facts — production typeorm_migrations, captured read-only on 2026-09-15
 * (WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1)
 *
 * The production history (678 rows · 675 distinct names · max id 679) predates the canonical
 * baseline and contains names whose migration files were deleted from the repository before the
 * cutoff (seed / test-account / retired-schema data migrations) plus three names recorded twice.
 * They are explicit historical facts, not something the classifier infers or repairs.
 *
 * A LEGACY_ESTABLISHED history may contain ONLY:
 *   HISTORICAL_MIGRATION_NAMES ∪ LEGACY_HISTORY_RETIRED_NAMES ∪ a contiguous prefix of the
 *   incremental manifest. Any other name → UNKNOWN_PARTIAL.
 * A name may appear at most once, except LEGACY_HISTORY_KNOWN_DUPLICATES (at most twice).
 *
 * Append only under an explicit WO with a read-only production capture. Never used to insert,
 * rename or delete history rows.
 */

/** Names present in production history whose files no longer exist (30). */
export const LEGACY_HISTORY_RETIRED_NAMES: readonly string[] = [
  'AddProductCommissionColumns1732422000000',
  'CreateCMSTablesV2_1733302800000',
  'CreateMembershipYaksaTables1733458800000',
  'ExtendYaksaMemberFields1733600000000',
  'CreateCosmeticsSchema1735470000000',
  'SeedCosmeticsData1735470000001',
  'CreateYaksaTables1735563600000',
  'SeedYaksaData1735563600001',
  'CreateGlycopharmTables1735564800000',
  'SeedGlycopharmData1735564800001',
  'CreateGlucoseViewTables1735566000000',
  'SeedProductionTestAccounts1737000000000',
  'SeedAdditionalTestAccounts1737100200000',
  'UpdateKpaTestAccountPasswords1737400000000',
  'UpdateGlucoseViewTestAccountPasswords1737400100000',
  'CreateTestAccounts1737400200000',
  'UpdateTestAccountEmailsToO4O1737200000000',
  'UpdateOperatorPasswords1769408012358',
  'SeedKpaTestAccounts20260207100000',
  'CreateKpaSocietyOperatorAccount20260212200000',
  'CreateKpaAdminAccount20260216200001',
  'AddYaksa01ToKpaA20260216200002',
  'SeedKpaOperatorTestData1712203200001',
  'SeedKpaOrgJoinAndForumActivity20260404000100',
  'SeedKpaTestPharmacyOwnerOrgMember20260404100000',
  'SeedPhamacy1OrgMember20260405100000',
  'FixPhamacy1OrgMemberAlignment20260419500000',
  'EnsurePhamacy1OrgMemberForKpa20260419600000',
  'SeedKCosmeticsStoreOwnerTestAccount20260501100000',
  'ServiceMembershipCanonicalKeyDataMigration20260928000000',
] as const;

/** Names recorded twice in production history (3). Each may appear at most twice. */
export const LEGACY_HISTORY_KNOWN_DUPLICATES: readonly string[] = [
  'AddGradingFieldsToLmsSubmissions20260503100000',
  'DropSignageDeadTables20260417100000',
  'NormalizeServiceMembershipsKpaKey20260928000000',
] as const;

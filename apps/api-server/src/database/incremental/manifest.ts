/**
 * Incremental migration manifest
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 *
 * This is the ONLY migration list the deploy job (src/migrate.ts) and the TypeORM CLI load.
 * It contains migrations created AFTER the canonical baseline cutoff. The 644 historical
 * migrations in src/database/migrations/ are listed in historical-migrations.manifest.json
 * and are never loaded, never replayed and never bulk-inserted into typeorm_migrations.
 *
 * Adding a migration (enforced by scripts/db/check-migration-contract.mjs in CI):
 *   1. file    src/database/migrations/<epoch13>-<PascalName>.ts     (epoch13 = Date.now(), 13 digits)
 *   2. class   export class <PascalName><epoch13> implements MigrationInterface
 *   3. name    name = '<PascalName><epoch13>'   (identical to the class name)
 *   4. epoch13 > every epoch already in INCREMENTAL_MIGRATIONS (strictly increasing)
 *   5. import it here and append it to INCREMENTAL_MIGRATIONS (append only; never reorder)
 * Never rename, renumber or edit an applied migration; never modify typeorm_migrations rows.
 */

import type { MigrationInterface } from 'typeorm';
// WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
import { CreateStoreTabletDevicesAndScreenSetDescription1789435443554 } from '../migrations/1789435443554-CreateStoreTabletDevicesAndScreenSetDescription.js';
// WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 (Phase 1 · expand)
import { RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment1789523426775 } from '../migrations/1789523426775-RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment.js';
// WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 (Phase 2 · contract)
import { DropSellerRecruitmentCompatViewsAndSelectedSellerIds1789525702200 } from '../migrations/1789525702200-DropSellerRecruitmentCompatViewsAndSelectedSellerIds.js';
// WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 (PHASE 1 · same-run resume coordination ledger)
import { CreateWorkRunCoordination1789540958496 } from '../migrations/1789540958496-CreateWorkRunCoordination.js';
// WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1 (Identity V3 Phase 2-A · F10 exception)
import { PrepareGoogleIdentityLinkedAccountsAndUsersConstraints1789648511051 } from '../migrations/1789648511051-PrepareGoogleIdentityLinkedAccountsAndUsersConstraints.js';
// WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 (이용약관 acceptance 이력 · SSOT)
import { CreateUserPolicyAcceptances1789649959243 } from '../migrations/1789649959243-CreateUserPolicyAcceptances.js';
// WO-O4O-RETIRED-SERVICE-SCHEMA-ENUM-CLEANUP-V1 (retired enum label 제거 · DB_SCHEMA_RESIDUAL 1 → 0)
import { RemoveRetiredCheckoutOrderTypeEnumValue1789690338675 } from '../migrations/1789690338675-RemoveRetiredCheckoutOrderTypeEnumValue.js';

export const INCREMENTAL_MIGRATION_CUTOFF = {
  baselineVersion: '2026-09-15-id678',
  /** Last historical migration (production typeorm_migrations id 678). */
  lastHistoricalMigration: 'BaselineRbacAndAccountTables20270413000000',
  /** TypeORM orders by parseInt(name.slice(-13)); the last historical sorts as this value. */
  lastHistoricalSortKey: 270413000000,
  /** Every incremental migration must carry a 13-digit epoch ≥ this (2026-01-01T00:00:00Z). */
  minimumEpoch13: 1767225600000,
} as const;

export type MigrationClass = new () => MigrationInterface;

/** Append only. Order must match ascending epoch. */
export const INCREMENTAL_MIGRATIONS: readonly MigrationClass[] = [
  CreateStoreTabletDevicesAndScreenSetDescription1789435443554,
  RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment1789523426775,
  DropSellerRecruitmentCompatViewsAndSelectedSellerIds1789525702200,
  CreateWorkRunCoordination1789540958496,
  PrepareGoogleIdentityLinkedAccountsAndUsersConstraints1789648511051,
  CreateUserPolicyAcceptances1789649959243,
  RemoveRetiredCheckoutOrderTypeEnumValue1789690338675,
];

export function incrementalMigrationNames(): string[] {
  return INCREMENTAL_MIGRATIONS.map((m) => {
    const instance = new m();
    const name = (instance as { name?: string }).name ?? m.name;
    if (name !== m.name) {
      throw new Error(`incremental migration name/class mismatch: name='${name}' class='${m.name}'`);
    }
    return name;
  });
}

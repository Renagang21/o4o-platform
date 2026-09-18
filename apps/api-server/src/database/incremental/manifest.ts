/**
 * Incremental migration manifest
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1,
 *  rolled over by WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1)
 *
 * This is the ONLY migration list the deploy job (src/migrate.ts) and the TypeORM CLI load.
 * It contains migrations created AFTER the canonical baseline 2026-09-18-id685. The historical
 * migration source files in src/database/migrations/ are frozen by
 * historical-migrations.manifest.json and are never loaded, never replayed and never
 * bulk-inserted into typeorm_migrations. They are not runtime provenance: legacy production
 * history is verified by the ordered history fingerprint in legacy-history-baseline.ts.
 *
 * The 7 incremental migrations of baseline 2026-09-15-id678 were absorbed into baseline
 * 2026-09-18-id685 (their typeorm_migrations rows are part of the legacy history fingerprint;
 * their source files were removed together with the rollover).
 *
 * Adding a migration (enforced by scripts/db/check-migration-contract.mjs in CI):
 *   1. file    src/database/migrations/<epoch13>-<PascalName>.ts     (epoch13 = Date.now(), 13 digits)
 *   2. class   export class <PascalName><epoch13> implements MigrationInterface
 *   3. name    name = '<PascalName><epoch13>'   (identical to the class name)
 *   4. epoch13 > every epoch already in INCREMENTAL_MIGRATIONS (strictly increasing) and
 *      >= INCREMENTAL_MIGRATION_CUTOFF.minimumEpoch13
 *   5. import it here and append it to INCREMENTAL_MIGRATIONS (append only; never reorder)
 *   6. register the resulting expected schema state in expected-schema-states.ts (lockstep)
 * Never rename, renumber or edit an applied migration; never modify typeorm_migrations rows.
 */

import type { MigrationInterface } from 'typeorm';
// WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 (종료·반환·7일 파기 case SSOT)
import { CreateStoreOwnerTerminationCases1789701000000 } from '../migrations/1789701000000-CreateStoreOwnerTerminationCases.js';

export const INCREMENTAL_MIGRATION_CUTOFF = {
  baselineVersion: '2026-09-18-id685',
  /**
   * Every incremental migration must carry a 13-digit epoch >= this value — one past the epoch of
   * the last migration absorbed into the baseline, so no incremental can sort before the baseline.
   */
  minimumEpoch13: 1789690338676,
} as const;

export type MigrationClass = new () => MigrationInterface;

/** Append only. Order must match ascending epoch. */
export const INCREMENTAL_MIGRATIONS: readonly MigrationClass[] = [
  CreateStoreOwnerTerminationCases1789701000000,
];

export function incrementalMigrationNames(): string[] {
  // Append-only registry: empty right after a baseline rollover, populated by the next incremental
  // migration. The emptiness is a point-in-time fact, not a reason to drop this read path.
  return INCREMENTAL_MIGRATIONS.map((m) => { // NOSONAR typescript:S4158
    const instance = new m();
    const name = (instance as { name?: string }).name ?? m.name;
    if (name !== m.name) {
      throw new Error(`incremental migration name/class mismatch: name='${name}' class='${m.name}'`);
    }
    return name;
  });
}

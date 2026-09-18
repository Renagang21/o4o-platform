/**
 * Legacy history baseline — production typeorm_migrations up to canonical baseline 2026-09-18-id685,
 * captured read-only on 2026-09-18 (cross-checked: in-database sha256 == this helper)
 * (WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1)
 *
 * The production database predates every canonical baseline: its typeorm_migrations rows are an
 * immutable audit record and are NEVER inserted, updated, renamed, reordered or deleted. Their
 * provenance is proven by an ordered fingerprint of the first `rowCount` rows (id order), computed
 * by `hashOrderedHistoryNames` in bootstrap/legacy-history-fingerprint.ts — the only hash
 * implementation. The repository holds no plaintext list of those names.
 *
 * A LEGACY_ESTABLISHED history is EXACTLY: this prefix + a contiguous prefix of the incremental
 * manifest. Anything else → UNKNOWN_PARTIAL.
 *
 * Re-capture only under an explicit WO with a read-only production SELECT (never from a rebuilt
 * or edited history) and record the capture in a CHECK.
 */

export interface LegacyHistoryBaseline {
  /** Rows in the legacy prefix (typeorm_migrations rows with id <= capturedThroughId). */
  readonly rowCount: number;
  /** Distinct names in that prefix (three names were recorded twice by earlier tooling). */
  readonly distinctNameCount: number;
  /** sha256 over `name + '\n'` for every prefix row, id order (see hashOrderedHistoryNames). */
  readonly orderedNameSequenceSha256: string;
  /** Last typeorm_migrations.id inside the prefix (the id sequence has one gap, so id != row count). */
  readonly capturedThroughId: number;
  readonly capturedAt: string;
}

export const LEGACY_HISTORY_BASELINE: LegacyHistoryBaseline = {
  rowCount: 684,
  distinctNameCount: 681,
  orderedNameSequenceSha256: '87cc2bce8b2c7b06a117988d4ade7eb78566a4d821e4cfb032c46735d3c309b7',
  capturedThroughId: 685,
  capturedAt: '2026-09-18',
} as const;

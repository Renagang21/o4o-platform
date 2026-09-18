/**
 * Ordered migration-history fingerprint — pure functions, no database access
 * (WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1)
 *
 * The legacy (pre-baseline) production history is verified as a whole, in typeorm_migrations id
 * order, by ONE hash — the repository holds no plaintext copy of those migration names any more.
 *
 * Hash rule (canonical, shared by the classifier, the isolated-PostgreSQL harness and the specs;
 * there is no second implementation anywhere):
 *   sha256( name[0] + '\n' + name[1] + '\n' + … + name[n-1] + '\n' )   UTF-8, lowercase hex
 *
 * The classifier compares history[0 .. rowCount-1] against LEGACY_HISTORY_BASELINE. A renamed,
 * missing, reordered or inserted row changes the hash → UNKNOWN_PARTIAL (fail-closed).
 */

import { createHash } from 'crypto';
import type { LegacyHistoryBaseline } from '../incremental/legacy-history-baseline.js';

/** Canonical ordered-name hash. `names` in typeorm_migrations id order, duplicates included. */
export function hashOrderedHistoryNames(names: readonly string[]): string {
  const h = createHash('sha256');
  for (const n of names) h.update(`${n}\n`, 'utf8');
  return h.digest('hex');
}

export interface LegacyHistoryPrefixResult {
  /** true only when the first `baseline.rowCount` history rows reproduce the baseline exactly. */
  readonly match: boolean;
  readonly rowCount: number;
  readonly distinctNameCount: number;
  readonly orderedNameSequenceSha256: string | null;
  /** History rows after the legacy prefix (must be a contiguous incremental-manifest prefix). */
  readonly remainder: readonly string[];
  readonly problems: readonly string[];
}

/**
 * Verify that `historyNames` (id order) starts with the legacy baseline. Never repairs anything.
 */
export function verifyLegacyHistoryPrefix(
  historyNames: readonly string[],
  baseline: LegacyHistoryBaseline,
): LegacyHistoryPrefixResult {
  const problems: string[] = [];
  if (historyNames.length < baseline.rowCount) {
    problems.push(`typeorm_migrations has ${historyNames.length} rows, fewer than the legacy history baseline (${baseline.rowCount})`);
    return { match: false, rowCount: historyNames.length, distinctNameCount: new Set(historyNames).size, orderedNameSequenceSha256: null, remainder: [], problems };
  }
  const prefix = historyNames.slice(0, baseline.rowCount);
  const remainder = historyNames.slice(baseline.rowCount);
  const distinctNameCount = new Set(prefix).size;
  const orderedNameSequenceSha256 = hashOrderedHistoryNames(prefix);
  if (distinctNameCount !== baseline.distinctNameCount) {
    problems.push(`legacy history prefix has ${distinctNameCount} distinct names, baseline expects ${baseline.distinctNameCount}`);
  }
  if (orderedNameSequenceSha256 !== baseline.orderedNameSequenceSha256) {
    problems.push(
      `legacy history fingerprint ${orderedNameSequenceSha256.slice(0, 12)}… != baseline ${baseline.orderedNameSequenceSha256.slice(0, 12)}… ` +
        `(first ${baseline.rowCount} rows: a renamed, missing, reordered or inserted row)`,
    );
  }
  return { match: problems.length === 0, rowCount: prefix.length, distinctNameCount, orderedNameSequenceSha256, remainder, problems };
}

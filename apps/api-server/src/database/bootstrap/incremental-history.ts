/**
 * Migration history rules — pure functions, no database access
 * (WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1)
 *
 * Incremental prefix rule
 *   The incremental migrations recorded in typeorm_migrations (in id order) must be EXACTLY
 *   manifest[0..k-1] for some k. Gaps ([M2]), skips ([M1, M3]), reversals ([M3, M2]) and
 *   duplicates are rejected — the classifier turns any violation into UNKNOWN_PARTIAL.
 *
 * Legacy history name rule
 *   A LEGACY_ESTABLISHED history may contain only historical names, the explicit retired-name
 *   facts, and the incremental prefix. Each name at most once (known duplicates: at most twice).
 */

import { HISTORICAL_MIGRATION_NAMES } from '../incremental/historical-migration-names.js';
import { LEGACY_HISTORY_KNOWN_DUPLICATES, LEGACY_HISTORY_RETIRED_NAMES } from '../incremental/legacy-history.facts.js';

export interface IncrementalPrefixResult {
  /** Number of manifest migrations applied as a contiguous prefix (valid only when `contiguous`). */
  readonly prefixLength: number;
  readonly contiguous: boolean;
  /** Manifest names found in history, in history (id) order, duplicates included. */
  readonly appliedSequence: readonly string[];
  readonly applied: readonly string[];
  readonly pending: readonly string[];
  readonly problems: readonly string[];
}

/**
 * `historyNames` in typeorm_migrations id order; `manifestNames` in manifest order.
 */
export function resolveIncrementalPrefix(
  historyNames: readonly string[],
  manifestNames: readonly string[],
): IncrementalPrefixResult {
  const manifestIndex = new Map(manifestNames.map((n, i) => [n, i] as const));
  const appliedSequence = historyNames.filter((n) => manifestIndex.has(n));
  const problems: string[] = [];

  const seen = new Set<string>();
  for (const n of appliedSequence) {
    if (seen.has(n)) problems.push(`incremental migration '${n}' recorded more than once`);
    seen.add(n);
  }

  const distinct = [...seen];
  const expected = manifestNames.slice(0, distinct.length);
  const inOrder = distinct.every((n, i) => n === expected[i]);
  if (!inOrder) {
    const indices = distinct.map((n) => manifestIndex.get(n)!);
    const sortedContiguous = indices.every((v, i) => v === i);
    if (!sortedContiguous) {
      const missing = expected.filter((n) => !seen.has(n));
      problems.push(
        `incremental history [${distinct.join(', ')}] is not a contiguous prefix of the manifest` +
          (missing.length > 0 ? ` (missing ${missing.join(', ')})` : ''),
      );
    } else {
      problems.push(`incremental history [${distinct.join(', ')}] is out of manifest order`);
    }
  }

  const contiguous = problems.length === 0;
  const prefixLength = contiguous ? distinct.length : -1;
  const applied = contiguous ? distinct : [];
  const pending = contiguous ? manifestNames.slice(distinct.length) : [];
  return { prefixLength, contiguous, appliedSequence, applied, pending, problems };
}

export interface LegacyHistoryNameResult {
  /** Names that are neither historical, retired-fact nor incremental manifest names. */
  readonly unknown: readonly string[];
  /** Names recorded more often than the historical facts allow. */
  readonly duplicateProblems: readonly string[];
}

export function validateLegacyHistoryNames(
  historyNames: readonly string[],
  manifestNames: readonly string[],
  facts: {
    historical?: readonly string[];
    retired?: readonly string[];
    knownDuplicates?: readonly string[];
  } = {},
): LegacyHistoryNameResult {
  const historical = new Set(facts.historical ?? HISTORICAL_MIGRATION_NAMES);
  const retired = new Set(facts.retired ?? LEGACY_HISTORY_RETIRED_NAMES);
  const knownDuplicates = new Set(facts.knownDuplicates ?? LEGACY_HISTORY_KNOWN_DUPLICATES);
  const manifest = new Set(manifestNames);

  const counts = new Map<string, number>();
  for (const n of historyNames) counts.set(n, (counts.get(n) ?? 0) + 1);

  const unknown: string[] = [];
  const duplicateProblems: string[] = [];
  for (const [n, c] of counts) {
    if (!historical.has(n) && !retired.has(n) && !manifest.has(n)) unknown.push(n);
    const allowed = knownDuplicates.has(n) ? 2 : 1;
    if (c > allowed && !manifest.has(n)) duplicateProblems.push(`'${n}' recorded ${c} times (allowed ${allowed})`);
  }
  return { unknown, duplicateProblems };
}

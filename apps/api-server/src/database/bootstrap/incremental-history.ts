/**
 * Migration history rules — pure functions, no database access
 * (WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1)
 *
 * Incremental prefix rule
 *   The incremental migrations recorded in typeorm_migrations (in id order) must be EXACTLY
 *   manifest[0..k-1] for some k. Gaps ([M2]), skips ([M1, M3]), reversals ([M3, M2]) and
 *   duplicates are rejected — the classifier turns any violation into UNKNOWN_PARTIAL.
 *
 * Legacy history rule
 *   Lives in legacy-history-fingerprint.ts: the first `rowCount` rows of a LEGACY_ESTABLISHED
 *   history must hash to the ordered history fingerprint; the remainder must be exactly the
 *   contiguous incremental prefix above. No migration name is consulted.
 */

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

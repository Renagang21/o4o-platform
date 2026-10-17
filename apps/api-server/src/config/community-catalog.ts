/** Historical ledger tombstones, not an active community catalog.
 * community.neture.co.kr is one service. Never repopulate the former directory.
 * Original storage codes remain excluded from generic APIs until data disposition.
 */
export const O4O_COMMUNITIES = Object.freeze([] as const);
const RETIRED_FORUM_OWNERS: Readonly<Record<string, string>> = Object.freeze({
  'kpa-society': 'pharmacy', 'pharmacy-hub': 'pharmacy', 'k-cosmetics': 'cosmetics', neture: 'o4o-general',
});

/** Also reserve tombstones so a business cannot claim a retired or service-owned URL. */
export function isReservedCommunityKey(key: string): boolean {
  return key === 'community' || Object.values(RETIRED_FORUM_OWNERS).includes(key);
}

export const CATALOG_FORUM_STORAGE_CODES: readonly string[] = Object.freeze([
  ...Object.keys(RETIRED_FORUM_OWNERS), 'community',
]);

/** Legacy mounts resolve to retired keys and fail closed, rather than falling back to public reads. */
export function communityKeyForServiceEntry(serviceKey: string | null | undefined): string | undefined {
  return RETIRED_FORUM_OWNERS[String(serviceKey ?? '').trim()];
}

/** Forum administration must resolve live service membership even on generic routes. */
export function communityKeyForForumStorageCode(storageCode: string | null | undefined): string | undefined {
  const key = String(storageCode ?? '').trim();
  return key === 'community' ? 'community' : RETIRED_FORUM_OWNERS[key];
}

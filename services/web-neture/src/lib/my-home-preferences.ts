/** Browser-local identifiers only. Current server-owned entries remain authoritative. */
export const PIN_LIMIT = 6;
export const RECENT_LIMIT = 4;
export type MyHomePreferences = { pinned: string[]; recent: string[] };
export const myHomePreferencesKey = (accountId: string) =>
  `o4o:my-home:v1:${encodeURIComponent(accountId)}`;

const ids = (value: unknown, limit: number): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string =>
              typeof id === "string" && id.length > 0 && id.length <= 256,
          ),
        ),
      ].slice(0, limit)
    : [];

export function parseMyHomePreferences(
  value: string | null,
): MyHomePreferences {
  if (!value) return { pinned: [], recent: [] };
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid preferences");
  const data = parsed as Record<string, unknown>;
  return {
    pinned: ids(data.pinned, PIN_LIMIT),
    recent: ids(data.recent, RECENT_LIMIT),
  };
}

export function availableMyHomePreferences(
  preferences: MyHomePreferences,
  available: ReadonlySet<string>,
): MyHomePreferences {
  return {
    pinned: preferences.pinned.filter((id) => available.has(id)),
    recent: preferences.recent.filter((id) => available.has(id)),
  };
}

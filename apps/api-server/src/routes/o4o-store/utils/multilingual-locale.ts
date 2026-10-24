/** Existing public resolve ordering; only published pages can be returned. */
export function pickFallbackPage<T extends { locale: string; status: string }>(
  pages: T[],
  requestedLocale: string | null,
  defaultLocale: string,
) {
  const requested = requestedLocale
    ? pages.find(
        (p) => p.locale === requestedLocale && p.status === "published",
      )
    : undefined;
  if (requested)
    return {
      ...requested,
      resolvedLocale: requested.locale,
      fallbackReason: null,
    };
  const fallback = ["en", defaultLocale, "ko"]
    .map((locale) =>
      pages.find((p) => p.locale === locale && p.status === "published"),
    )
    .find(Boolean);
  return fallback
    ? {
        ...fallback,
        resolvedLocale: fallback.locale,
        fallbackReason: "requested_locale_missing",
      }
    : null;
}

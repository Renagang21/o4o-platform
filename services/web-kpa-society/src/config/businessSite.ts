/** Shared pharmacy application: business configuration never grants membership or a role. */
export function resolveBusinessSite(
  hostname: string,
  configuredKey?: string,
  configuredName?: string,
) {
  const key =
    configuredKey?.trim() ||
    (hostname.toLowerCase().replace(/^www\./, "") === "megapharm.neture.co.kr"
      ? "megapharm"
      : "pharmacy");
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(key))
    throw new Error("Invalid pharmacy business site key");
  return {
    key,
    name:
      configuredName?.trim() ||
      (key === "megapharm" ? "메가팜 · 창고형약국" : "O4O 약국"),
    authServiceKey: key === "pharmacy" ? "kpa-society" : "neture",
  };
}
export const BUSINESS_SITE = resolveBusinessSite(
  typeof window === "undefined" ? "" : window.location.hostname,
  import.meta.env.VITE_PHARMACY_BUSINESS_KEY,
  import.meta.env.VITE_PHARMACY_BUSINESS_NAME,
);

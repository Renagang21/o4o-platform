import { getCooperationExtension } from '@o4o/shared-space-ui';

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
  const extension = getCooperationExtension(key);
  return {
    key,
    name:
      configuredName?.trim() ||
      (extension?.siteName ?? "O4O 약국"),
    authServiceKey: extension?.model.sessionServiceKey ?? "neture",
  };
}
export const BUSINESS_SITE = resolveBusinessSite(
  typeof window === "undefined" ? "" : window.location.hostname,
  import.meta.env.VITE_PHARMACY_BUSINESS_KEY,
  import.meta.env.VITE_PHARMACY_BUSINESS_NAME,
);

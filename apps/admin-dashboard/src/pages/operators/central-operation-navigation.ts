export const centralOperationAreas: Record<string, readonly string[]> = {
  neture: ["members", "inbox", "pharmacies", "qualifications"],
  supplier: ["members", "inbox", "suppliers"],
  funding: ["members", "inbox", "funding"],
  lecture: ["members", "inbox", "courses"],
  community: ["members", "inbox", "editorial", "boards"],
  "partner-support": ["members", "inbox"],
  pharmcoop: ["federation"],
};
const origins: Record<string, string> = {
  neture: "https://neture.co.kr",
  supplier: "https://supplier.neture.co.kr",
  funding: "https://funding.neture.co.kr",
  lecture: "https://study.neture.co.kr",
  community: "https://community.neture.co.kr",
  "partner-support": "https://partner.neture.co.kr",
};
const commonAreas: Record<string, string> = {
  "/service-members": "members",
  "/operator/service-members": "members",
  "/operator/members": "members",
  "/operator/inbox": "inbox",
};
const taskAreas: Record<string, Record<string, string>> = {
  neture: { "/operator/pharmacy-memberships": "pharmacies" },
  supplier: { "/operator/suppliers": "suppliers" },
  funding: { "/operator/market-trial": "funding" },
  lecture: { "/operator/courses": "courses" },
  community: {
    "/operator/community/home": "editorial",
    "/communities/boards": "boards",
  },
  "partner-support": { "/operator": "members" },
};
/** Known work goes centrally; retained specialist screens keep their original host rather than becoming broken admin-relative links. */
export function centralTaskHref(service: string, href: string): string {
  const fallback = `/operations/${encodeURIComponent(service)}/members`;
  const origin = origins[service];
  if (!origin) return fallback;
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || url.protocol !== "https:") return fallback;
    // Queries/fragments can select specialist tabs and recovery workflows not present centrally.
    if (url.search || url.hash) return url.href;
    const area =
      commonAreas[url.pathname] ?? taskAreas[service]?.[url.pathname];
    return area
      ? `/operations/${encodeURIComponent(service)}/${area}`
      : url.href;
  } catch {
    return fallback;
  }
}

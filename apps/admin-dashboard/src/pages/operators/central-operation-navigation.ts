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
/** Known work goes centrally; retained specialist screens keep their original host rather than becoming broken admin-relative links. */
export function centralTaskHref(service: string, href: string): string {
  const fallback = `/operations/${encodeURIComponent(service)}/members`;
  const origin = origins[service];
  if (!origin) return fallback;
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || url.protocol !== "https:") return fallback;
    const path = url.pathname;
    let area: string | undefined;
    if (path.includes("/service-members") || path.includes("/operator/members"))
      area = "members";
    if (path.includes("/operator/inbox")) area = "inbox";
    if (
      service === "neture" &&
      path.startsWith("/operator/pharmacy-memberships")
    )
      area = "pharmacies";
    if (service === "supplier" && path.startsWith("/operator/suppliers"))
      area = "suppliers";
    if (service === "funding" && path.startsWith("/operator/market-trial"))
      area = "funding";
    if (service === "lecture" && path.startsWith("/operator/courses"))
      area = "courses";
    if (service === "community" && path.startsWith("/operator/community/home"))
      area = "editorial";
    if (service === "community" && path.includes("/communities/boards"))
      area = "boards";
    if (service === "partner-support" && path === "/operator") area = "members";
    return area
      ? `/operations/${encodeURIComponent(service)}/${area}`
      : url.href;
  } catch {
    return fallback;
  }
}

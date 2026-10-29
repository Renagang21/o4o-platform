import { CENTRAL_OPERATION_MENUS } from '@o4o/types';
export const centralOperationAreas: Record<string, readonly string[]> = {
  neture: ["membership-cleanup", "service-approval-management", "service-members", "cleanup", "category-mapping", "settlements", "notifications", "ai-report", "community-advertising", "analytics", "stores", "actions", "product-approvals", "candidates", "products", "service-product-approvals", "applications", "legacy-contact", "cms", "orders", "members", "inbox", "pharmacies", "qualifications", "home", "legal", "contact-settings", "guides", "forums", "forum-delete", "forum-deleted", "forum-analytics"],
  supplier: ["members", "inbox", "suppliers", "governance", "home", "legal", "contact-settings"],
  funding: ["members", "inbox", "funding", "home", "legal", "contact-settings"],
  lecture: ["members", "inbox", "courses", "instructors", "certificates", "contact", "home", "contact-settings", "legal"],
  community: ["members", "inbox", "editorial", "boards", "forums", "erase-members", "erase-boards", "home", "legal", "contact-settings"],
  "partner-support": ["reports", "posts", "members", "boards", "events"],
  pharmcoop: ["federation", "inbox", "home"],
};
const origins: Record<string, string> = {
  neture: "https://neture.co.kr",
  supplier: "https://supplier.neture.co.kr",
  funding: "https://funding.neture.co.kr",
  lecture: "https://study.neture.co.kr",
  community: "https://community.neture.co.kr",
  "partner-support": "https://partner.neture.co.kr",
  pharmcoop: "https://pharmcoop.neture.co.kr",
};
/** Convert only actual native workspaces. Public/own-business pages keep their original service. */
export function centralTaskHref(service: string, href: string): string {
  const first = service === 'neture' ? 'members' : centralOperationAreas[service]?.[0];
  const fallback = first ? `/operations/${encodeURIComponent(service)}/${first}` : '/operations';
  const origin = origins[service];
  if (!origin) return fallback;
  try {
    const url = new URL(href, origin);
    const native = (area: string, suffix = '') => `/operations/${encodeURIComponent(service)}/${area}${suffix}${url.search}${url.hash}`;
    if (url.origin === 'https://admin.neture.co.kr') {
      const allowed = centralOperationAreas[service]?.some(area => url.pathname === `/operations/${service}/${area}`);
      const detail = new RegExp(`^/operations/${service}/(?:service-members|members|courses|funding)/[^/]+$`).test(url.pathname);
      return allowed || detail ? `${url.pathname}${url.search}${url.hash}` : fallback;
    }
    if (url.origin !== origin || url.protocol !== 'https:') return fallback;
    if (service === 'funding') {
      const detail = /^\/operator\/market-trial\/([^/]+)(?:\/offline-operations)?$/.exec(url.pathname);
      if (detail) return native('funding', `/${detail[1]}`);
    }
    if (service === 'lecture') {
      const detail = /^\/operator\/courses\/([^/]+)(?:\/review)?$/.exec(url.pathname);
      if (detail) return native('courses', `/${detail[1]}`);
      if (url.pathname === '/operator/courses') return native('courses');
    }
    if(service === 'neture') {
      const detail=/^\/operator\/(?:users|members)\/([^/]+)$/.exec(url.pathname);
      if(detail)return native('service-members',`/${detail[1]}`);
      if(['/operator/users','/operator/members'].includes(url.pathname))return native('service-members');
    }
    const member = /^\/operator\/(?:members|service-members\/[^/]+)\/([^/]+)$/.exec(url.pathname);
    if (member && centralOperationAreas[service]?.includes('members')) return native('members', `/${member[1]}`);
    if (['/operator/members','/operator/service-members','/service-members'].includes(url.pathname)) return native('members');
    if (url.pathname === '/operator/inbox' && centralOperationAreas[service]?.includes('inbox')) return native('inbox');
    if (service === 'community' && url.pathname === '/operator/community/home') return native('editorial'); // historical task producer
    const menu = CENTRAL_OPERATION_MENUS.find(item => item.service === service && centralOperationAreas[service]?.includes(item.area) && item.sourcePaths.includes(url.pathname));
    return menu ? native(menu.area) : url.href;
  } catch { return fallback; }
}

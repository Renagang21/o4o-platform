import type { DataSource } from 'typeorm';
import { centralMenusForRole, type CentralOperationService } from '@o4o/types';
import { readInboxTasks } from '../../modules/contact-inquiry/inbox-tasks.js';
import type { InboxScope } from '../../modules/contact-inquiry/inbox-scope.js';

const taskAreas: Record<string, Record<string, string>> = {
  neture: { 'legacy-contact': 'legacy-contact', 'product-review': 'product-approvals', 'service-product-review': 'service-product-approvals', 'product-candidates': 'candidates', 'pharmacist-qualifications': 'qualifications', 'pharmacy-applications': 'pharmacies' },
  supplier: { 'supplier-review': 'suppliers', 'supplier-resubmitted': 'suppliers' },
  lecture: { 'lecture-courses': 'courses', 'lecture-instructors': 'instructors', 'lecture-contact': 'contact', 'lecture-legacy-contact': 'contact' },
  community: { 'community-members': 'members', 'community-forums': 'forums' },
  pharmcoop: { affiliations: 'federation' },
  'partner-support': { 'partner-reports': 'reports' },
};
export function centralMenuForTask(service: string, key: string): string | null {
  const area = service === 'funding' ? 'funding' : taskAreas[service]?.[key];
  return area ? `${service}.${area}` : null;
}

/** Reuse current queue sources; client input never chooses another operator's services or recipient. */
export async function centralOperationOverview(db: Pick<DataSource, 'query'>, userId: string, roles: readonly string[], menuKeys?: readonly string[]) {
  const menus = roles.flatMap(role => centralMenusForRole(role)).filter(menu => !menuKeys || menuKeys.includes(menu.key));
  const services = [...new Set(menus.map(menu => menu.service))];
  const allowed = new Set(menus.map(menu => menu.key));
  const tasks = (await Promise.all(services.map(async (service: CentralOperationService) => {
    if (service === 'partner-support') {
      try {
        const [row] = await db.query("SELECT COUNT(*)::int count,MIN(created_at) oldest FROM partner_community_reports WHERE status='open'");
        return [{ key: 'partner-reports', label: '파트너 신고 검토', service, href: 'https://partner.neture.co.kr/operator', count: Number(row.count), oldest: row.oldest, available: true }];
      } catch {
        return [{ key: 'partner-reports', label: '파트너 신고 검토', service, href: 'https://partner.neture.co.kr/operator', count: null, oldest: null, available: false }];
      }
    }
    const scope: InboxScope = { kind: 'service', key: service, name: service, serviceKey: service, organizationId: null, publicPath: '/contact', managePath: '/operator', taskPath: '/operator' };
    return (await readInboxTasks(db, scope)).map(task => ({ ...task, service }));
  }))).flat().filter(task => {
    const menu = centralMenuForTask(task.service, task.key);
    return menu !== null && allowed.has(menu);
  });
  let unreadCount: number | null = null;
  try {
    const [row] = await db.query(`SELECT COUNT(*)::int count FROM notifications WHERE "userId"=$1 AND "isRead"=false AND "serviceKey"=ANY($2::text[]) AND "organizationId" IS NULL AND (metadata->>'operationMenu' IS NULL OR metadata->>'operationMenu'=ANY($3::text[]))`, [userId, services, [...allowed]]);
    unreadCount = Number(row.count);
  } catch { /* A failed count is unavailable, never a fabricated zero. */ }
  return { services, tasks, unreadCount, generatedAt: new Date().toISOString() };
}

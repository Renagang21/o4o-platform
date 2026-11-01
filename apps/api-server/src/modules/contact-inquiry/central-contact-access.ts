import type { EntityManager } from 'typeorm';
import { centralOperationRoles } from '../../services/admin/central-operation-access.js';
import { centralOperationMenuKeys } from '../../services/admin/central-operation-menu-grants.js';
import { OperationError } from '../../services/operations/operation-audit.js';

/** General service inquiries are central duties; organization-owned inboxes never use this map. */
export const CENTRAL_CONTACT_MENUS: Readonly<Record<string, string>> = {
  neture: 'neture.inbox', supplier: 'supplier.inbox', funding: 'funding.inbox',
  community: 'community.inbox', lecture: 'lecture.contact', pharmcoop: 'pharmcoop.inbox',
  store: 'neture.inbox', hospital: 'neture.inbox',
  'kpa-society': 'neture.inbox', 'kpa-branch': 'neture.inbox',
};
type Db = Pick<EntityManager, 'query'>;
export async function hasCentralContactMenu(db: Db, actor: string, menu: string): Promise<boolean> {
  const roles = await centralOperationRoles(db, actor);
  if (!roles.length) return false;
  return (await centralOperationMenuKeys(db, actor, roles)).includes(menu);
}
export async function assertCentralContactMenu(db: Db, actor: string, menu: string | undefined, method?: string) {
  if (method !== 'google' || !menu || !(await hasCentralContactMenu(db, actor, menu)))
    throw new OperationError(403, 'CENTRAL_CONTACT_REQUIRED', 'Google로 로그인한 중앙 문의 담당 operator 권한이 필요합니다.');
}
export async function assertCentralContactAccess(db: Db, actor: string, service: string, method?: string) {
  return assertCentralContactMenu(db, actor, CENTRAL_CONTACT_MENUS[service], method);
}
export async function centralContactRecipients(db: Db, menu: string): Promise<{userId: string}[]> {
  const service = menu.split('.')[0];
  const roles = service === 'pharmcoop' ? ['neture:pharmcoop_admin','neture:pharmcoop_operator'] : [`${service}:admin`,`${service}:operator`];
  const candidates: {userId: string}[] = await db.query(
    `SELECT DISTINCT user_id AS "userId" FROM role_assignments WHERE role=ANY($1::text[]) AND is_active=true
     AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now())`,
    [['platform:super_admin', ...roles]],
  );
  const recipients: {userId: string}[] = [];
  for (const candidate of candidates) if (await hasCentralContactMenu(db, candidate.userId, menu)) recipients.push(candidate);
  return recipients;
}

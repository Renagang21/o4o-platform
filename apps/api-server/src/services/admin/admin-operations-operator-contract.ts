import { CENTRAL_OPERATION_MENUS } from '@o4o/types';
import { OperationError } from '../operations/operation-audit.js';

/** One invitation for the admin site's daily workspace; never a service Admin invitation. */
export const ADMIN_OPERATIONS_INVITATION_SCOPE = 'admin-operations';
export const ADMIN_OPERATIONS_OPERATOR_MENUS = CENTRAL_OPERATION_MENUS.filter(menu => menu.minimumRole === 'operator');
export const isAdminOperationsInvitation = (scope: { scope_type: string; scope_key: string }) =>
  scope.scope_type === 'platform' && scope.scope_key === ADMIN_OPERATIONS_INVITATION_SCOPE;
export function validateAdminOperationsMenus(input: unknown, allowEmpty = false): string[] {
  const allowed = new Set(ADMIN_OPERATIONS_OPERATOR_MENUS.map(menu => menu.key));
  if (!Array.isArray(input) || input.length > 256 || (!allowEmpty && !input.length) || input.some(key => typeof key !== 'string' || !allowed.has(key)))
    throw new OperationError(400, 'INVALID_OPERATIONS_MENUS', '업무 운영자가 처리할 일상업무를 선택해 주세요. 전체 관리자·서비스 Admin 업무는 지정할 수 없습니다.');
  return [...new Set(input)].sort();
}
export function adminOperationsRoles(menuKeys: readonly string[]): string[] {
  // Neture is the existing common-account anchor; its empty menu grant grants no Neture duty.
  const services = new Set(['neture', ...ADMIN_OPERATIONS_OPERATOR_MENUS.filter(menu => menuKeys.includes(menu.key)).map(menu => menu.service)]);
  return [...services].map(service => service === 'pharmcoop' ? 'neture:pharmcoop_operator' : `${service}:operator`);
}
export const ADMIN_OPERATIONS_OPERATOR_ROLES = adminOperationsRoles(ADMIN_OPERATIONS_OPERATOR_MENUS.map(menu => menu.key));

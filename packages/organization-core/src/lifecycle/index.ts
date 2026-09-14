/**
 * organization-core lifecycle
 *
 * WO-O4O-ORGANIZATION-CORE-DEAD-LIFECYCLE-AND-DESTRUCTIVE-UNINSTALL-FINAL-RETIREMENT-V1:
 *   install / uninstall 은 은퇴했다. 스키마 소유자는 api-server deploy migration job
 *   (`apps/api-server/src/database/migrations`) 하나뿐이며, 이 패키지는 테이블을
 *   만들거나 지우지 않는다. 남은 hook 은 어디에서도 호출되지 않는 선언용이다.
 */
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';

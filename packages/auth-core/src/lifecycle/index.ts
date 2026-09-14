/**
 * Auth-Core Lifecycle Hooks
 *
 * WO-O4O-AUTH-CORE-DEAD-LIFECYCLE-AND-RETIRED-USER-ROLES-RESURRECTION-FINAL-CLOSURE-V1:
 *   install / uninstall 은 은퇴했다. users · roles · role_assignments 등 인증 테이블의 스키마 소유자는
 *   api-server deploy migration job 하나뿐이며, 이 패키지는 테이블 · ENUM · seed 를 만들지 않는다.
 *   (은퇴한 user_roles 를 재생성하던 코드 포함.) 남은 hook 은 어디에서도 호출되지 않는 선언용이다.
 */

export { activate } from './activate.js';
export { deactivate } from './deactivate.js';

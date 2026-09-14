/**
 * Platform-Core Lifecycle Hooks
 *
 * WO-O4O-PLATFORM-CORE-DEAD-LIFECYCLE-MANIFEST-AND-APPSTORE-SCHEMA-CONTRACT-FINAL-CLOSURE-V1:
 *   install / uninstall 은 은퇴했다. app_registry · settings · account_activities 의 스키마 소유자는
 *   api-server deploy migration job 하나뿐이며, 이 패키지는 테이블 · ENUM · index · seed 를 만들지 않는다.
 *   "앱 설치(app_registry 상태)" 와 "운영 DB CREATE TABLE" 은 분리된 축이다.
 *   남은 hook 은 어디에서도 호출되지 않는 선언용이다.
 */

export { activate } from './activate.js';
export { deactivate } from './deactivate.js';

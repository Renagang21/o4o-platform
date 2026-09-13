// WO-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1:
//   install / uninstall (CMS 테이블 CREATE/DROP 계약) 은 제거됐다. 호출자가 0 이라 실행된 적이 없고,
//   프로덕션 스키마의 유일한 소유자는 api-server 의 deploy migration job 이다. 대체 installer 없음.
//   activate / deactivate 는 app_registry 상태만 갱신하며 스키마를 건드리지 않는다.
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';

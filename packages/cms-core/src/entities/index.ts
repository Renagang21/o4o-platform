/**
 * cms-core entities
 *
 * WO-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1:
 *   실동작 축은 `cms_contents` · `cms_content_slots` 둘이다. 그 외 12개
 *   (Template 2 · View · CPT 2 · ACF 3 · Setting · Menu 3) 는 소비처 0 · migration 0 이었고
 *   유일한 생성 경로였던 lifecycle install() 은 호출된 적이 없어 테이블도 존재하지 않았다
 *   (IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1). 전부 제거했다.
 *   Media 4종은 앞선 WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1 에서 제거.
 *
 *   스키마 소유자는 api-server 의 deploy migration job 하나다. cms-core 는 테이블을 만들지 않는다.
 */

// Content system (WO-P2-IMPLEMENT-CONTENT) — 정본
export * from './CmsContent.entity.js';
export * from './CmsContentSlot.entity.js';

// Channel system (WO-P4-CHANNEL-IMPLEMENT-P0) — runtime 은퇴 · schema 보존
//   (WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1)
export * from './Channel.entity.js';
export * from './ChannelPlaybackLog.entity.js';
export * from './ChannelHeartbeat.entity.js';

// All entities for TypeORM registration
export const CmsEntities = [
  // Lazy import to avoid circular dependencies
] as const;

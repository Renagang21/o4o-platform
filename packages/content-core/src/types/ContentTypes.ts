/**
 * Content Core - Type Definitions
 *
 * 이 파일은 Content Core의 타입과 Enum을 정의한다.
 * Skeleton 단계: 타입 정의만 존재, 실제 사용되지 않음
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

/**
 * 콘텐츠 유형
 *
 * - video: 동영상 콘텐츠
 * - image: 이미지 콘텐츠
 * - document: 문서 콘텐츠 (PDF 등)
 * - block: 블록 기반 콘텐츠
 */
export enum ContentType {
  VIDEO = 'video',
  IMAGE = 'image',
  DOCUMENT = 'document',
  BLOCK = 'block',
}

/**
 * 콘텐츠 상태
 *
 * - draft: 작성 중
 * - published: 게시됨
 * - archived: 보관됨
 */
// WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: added PENDING for approval workflow
export enum ContentStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * 콘텐츠 공개 범위
 *
 * - public: 전체 공개
 * - restricted: 제한된 접근
 */
export enum ContentVisibility {
  PUBLIC = 'public',
  RESTRICTED = 'restricted',
}

/**
 * 콘텐츠 소유자 유형
 *
 * - platform: 플랫폼 소유 (Core)
 * - service: 서비스 소유 (Extension)
 * - partner: 파트너 소유
 */
export enum ContentOwnerType {
  PLATFORM = 'platform',
  SERVICE = 'service',
  PARTNER = 'partner',
}

/**
 * APP-SIGNAGE Shared Types & Constants
 *
 * 모든 서비스의 사이니지 UI가 공유하는 Single Source of Truth.
 * content.ts, forum.ts와 동일한 패턴 — 순수 타입 + JSON 직렬화 후 형태만 정의.
 *
 * Phase 1: APP-SIGNAGE 공통화
 */

// =============================================================================
// Type Unions (frontend-safe, no TypeORM dependency)
// =============================================================================

/** 사이니지 미디어 타입 — SignageMedia.mediaType 과 1:1 대응 */
export type SignageMediaType = 'image' | 'video' | 'html' | 'text' | 'youtube' | 'vimeo' | 'external';

/** 미디어 소유자 유형 */
export type MediaOwnerType = 'platform' | 'organization' | 'supplier' | 'user';

/** 전환 효과 */
export type TransitionEffect = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom';

/** 콘텐츠 출처 (global content hierarchy) */
export type ContentSource = 'hq' | 'supplier' | 'community' | 'store';

/** 콘텐츠 범위 */
export type ContentScope = 'global' | 'store';

/** 미디어 상태 */
export type SignageMediaStatus = 'active' | 'inactive' | 'processing';

/** 플레이리스트 상태 */
export type SignagePlaylistStatus = 'active' | 'inactive' | 'draft';

// =============================================================================
// API Response DTOs
// =============================================================================

/** 사이니지 미디어 응답 */
export interface SignageMediaResponse {
  id: string;
  serviceKey: string;
  organizationId?: string;
  supplierId?: string;
  name: string;
  mediaType: SignageMediaType;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  ownerType: MediaOwnerType;
  tags: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 플레이리스트 아이템 응답 */
export interface SignagePlaylistItemResponse {
  id: string;
  playlistId: string;
  mediaId: string;
  media?: SignageMediaResponse;
  displayOrder: number;
  displayDuration?: number;
  transitionEffect?: TransitionEffect;
  transitionDuration?: number;
  isForced: boolean;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 플레이리스트 응답 */
export interface SignagePlaylistResponse {
  id: string;
  serviceKey: string;
  organizationId?: string;
  name: string;
  description?: string;
  defaultDuration: number;
  defaultTransition: TransitionEffect;
  totalDuration: number;
  itemCount: number;
  isActive: boolean;
  isLoop: boolean;
  items?: SignagePlaylistItemResponse[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 페이지네이션 응답 (사이니지 API 표준) */
export interface SignagePaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =============================================================================
// Home Page DTOs (홈 요약용 경량 타입)
// =============================================================================

/** 홈 페이지 미디어 요약 */
export interface SignageHomeMedia {
  id: string;
  name: string;
  mediaType: string;
  url: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  metadata: Record<string, unknown>;
}

/** 홈 페이지 플레이리스트 요약 */
export interface SignageHomePlaylist {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  totalDuration: number;
}

/** 홈 사이니지 API 응답 */
export interface SignageHomeResponse {
  success: boolean;
  data: {
    media: SignageHomeMedia[];
    playlists: SignageHomePlaylist[];
  };
}

// =============================================================================
// UI Constants (서비스 비의존 — 모든 프론트엔드에서 동일하게 사용)
// =============================================================================

/** 미디어 타입별 한글 라벨 */
export const SIGNAGE_MEDIA_TYPE_LABELS: Record<SignageMediaType, string> = {
  image: '이미지',
  video: '비디오',
  html: 'HTML',
  text: '텍스트',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  external: '외부 링크',
};

/** 출처별 한글 라벨 */
export const SIGNAGE_SOURCE_LABELS: Record<ContentSource, string> = {
  hq: '본부',
  supplier: '공급자',
  community: '커뮤니티',
  store: '매장',
};

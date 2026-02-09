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

// =============================================================================
// Interaction Utilities (APP-SIGNAGE 인터랙션 기준선 V1)
// =============================================================================

/**
 * YouTube URL에서 Video ID 추출
 * 지원 형식:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * YouTube 썸네일 URL 생성
 * @param url YouTube 영상 URL 또는 Video ID
 * @param quality 썸네일 품질 (default: hqdefault)
 */
export function getYouTubeThumbnail(
  url: string | null | undefined,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'
): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * 미디어 썸네일 URL 결정 (YouTube 자동 생성 포함)
 * - thumbnailUrl이 있으면 우선 사용
 * - YouTube 타입이고 url이 있으면 자동 생성
 * - 그 외에는 null 반환
 */
export function getMediaThumbnailUrl(media: {
  thumbnailUrl?: string | null;
  url?: string | null;
  mediaType: string;
}): string | null {
  // 1. 명시적 썸네일이 있으면 사용
  if (media.thumbnailUrl) return media.thumbnailUrl;

  // 2. YouTube면 자동 생성
  if (media.mediaType === 'youtube' && media.url) {
    return getYouTubeThumbnail(media.url);
  }

  return null;
}

/**
 * 미디어 재생 URL 결정 (새 창 열기용)
 * - YouTube: 원본 URL 또는 embed URL로 변환
 * - 기타: url 그대로 반환
 */
export function getMediaPlayUrl(media: {
  url?: string | null;
  mediaType: string;
}): string | null {
  if (!media.url) return null;

  // YouTube는 원본 URL 그대로 사용 (새 창에서 열림)
  if (media.mediaType === 'youtube') {
    return media.url;
  }

  return media.url;
}

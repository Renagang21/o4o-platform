// Smart Display (Digital Signage) Types — GlycoPharm 콘텐츠 라이브러리 전용
//
// WO-O4O-SIGNAGE-POST-RETIREMENT-DOCS-AND-TYPE-RESIDUE-CLOSURE-V1:
// Phase-6 signage 축(MediaSource / MediaSourceType / PlaylistItem / Playlist /
// PlaylistStatus / DisplaySchedule / DayOfWeek / SharedPlaylist / PlaybackState /
// ParsedVideoUrl / DisplaySettings / MySignageItem / SignageChannel) 은 소비처 0 으로
// 제거했다. 현행 signage 타입 canonical 은 `@o4o/types/signage` 이며,
// GlycoPharm signage 화면(MediaDetailPage / PlaylistDetailPage / HubSignageLibraryPage)
// 은 그쪽을 사용한다.
//
// 아래 3종은 `ContentLibraryPage` (`/store/marketing/signage/library`) 가
// `@/types` barrel 을 통해 실제로 소비하는 ACTIVE 타입이다.

/**
 * 콘텐츠 유형
 */
export type ContentType = 'video' | 'lms' | 'link';

/**
 * 콘텐츠 출처
 */
export type ContentSource = 'neture' | 'hq' | 'supplier' | 'pharmacy' | 'operator_ad';

/**
 * 콘텐츠 아이템 (Signage 콘텐츠 라이브러리 핵심 타입)
 */
export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  url: string;
  source: ContentSource;
  sourceName?: string;        // 출처 상세 (예: 공급자명)
  thumbnailUrl?: string;
  description?: string;
  duration?: number;          // 영상 길이 (초)
  isForced: boolean;          // 운영자 광고 강제 노출 여부
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

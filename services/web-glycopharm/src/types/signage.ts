// Smart Display (Digital Signage) Types

/**
 * 미디어 소스 타입
 */
export type MediaSourceType = 'youtube' | 'vimeo';

/**
 * 미디어 소스 - YouTube/Vimeo URL 정보
 */
export interface MediaSource {
  id: string;
  name: string;
  sourceType: MediaSourceType;
  sourceUrl: string;       // 원본 URL
  embedId: string;         // YouTube: video ID, Vimeo: video ID
  thumbnailUrl?: string;   // 썸네일 URL
  duration?: number;       // 재생 시간 (초)
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 플레이리스트 아이템 - 재생 순서와 시간 설정
 */
export interface PlaylistItem {
  id: string;
  mediaSourceId: string;
  mediaSource: MediaSource;
  order: number;           // 재생 순서
  playDuration?: number;   // 재생 시간 (초), null이면 전체 재생
  transitionType?: 'fade' | 'slide' | 'none';
}

/**
 * 플레이리스트 상태
 */
export type PlaylistStatus = 'draft' | 'active' | 'archived';

/**
 * 플레이리스트
 */
export interface Playlist {
  id: string;
  pharmacyId: string;
  name: string;
  description?: string;
  items: PlaylistItem[];
  status: PlaylistStatus;
  isPublic: boolean;       // 포럼에 공개 여부
  totalDuration: number;   // 전체 재생 시간 (초)
  createdAt: string;
  updatedAt: string;
}

/**
 * 요일 타입 (0: 일요일 ~ 6: 토요일)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * 디스플레이 스케줄 - 시간대별 플레이리스트 배정
 */
export interface DisplaySchedule {
  id: string;
  pharmacyId: string;
  name: string;
  playlistId: string;
  playlist?: Playlist;
  daysOfWeek: DayOfWeek[]; // 적용 요일
  startTime: string;       // HH:mm 형식
  endTime: string;         // HH:mm 형식
  isActive: boolean;
  priority: number;        // 스케줄 충돌 시 우선순위
  createdAt: string;
  updatedAt: string;
}

/**
 * 공유된 플레이리스트 (포럼용)
 */
export interface SharedPlaylist {
  id: string;
  playlistId: string;
  playlist: Playlist;
  pharmacyName: string;
  pharmacyId: string;
  description?: string;
  tags: string[];
  likeCount: number;
  downloadCount: number;   // 가져가기 횟수
  isLikedByMe: boolean;
  createdAt: string;
}

/**
 * 현재 재생 상태
 */
export interface PlaybackState {
  currentPlaylistId: string | null;
  currentItemIndex: number;
  isPlaying: boolean;
  elapsedTime: number;
  lastSyncAt: string;
}

/**
 * YouTube URL 파싱 결과
 */
export interface ParsedVideoUrl {
  isValid: boolean;
  sourceType: MediaSourceType | null;
  embedId: string | null;
  thumbnailUrl: string | null;
  errorMessage?: string;
}

/**
 * 디스플레이 설정
 */
export interface DisplaySettings {
  pharmacyId: string;
  defaultPlaylistId?: string;
  autoPlayEnabled: boolean;
  showClockOverlay: boolean;
  showPharmacyInfo: boolean;
  transitionDuration: number; // ms
  volume: number;             // 0-100
}

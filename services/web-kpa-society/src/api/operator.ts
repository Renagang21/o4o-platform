/**
 * Operator API - KPA Society
 *
 * 운영자 실사용 화면 1단계: 대시보드 요약 API
 */

import { apiClient } from './client';

// Content summary item
interface ContentItem {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
}

// Signage media item
interface MediaItem {
  id: string;
  name: string;
  mediaType: string;
  url: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  metadata: Record<string, unknown>;
}

// Signage playlist item
interface PlaylistItem {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  totalDuration: number;
}

// Forum post item
interface ForumPostItem {
  id: string;
  title: string;
  authorName: string | null;
  createdAt: string;
  categoryName: string | null;
}

export interface OperatorSummary {
  content: {
    totalPublished: number;
    recentItems: ContentItem[];
  };
  signage: {
    totalMedia: number;
    totalPlaylists: number;
    recentMedia: MediaItem[];
    recentPlaylists: PlaylistItem[];
  };
  forum: {
    totalPosts: number;
    recentPosts: ForumPostItem[];
  };
}

interface OperatorSummaryResponse {
  success: boolean;
  data: OperatorSummary;
}

export const operatorApi = {
  getSummary: () =>
    apiClient.get<OperatorSummaryResponse>('/operator/summary'),
};

export type { ContentItem, MediaItem, PlaylistItem, ForumPostItem };

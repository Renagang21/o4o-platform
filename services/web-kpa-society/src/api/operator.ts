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

// Forum analytics types
export interface ForumAnalyticsTopForum {
  id: string;
  name: string;
  iconEmoji: string | null;
  posts30d: number;
  comments30d: number;
  activityScore: number;
}

export interface ForumAnalyticsInactiveForum {
  id: string;
  name: string;
  iconEmoji: string | null;
  lastActivityAt: string | null;
}

export interface ForumAnalytics {
  totalForums: number;
  activeForums7d: number;
  posts7d: number;
  comments7d: number;
  topForums: ForumAnalyticsTopForum[];
  inactiveForums30d: ForumAnalyticsInactiveForum[];
}

interface ForumAnalyticsResponse {
  success: boolean;
  data: ForumAnalytics;
}

export const operatorApi = {
  getSummary: () =>
    apiClient.get<OperatorSummaryResponse>('/operator/summary'),

  getForumAnalytics: () =>
    apiClient.get<ForumAnalyticsResponse>('/operator/forum-analytics'),
};

export type { ContentItem, MediaItem, PlaylistItem, ForumPostItem };

/**
 * Home Page API - KPA Society
 *
 * WO-KPA-HOME-PHASE1-V1: Home page summary endpoints
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1: 통합 허브 확장
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: forumCategories 제거, notices limit 조정
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1: quickLinks 추가 (8th parallel call)
 */

import { apiClient } from './client';
import type { SignageHomeMedia, SignageHomePlaylist } from '@o4o/types/signage';
import type { ForumHomePost } from '@o4o/types/forum';
import type { ForumHubItem, ForumActivityCategory } from '../types';

interface HomeNotice {
  id: string;
  type?: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  isPinned: boolean;
  metadata?: Record<string, any>;
  publishedAt: string | null;
  createdAt: string;
}

// APP-FORUM Phase 1: shared type from @o4o/types/forum
type HomeForumPost = ForumHomePost;

interface HomeFeatured {
  id: string;
  type?: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

// APP-SIGNAGE Phase 1: shared types from @o4o/types/signage
type HomeMedia = SignageHomeMedia;
type HomePlaylist = SignageHomePlaylist;


interface NoticesResponse {
  success: boolean;
  data: HomeNotice[];
}

interface CommunityResponse {
  success: boolean;
  data: {
    posts: HomeForumPost[];
    featured: HomeFeatured[];
  };
}

interface SignageResponse {
  success: boolean;
  data: {
    media: HomeMedia[];
    playlists: HomePlaylist[];
  };
}

interface ForumHubResponse {
  success: boolean;
  data: ForumHubItem[];
}

interface ForumActivityResponse {
  success: boolean;
  data: ForumActivityCategory[];
}

/*
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §8:
 *   `prefetchAll()` / `HomePageData` 제거. 공통 CommunityServiceHome 이 공지·최신활동을
 *   각각의 adapter 로 조회하므로 두 조회를 Promise.allSettled 로 묶어 **실패를 빈 배열로
 *   삼키던** 경로가 사라졌다. 공지 실패는 이제 loadError 상태로 드러난다.
 */

// WO-O4O-KPA-HOME-LATEST-ACTIVITY-SECTION-V1
export interface LatestItem {
  type: 'forum' | 'course' | 'content' | 'resource' | 'signage';
  id: string;
  title: string;
  authorName?: string;
  createdAt: string;
  href: string;
}

export const homeApi = {
  getNotices: (limit = 5) =>
    apiClient.get<NoticesResponse>('/home/notices', { limit }),

  getCommunity: (postLimit = 5, featuredLimit = 3) =>
    apiClient.get<CommunityResponse>('/home/community', { postLimit, featuredLimit }),

  getSignage: (mediaLimit = 6, playlistLimit = 4) =>
    apiClient.get<SignageResponse>('/home/signage', { mediaLimit, playlistLimit }),

  getForumHub: (params?: { sort?: string; q?: string }) =>
    apiClient.get<ForumHubResponse>('/home/forum-hub', params),

  // WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1: 포럼 단건 + 게시글 목록
  getForumDetail: (slug: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<{
      success: boolean;
      data: {
        forum: { id: string; name: string; slug: string; description: string; iconEmoji: string | null; forumType: string | null; tags: string[] | null; organizationId: string | null };
        posts: Array<{ id: string; title: string; slug: string; excerpt: string; tags: string[] | null; createdAt: string; viewCount: number; likeCount: number; commentCount: number; authorId: string | null; authorName: string | null }>;
      };
    }>(`/home/forum/${encodeURIComponent(slug)}/posts`, params),

  getForumActivity: (params?: { sort?: string; limit?: number }) =>
    apiClient.get<ForumActivityResponse>('/home/forum-activity', params),

  // WO-O4O-KPA-HOME-LATEST-ACTIVITY-SECTION-V1
  getLatest: (params?: { type?: string; limit?: number }) =>
    apiClient.get<{ success: boolean; data: LatestItem[] }>('/home/latest', params),

};

export type { HomeNotice, HomeForumPost, HomeFeatured, HomeMedia, HomePlaylist };

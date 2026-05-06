/**
 * Home Page API - KPA Society
 *
 * WO-KPA-HOME-PHASE1-V1: Home page summary endpoints
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1: 통합 허브 확장
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: forumCategories 제거, notices limit 조정
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1: quickLinks 추가 (8th parallel call)
 */

import { apiClient } from './client';
import { communityApi, type CommunityAd } from './community';
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

export interface HomeForumCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  iconEmoji?: string;
}

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

export interface HomePageData {
  notices: HomeNotice[];
  heroAds: CommunityAd[];
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

  /**
   * Home 페이지 필수 데이터를 병렬로 가져오기
   * WO-O4O-KPA-HOME-API-TRIM-V1: 실제 CommunityHomePage 소비 데이터(notices + heroAds)만 유지
   */
  async prefetchAll(): Promise<HomePageData> {
    const [noticesRes, heroRes] = await Promise.allSettled([
      apiClient.get<NoticesResponse>('/home/notices', { limit: 5 }),
      communityApi.getHeroAds(),
    ]);

    return {
      notices: noticesRes.status === 'fulfilled' ? noticesRes.value.data ?? [] : [],
      heroAds: heroRes.status === 'fulfilled'
        ? (heroRes.value as any)?.data?.ads ?? (heroRes.value as any)?.ads ?? []
        : [],
    };
  },
};

export type { HomeNotice, HomeForumPost, HomeFeatured, HomeMedia, HomePlaylist };

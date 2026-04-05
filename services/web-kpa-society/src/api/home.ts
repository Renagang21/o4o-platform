/**
 * Home Page API - KPA Society
 *
 * WO-KPA-HOME-PHASE1-V1: Home page summary endpoints
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1: 통합 허브 확장
 */

import { apiClient } from './client';
import { communityApi, type CommunityAd, type CommunitySponsor } from './community';
import { forumApi } from './forum';
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
  community: { posts: HomeForumPost[]; featured: HomeFeatured[] };
  signage: { media: HomeMedia[]; playlists: HomePlaylist[] };
  forumHub: ForumHubItem[];
  heroAds: CommunityAd[];
  pageAds: CommunityAd[];
  sponsors: CommunitySponsor[];
  forumCategories: HomeForumCategory[];
}

export const homeApi = {
  getNotices: (limit = 5) =>
    apiClient.get<NoticesResponse>('/home/notices', { limit }),

  getCommunity: (postLimit = 5, featuredLimit = 3) =>
    apiClient.get<CommunityResponse>('/home/community', { postLimit, featuredLimit }),

  getSignage: (mediaLimit = 6, playlistLimit = 4) =>
    apiClient.get<SignageResponse>('/home/signage', { mediaLimit, playlistLimit }),

  /**
   * 홈 페이지 전체 데이터를 병렬로 가져오기
   * 개별 useEffect 순차 호출 → Promise.allSettled 병렬 호출로 전환
   */
  getForumHub: (params?: { sort?: string; q?: string }) =>
    apiClient.get<ForumHubResponse>('/home/forum-hub', params),

  getForumActivity: (params?: { sort?: string; limit?: number }) =>
    apiClient.get<ForumActivityResponse>('/home/forum-activity', params),

  /**
   * 통합 Home 전체 데이터를 병렬로 가져오기
   * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1
   * 기존 4개 + community ads/sponsors + forum categories = 8개 병렬 호출
   */
  async prefetchAll(): Promise<HomePageData> {
    const [noticesRes, communityRes, signageRes, forumHubRes, heroRes, pageAdRes, sponsorRes, catRes] =
      await Promise.allSettled([
        apiClient.get<NoticesResponse>('/home/notices', { limit: 3 }),
        apiClient.get<CommunityResponse>('/home/community', { postLimit: 3, featuredLimit: 3 }),
        apiClient.get<SignageResponse>('/home/signage', { mediaLimit: 4, playlistLimit: 2 }),
        apiClient.get<ForumHubResponse>('/home/forum-hub'),
        communityApi.getHeroAds(),
        communityApi.getPageAds(),
        communityApi.getSponsors(),
        forumApi.getCategories(),
      ]);

    return {
      notices: noticesRes.status === 'fulfilled' ? noticesRes.value.data ?? [] : [],
      community: communityRes.status === 'fulfilled'
        ? { posts: communityRes.value.data?.posts ?? [], featured: communityRes.value.data?.featured ?? [] }
        : { posts: [], featured: [] },
      signage: signageRes.status === 'fulfilled'
        ? { media: signageRes.value.data?.media ?? [], playlists: signageRes.value.data?.playlists ?? [] }
        : { media: [], playlists: [] },
      forumHub: forumHubRes.status === 'fulfilled' ? forumHubRes.value.data ?? [] : [],
      heroAds: heroRes.status === 'fulfilled'
        ? (heroRes.value as any)?.data?.ads ?? (heroRes.value as any)?.ads ?? []
        : [],
      pageAds: pageAdRes.status === 'fulfilled'
        ? (pageAdRes.value as any)?.data?.ads ?? (pageAdRes.value as any)?.ads ?? []
        : [],
      sponsors: sponsorRes.status === 'fulfilled'
        ? (sponsorRes.value as any)?.data?.sponsors ?? (sponsorRes.value as any)?.sponsors ?? []
        : [],
      forumCategories: catRes.status === 'fulfilled'
        ? (catRes.value as any)?.data ?? []
        : [],
    };
  },
};

export type { HomeNotice, HomeForumPost, HomeFeatured, HomeMedia, HomePlaylist };

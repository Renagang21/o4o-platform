/**
 * Home Page API - KPA Society
 *
 * WO-KPA-HOME-PHASE1-V1: Home page summary endpoints
 */

import { apiClient } from './client';

interface HomeNotice {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface HomeForumPost {
  id: string;
  title: string;
  authorName: string;
  createdAt: string;
  categoryName: string | null;
}

interface HomeFeatured {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  createdAt: string;
}

interface HomeMedia {
  id: string;
  name: string;
  mediaType: string;
  url: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  metadata: Record<string, unknown>;
}

interface HomePlaylist {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  totalDuration: number;
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

export const homeApi = {
  getNotices: (limit = 5) =>
    apiClient.get<NoticesResponse>('/home/notices', { limit }),

  getCommunity: (postLimit = 5, featuredLimit = 3) =>
    apiClient.get<CommunityResponse>('/home/community', { postLimit, featuredLimit }),

  getSignage: (mediaLimit = 6, playlistLimit = 4) =>
    apiClient.get<SignageResponse>('/home/signage', { mediaLimit, playlistLimit }),
};

export type { HomeNotice, HomeForumPost, HomeFeatured, HomeMedia, HomePlaylist };

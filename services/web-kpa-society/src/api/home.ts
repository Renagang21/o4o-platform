/**
 * Home Page API - KPA Society
 *
 * WO-KPA-HOME-PHASE1-V1: Home page summary endpoints
 */

import { apiClient } from './client';
import type { SignageHomeMedia, SignageHomePlaylist } from '@o4o/types/signage';
import type { ForumHomePost } from '@o4o/types/forum';

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

export const homeApi = {
  getNotices: (limit = 5) =>
    apiClient.get<NoticesResponse>('/home/notices', { limit }),

  getCommunity: (postLimit = 5, featuredLimit = 3) =>
    apiClient.get<CommunityResponse>('/home/community', { postLimit, featuredLimit }),

  getSignage: (mediaLimit = 6, playlistLimit = 4) =>
    apiClient.get<SignageResponse>('/home/signage', { mediaLimit, playlistLimit }),
};

export type { HomeNotice, HomeForumPost, HomeFeatured, HomeMedia, HomePlaylist };

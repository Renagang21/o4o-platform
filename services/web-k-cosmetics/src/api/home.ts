/**
 * K-Cosmetics Home API
 *
 * WO-KCOS-KPA-HOME-PORT-V1: KPA prefetchAll 패턴으로 단순화
 *   notices (CMS) + heroAds (community) 2개 병렬 호출
 *
 * WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1:
 *   /api/v1/cosmetics/home/latest 통합 최신 활동 피드 호출
 *
 * 참조 패턴: web-kpa-society/src/api/home.ts
 */

import { api } from '../lib/apiClient';
import { cmsApi, CmsContent } from './cms';
import { communityApi } from '../services/communityApi';
import type { CommunityAd } from '../services/communityApi';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HomeNotice {
  id: string;
  title: string;
  date: string;
  isPinned: boolean;
  link: string;
}

export interface HomePageData {
  notices: HomeNotice[];
  heroAds: CommunityAd[];
}

export interface LatestItem {
  type: 'forum' | 'course' | 'content' | 'resource' | 'signage';
  id: string;
  title: string;
  authorName?: string;
  createdAt: string;
  href: string;
}

// ── Mappers ────────────────────────────────────────────────────────────────

function toHomeNotice(c: CmsContent): HomeNotice {
  const raw = c.publishedAt || c.createdAt;
  const d = new Date(raw);
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return {
    id: c.id,
    title: c.title,
    date,
    isPinned: c.isPinned,
    link: c.linkUrl || `/notices/${c.id}`,
  };
}

// ── API ───────────────────────────────────────────────────────────────────

export const homeApi = {
  /**
   * 운영 공지 목록 (CMS contents, type=notice, status=published)
   */
  async getNotices(limit = 5): Promise<HomeNotice[]> {
    const res = await cmsApi.getContents({
      type: 'notice',
      status: 'published',
      limit,
    });
    return (res.data || []).map(toHomeNotice);
  },

  /**
   * 최신 활동 목록 — type=all|forum|course|content|resource|signage
   *
   * Backend: GET /api/v1/cosmetics/home/latest?type={type}&limit={limit}
   * Response: { success: true, data: LatestItem[] }
   */
  async getLatest(params?: { type?: string; limit?: number }): Promise<LatestItem[]> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const path = `/cosmetics/home/latest${qs ? `?${qs}` : ''}`;
    const response = await api.get<{ success: boolean; data: LatestItem[] }>(path);
    return response.data?.data || [];
  },

  /**
   * 홈 전체 prefetch (Promise.allSettled — 부분 실패 safe)
   */
  async prefetchAll(): Promise<HomePageData> {
    const [noticesResult, heroResult] = await Promise.allSettled([
      homeApi.getNotices(5),
      communityApi.getHeroAds(),
    ]);
    return {
      notices: noticesResult.status === 'fulfilled' ? noticesResult.value : [],
      heroAds: heroResult.status === 'fulfilled'
        ? heroResult.value?.data?.ads ?? []
        : [],
    };
  },
};

/**
 * K-Cosmetics Home API
 *
 * WO-KCOS-HOME-DYNAMIC-IMPL-V1
 *
 * 홈 화면 동적 데이터 전용 API 레이어.
 * 현재 단계: notices만 CMS 연동. heroSlots, nowRunning, partners는 후속 WO에서 연동 예정.
 *
 * 참조 패턴: web-kpa-society/src/api/home.ts
 */

import { cmsApi, CmsContent } from './cms';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HomeNotice {
  id: string;
  title: string;
  date: string;
  isPinned: boolean;
  link: string;
}

export interface HomePrefetchData {
  notices: HomeNotice[];
}

// ── Mapper ────────────────────────────────────────────────────────────────

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
   * 홈 전체 prefetch (Promise.allSettled — 부분 실패 safe)
   *
   * TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V2):
   *   heroSlots: cmsApi.getSlots('hero')
   *   nowRunning: market-trial API 또는 product API
   *   partners: cms slot 또는 별도 파트너 API
   */
  async prefetchAll(): Promise<HomePrefetchData> {
    const [noticesResult] = await Promise.allSettled([
      homeApi.getNotices(5),
    ]);
    return {
      notices: noticesResult.status === 'fulfilled' ? noticesResult.value : [],
    };
  },
};

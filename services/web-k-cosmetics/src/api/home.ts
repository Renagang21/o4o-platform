/**
 * K-Cosmetics Home API
 *
 * WO-KCOS-HOME-DYNAMIC-IMPL-V1: notices CMS 연동
 * WO-KCOS-HOME-DYNAMIC-IMPL-V2: nowRunningItems + partners 동적화
 * WO-KCOS-HOME-DYNAMIC-IMPL-V3: heroSlides CMS slots('hero') 연동
 *
 * 참조 패턴: web-kpa-society/src/api/home.ts
 *
 * TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V4):
 *   quickActionCards.status.value → storeHub KPI 연동 (requireAuth, 로그인 분기 필요)
 */

import { cmsApi, CmsContent } from './cms';
import { api } from '../lib/apiClient';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HomeNotice {
  id: string;
  title: string;
  date: string;
  isPinned: boolean;
  link: string;
}

export interface HomeRunningTrial {
  id: string;
  title: string;
  supplier?: string;
  deadline?: string;
  participants?: number;
  link: string;
}

export interface HomePartner {
  id: string;
  name: string;
  logoUrl?: string;
  linkUrl?: string;
}

export interface HomeHeroSlide {
  id: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  cta?: { label: string; link: string; variant: 'primary' | 'secondary' };
}

export interface HomePrefetchData {
  notices: HomeNotice[];
  runningTrials: HomeRunningTrial[];
  partners: HomePartner[];
  heroSlides: HomeHeroSlide[];
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

function toDeadlineLabel(isoDate: string | undefined): string | undefined {
  if (!isoDate) return undefined;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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
   * 진행 중인 Market Trial 목록 (cosmetics serviceKey 필터)
   * 인증: optionalAuth (비로그인 가능)
   */
  async getRunningTrials(limit = 3): Promise<HomeRunningTrial[]> {
    const res = await api.get('/market-trial', {
      params: { serviceKey: 'cosmetics', limit },
    });
    const trials: any[] = res.data?.data || [];
    return trials.map((t) => ({
      id: t.id,
      title: t.title,
      supplier: t.supplierName || undefined,
      deadline: toDeadlineLabel(t.deadline || t.endDate),
      participants: typeof t.currentParticipants === 'number' ? t.currentParticipants : undefined,
      // WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1: 외부 진입은 Neture 허브로
      link: `https://neture.co.kr/market-trial/${t.id}`,
    }));
  },

  /**
   * 협력 브랜드/파트너 목록 (community sponsors)
   * 인증: public
   */
  async getPartners(): Promise<HomePartner[]> {
    const res = await api.get('/cosmetics/community/sponsors');
    const sponsors: any[] = res.data?.data?.sponsors || [];
    return sponsors.map((s) => ({
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl || undefined,
      linkUrl: s.linkUrl || undefined,
    }));
  },

  /**
   * Hero 슬라이드 목록 (CMS slots, slotKey='hero', serviceKey='cosmetics')
   * 인증: optionalAuth (비로그인 가능)
   * CMS 데이터 없으면 빈 배열 반환 → caller에서 정적 fallback 사용
   */
  async getHeroSlides(): Promise<HomeHeroSlide[]> {
    const res = await cmsApi.getSlots('hero', { serviceKey: 'cosmetics', activeOnly: true });
    const slots = res.data || [];
    return slots
      .filter((slot) => slot.content !== null)
      .map((slot) => {
        const content = slot.content!;
        return {
          id: slot.id,
          title: content.title,
          subtitle: content.summary ?? '',
          bgGradient: (content.metadata?.bgGradient as string) ?? '#1e293b',
          cta: content.linkUrl
            ? {
                label: content.linkText ?? '자세히 보기',
                link: content.linkUrl,
                variant: 'primary' as const,
              }
            : undefined,
        };
      });
  },

  /**
   * 홈 전체 prefetch (Promise.allSettled — 부분 실패 safe)
   */
  async prefetchAll(): Promise<HomePrefetchData> {
    const [noticesResult, trialsResult, partnersResult, heroSlidesResult] = await Promise.allSettled([
      homeApi.getNotices(5),
      homeApi.getRunningTrials(3),
      homeApi.getPartners(),
      homeApi.getHeroSlides(),
    ]);
    return {
      notices: noticesResult.status === 'fulfilled' ? noticesResult.value : [],
      runningTrials: trialsResult.status === 'fulfilled' ? trialsResult.value : [],
      partners: partnersResult.status === 'fulfilled' ? partnersResult.value : [],
      heroSlides: heroSlidesResult.status === 'fulfilled' ? heroSlidesResult.value : [],
    };
  },
};

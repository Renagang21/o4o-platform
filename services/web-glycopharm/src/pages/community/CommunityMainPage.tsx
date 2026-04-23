/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1
 * WO-GLYCOPHARM-COMMUNITY-FEED-DATA-INTEGRATION-V1
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1: 콘텐츠 카드 그리드 + 추천/최근 섹션
 * WO-GLYCOPHARM-HOME-REBASE-TO-KPA-FRAME-V1: Shared Space Frame 기준 재구성
 * WO-SHARED-SPACE-COMPONENT-SPLIT-V1: 공통 컴포넌트 적용
 * WO-SHARED-SPACE-SIGNAGE-COMPONENT-V1: SignagePreviewSection 공통 적용
 *
 * Route: / (Home)
 *
 * 섹션 순서 (Shared Space Frame):
 *  1. Hero / Summary → HeroSummarySection (shared)
 *  2. News / Notices → NewsNoticesSection (shared)
 *  3. Activity → ActivitySection (shared)
 *  4. App Entry → AppEntrySection (shared)
 *  5. Content Highlight → ContentHighlightSection (shared)
 *  6. Signage Preview → SignagePreviewSection (shared)
 *  7. CTA / Guidance → CtaGuidanceSection (shared)
 *  8. Utility (서비스 고유 — Tailwind)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  MessageSquare,
  BookOpen,
  Newspaper,
  GraduationCap,
} from 'lucide-react';
import { HUB_PRODUCER_LABELS, type HubProducer } from '@o4o/types/hub-content';
import { apiClient } from '@/services/api';
import { communityApi, type CommunityAd, type CommunitySponsor } from '@/services/communityApi';
import { useAuth } from '@/contexts/AuthContext';
import {
  HeroSummarySection,
  NewsNoticesSection,
  ActivitySection as SharedActivitySection,
  AppEntrySection,
  CtaGuidanceSection,
  SignagePreviewSection,
  ContentHighlightSection,
} from '@o4o/shared-space-ui';
import type { NoticeItem, FeaturedPost, RecentPost, SignageMediaItem, SignagePlaylistItem, ContentHighlightItem } from '@o4o/shared-space-ui';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';

// ─── Types ──────────────────────────────────────────────────

interface ForumPostRaw {
  id: string;
  title: string;
  author?: { name?: string; email?: string } | null;
  category?: { name?: string } | null;
  viewCount: number;
  commentCount: number;
  createdAt: string;
}

interface FeedItem {
  id: string;
  title: string;
  author: string;
  category: string;
  viewCount: number;
  commentCount: number;
  date: string;
}

interface HubContentItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  cmsType?: string | null;
  isPinned?: boolean;
  producer?: string;
  createdAt: string;
}

const partnerLogos = [
  { id: '1', name: 'Partner A' },
  { id: '2', name: 'Partner B' },
  { id: '3', name: 'Partner C' },
  { id: '4', name: 'Partner D' },
  { id: '5', name: 'Partner E' },
  { id: '6', name: 'Partner F' },
  { id: '7', name: 'Partner G' },
  { id: '8', name: 'Partner H' },
];

/** HubContentItem → ContentHighlightItem adapter (shared-space-ui 기준) */
function toHighlightItem(c: HubContentItem): ContentHighlightItem {
  return {
    id: c.id,
    title: c.title,
    thumbnailUrl: c.thumbnailUrl || c.imageUrl || null,
    badge: c.isPinned ? '추천' : (c.cmsType || undefined),
    summary: c.description || undefined,
    meta: c.producer ? (HUB_PRODUCER_LABELS[c.producer as HubProducer] ?? c.producer) : undefined,
    href: c.linkUrl || undefined,
  };
}

// ─── Main Component ─────────────────────────────────────────

export default function CommunityMainPage() {
  const { isAuthenticated, user } = useAuth();

  // News tab
  const [newsTab, setNewsTab] = useState<'notices' | 'yakup'>('notices');

  // Feed data (from forum posts API)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Sponsors & Ads (from communityApi)
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [ads, setAds] = useState<CommunityAd[]>([]);

  // Content (from hub content API)
  const [contentItems, setContentItems] = useState<HubContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Signage (from hub content API — signage domain)
  const [signageMedia, setSignageMedia] = useState<SignageMediaItem[]>([]);
  const [signagePlaylists, setSignagePlaylists] = useState<SignagePlaylistItem[]>([]);
  const [signageLoading, setSignageLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await apiClient.get<ForumPostRaw[]>('/api/v1/glycopharm/forum/posts?limit=30');
      if (Array.isArray(res.data)) {
        const items: FeedItem[] = res.data.map((raw) => ({
          id: raw.id,
          title: raw.title || '(제목 없음)',
          author: raw.author?.name || raw.author?.email?.split('@')[0] || '익명',
          category: raw.category?.name || '일반',
          viewCount: raw.viewCount || 0,
          commentCount: raw.commentCount || 0,
          date: raw.createdAt,
        }));
        setFeedItems(items);
      }
    } catch {
      setFeedItems([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    communityApi.getSponsors().then((r) => setSponsors(r.data?.sponsors ?? [])).catch(() => {});
    communityApi.getPageAds().then((r) => setAds(r.data?.ads ?? [])).catch(() => {});
    // Hub content (CMS)
    apiClient.get<{ data: HubContentItem[] }>('/api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=cms&limit=50')
      .then((res) => {
        const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setContentItems(items);
      })
      .catch(() => setContentItems([]))
      .finally(() => setContentLoading(false));
    // Hub signage (media + playlists)
    Promise.all([
      apiClient.get<{ data: any[] }>('/api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=signage-media&limit=4')
        .then((res) => {
          const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          setSignageMedia(items.map((m: any) => ({
            id: m.id,
            title: m.title,
            thumbnailUrl: m.thumbnailUrl,
            href: `/signage?mediaId=${m.id}`,
            actionLabel: '매장에 적용',
          })));
        })
        .catch(() => setSignageMedia([])),
      apiClient.get<{ data: any[] }>('/api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=signage-playlist&limit=4')
        .then((res) => {
          const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          setSignagePlaylists(items.map((p: any) => ({
            id: p.id,
            name: p.name ?? p.title,
            itemCount: p.itemCount,
          })));
        })
        .catch(() => setSignagePlaylists([])),
    ]).finally(() => setSignageLoading(false));
  }, [loadFeed]);

  // ── Derived data ──
  const noticeItems: NoticeItem[] = feedItems
    .filter((i) => i.category === '공지')
    .slice(0, 5)
    .map((i) => ({ id: i.id, title: i.title, date: i.date, href: `/forum/posts/${i.id}`, isPinned: true }));

  const featuredPosts: FeaturedPost[] = [...feedItems]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 3)
    .map((i) => ({ id: i.id, title: i.title, author: i.author, viewCount: i.viewCount, category: i.category, href: `/forum/posts/${i.id}` }));

  const recentPostItems: RecentPost[] = [...feedItems]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((i) => ({ id: i.id, title: i.title, date: i.date, href: `/forum/posts/${i.id}`, category: i.category }));

  // Content split
  const recommendedContent = contentItems.filter((c) => c.isPinned).slice(0, 6);
  const recommendedIds = new Set(recommendedContent.map((c) => c.id));
  const recentContent = contentItems.filter((c) => !recommendedIds.has(c.id)).slice(0, 6);

  // Greeting
  const greeting = isAuthenticated && user?.name
    ? `${user.name}님, 환영합니다`
    : '약국 경영 지원 서비스에 오신 것을 환영합니다';

  return (
    <div className="min-h-screen bg-slate-50">
      <PageContainer>

        {/* ─── 1. Hero / Summary (shared) ─── */}
        <PageHero>
          <HeroSummarySection
            greeting={greeting}
            subtitle="매장 운영에 필요한 정보와 콘텐츠를 한 곳에서 확인하세요"
            ctas={[
              { label: '포럼 참여', href: '/forum', icon: <MessageSquare size={16} /> },
              { label: '강의 수강', href: '/lms', icon: <GraduationCap size={16} /> },
              { label: '사이니지 관리', href: '/signage', icon: <Play size={16} /> },
            ]}
          />
        </PageHero>

        {/* ─── 2. News / Notices (shared) ─── */}
        <PageSection>
          <NewsNoticesSection
            tabs={[
              { key: 'notices', label: '공지사항' },
              { key: 'yakup', label: '약업신문' },
            ]}
            activeTab={newsTab}
            onTabChange={(key) => setNewsTab(key as 'notices' | 'yakup')}
            items={noticeItems}
            loading={feedLoading}
            emptyTitle="아직 등록된 공지가 없습니다."
            emptySubtitle="새 소식이 등록되면 여기에 표시됩니다."
            viewAllHref="/forum/posts?category=공지"
            externalCta={newsTab === 'yakup' ? {
              icon: <Newspaper size={32} />,
              message: '약업신문에서 업계 소식을 확인하세요',
              href: 'https://www.yakup.com',
              linkLabel: '약업신문 바로가기 →',
            } : undefined}
          />
        </PageSection>

        {/* ─── 3. Activity (shared) ─── */}
        <PageSection>
          <SharedActivitySection
            featuredPosts={featuredPosts}
            recentPosts={recentPostItems}
            loading={feedLoading}
            emptyMessage="아직 게시물이 없습니다."
            emptyActionLabel="첫 글 작성하기"
            emptyActionHref="/forum/write"
            viewAllHref="/forum/posts"
          />
        </PageSection>

        {/* ─── 4. App Entry (shared) ─── */}
        <PageSection>
          <AppEntrySection
            title="서비스 바로가기"
            subtitle="각 서비스로 바로 이동하세요"
            cards={[
              { title: '약사 포럼', description: '동료 약사와 질문·토론으로 전문성을 높이세요', href: '/forum', icon: <MessageSquare size={20} /> },
              { title: '교육 / 강의', description: '전문 강좌를 온라인으로 수강하세요', href: '/lms', icon: <BookOpen size={20} /> },
              { title: '디지털 사이니지', description: '약국 디지털 미디어를 관리하세요', href: '/signage', icon: <Play size={20} /> },
            ]}
          />
        </PageSection>

        {/* ─── 5. Content Highlight (shared) ─── */}
        <PageSection>
          <ContentHighlightSection
            title="콘텐츠"
            primaryGroupTitle="최근 콘텐츠"
            secondaryGroupTitle={recommendedContent.length > 0 ? '추천 콘텐츠' : undefined}
            primaryItems={recentContent.map(toHighlightItem)}
            secondaryItems={recommendedContent.map(toHighlightItem)}
            viewAllHref="/lms"
            viewAllLabel="전체보기 →"
            loading={contentLoading}
            emptyMessage="등록된 콘텐츠가 없습니다."
          />
        </PageSection>

        {/* ─── 6. Signage Preview (shared) ─── */}
        <PageSection>
          <SignagePreviewSection
            mediaItems={signageMedia}
            playlistItems={signagePlaylists}
            loading={signageLoading}
            viewAllHref="/signage"
            viewAllLabel="사이니지 관리 →"
          />
        </PageSection>

        {/* ─── 7. CTA / Guidance (shared) ─── */}
        <PageSection>
          <CtaGuidanceSection
            title="매장 운영에 도움이 필요하세요?"
            description="디지털 사이니지로 약국을 꾸며보세요"
            href="/signage"
            linkLabel="사이니지 보기 →"
            icon={<Play size={20} />}
          />
        </PageSection>

        {/* ─── 8. Utility (서비스 고유) ─── */}

        {/* 광고 */}
        {ads.length > 0 && (
          <PageSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ads.map((ad) => (
                <a
                  key={ad.id}
                  href={ad.linkUrl ?? undefined}
                  className="block p-5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-800 mb-1">{ad.title}</p>
                </a>
              ))}
            </div>
          </PageSection>
        )}

        {/* 스폰서 */}
        {sponsors.length > 0 && (
          <PageSection>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">스폰서</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sponsors.map((sp) => (
                <a
                  key={sp.id}
                  href={sp.linkUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  {sp.logoUrl ? (
                    <img src={sp.logoUrl} alt={sp.name} className="h-6 object-contain" />
                  ) : (
                    <span className="text-xs font-medium text-slate-500">{sp.name}</span>
                  )}
                </a>
              ))}
            </div>
          </PageSection>
        )}

        {/* 파트너 로고 슬라이드 */}
        <PageSection last>
          <div className="overflow-hidden">
            <div className="relative group">
              <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
                {[...partnerLogos, ...partnerLogos].map((logo, idx) => (
                  <div
                    key={`${logo.id}-${idx}`}
                    className="flex items-center justify-center w-28 h-12 mx-3 bg-white border border-slate-200 rounded-lg shrink-0"
                  >
                    <span className="text-xs text-slate-400 font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageSection>

      </PageContainer>
    </div>
  );
}

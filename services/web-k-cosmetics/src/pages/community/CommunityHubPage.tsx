/**
 * CommunityHubPage — K-Cosmetics Community Hub Main Page
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-KCOS-HOME-REBASE-TO-KPA-FRAME-V1: Shared Space Frame 기준 재구성
 * WO-SHARED-SPACE-COMPONENT-SPLIT-V1: 공통 컴포넌트 적용
 * WO-SHARED-SPACE-SIGNAGE-COMPONENT-V1: SignagePreviewSection 공통 적용
 *
 * Route: /community
 *
 * 섹션 순서 (Shared Space Frame):
 *  1. Hero / Summary → HeroSummarySection (shared)
 *  2. News / Notices → NewsNoticesSection (shared)
 *  3. Activity → ActivitySection (shared)
 *  4. App Entry → AppEntrySection (shared)
 *  5. Content Highlight → ContentHighlightSection (shared)
 *  6. Signage Preview → SignagePreviewSection (shared)
 *  7. CTA / Guidance → CtaGuidanceSection (shared)
 *  8. Utility (서비스 고유)
 */

import { useState, useEffect, type CSSProperties } from 'react';
import { communityApi, type CommunityAd, type CommunitySponsor } from '../../services/communityApi';
import { hubContentApi, type HubContentItemResponse } from '../../lib/api/hubContent';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts';
import { AdSection } from '../../components/community/AdSection';
import { SponsorBar } from '../../components/community/SponsorBar';
import {
  HeroSummarySection,
  NewsNoticesSection,
  ActivitySection,
  AppEntrySection,
  CtaGuidanceSection,
  SignagePreviewSection,
  ContentHighlightSection,
} from '@o4o/shared-space-ui';
import type { NoticeItem, FeaturedPost, RecentPost, SignageMediaItem, SignagePlaylistItem, ContentHighlightItem } from '@o4o/shared-space-ui';

// ─── Constants ─────────────────────────────────────────────
const PINK = '#DB2777';
const PINK_BG = '#fdf2f8';

// ─── Types ─────────────────────────────────────────────────

interface FeedItem {
  id: string;
  title: string;
  author: string;
  category: string;
  viewCount: number;
  commentCount: number;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────

function toContentHighlightItem(item: HubContentItemResponse): ContentHighlightItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.description ?? undefined,
    thumbnailUrl: item.thumbnailUrl || item.imageUrl || null,
    badge: item.cmsType ?? undefined,
    meta: new Date(item.createdAt).toLocaleDateString('ko-KR'),
    href: item.linkUrl ?? undefined,
  };
}

// ─── Main Component ────────────────────────────────────────

export default function CommunityHubPage() {
  const { isAuthenticated, user } = useAuth();

  // Feed data (forum posts)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Sponsors & Ads
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [pageAds, setPageAds] = useState<CommunityAd[]>([]);

  // Content (CMS hub content)
  const [contentItems, setContentItems] = useState<HubContentItemResponse[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Signage
  const [signageMedia, setSignageMedia] = useState<SignageMediaItem[]>([]);
  const [signagePlaylists, setSignagePlaylists] = useState<SignagePlaylistItem[]>([]);
  const [signageLoading, setSignageLoading] = useState(true);

  useEffect(() => {
    // Forum posts
    api.get('/forum/posts?limit=30')
      .then((res: any) => {
        const posts = res.data?.data?.posts ?? res.data?.posts ?? res.data ?? [];
        if (Array.isArray(posts)) {
          setFeedItems(posts.map((raw: any) => ({
            id: raw.id,
            title: raw.title || '(제목 없음)',
            author: raw.author?.name || raw.author?.email?.split('@')[0] || '익명',
            category: raw.category?.name || '일반',
            viewCount: raw.viewCount || 0,
            commentCount: raw.commentCount || 0,
            date: raw.createdAt,
          })));
        }
      })
      .catch(() => setFeedItems([]))
      .finally(() => setFeedLoading(false));

    // Sponsors & Ads
    communityApi.getSponsors().then((r: any) => setSponsors(r.data?.sponsors ?? r?.sponsors ?? [])).catch(() => {});
    communityApi.getPageAds().then((r: any) => setPageAds(r.data?.ads ?? r?.ads ?? [])).catch(() => {});

    // Hub content (CMS)
    hubContentApi.list({ sourceDomain: 'cms', limit: 50 })
      .then((res: any) => {
        const items = Array.isArray(res?.data) ? res.data : [];
        setContentItems(items);
      })
      .catch(() => setContentItems([]))
      .finally(() => setContentLoading(false));

    // Signage (media + playlists via hub content)
    Promise.all([
      hubContentApi.list({ sourceDomain: 'signage-media', limit: 4 })
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : [];
          setSignageMedia(items.map((m: any) => ({
            id: m.id,
            title: m.title,
            thumbnailUrl: m.thumbnailUrl,
            href: `/store/signage?mediaId=${m.id}`,
            actionLabel: '매장에 적용',
          })));
        })
        .catch(() => setSignageMedia([])),
      hubContentApi.list({ sourceDomain: 'signage-playlist', limit: 4 })
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : [];
          setSignagePlaylists(items.map((p: any) => ({
            id: p.id,
            name: p.title,
          })));
        })
        .catch(() => setSignagePlaylists([])),
    ]).finally(() => setSignageLoading(false));
  }, []);

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
    : '뷰티 매장 활용 서비스에 오신 것을 환영합니다';

  return (
    <div style={styles.page}>
      <div style={styles.content}>

        {/* ─── 1. Hero / Summary (shared) ─── */}
        <HeroSummarySection
          greeting={greeting}
          subtitle="매장 홍보와 마케팅에 필요한 콘텐츠를 한 곳에서 확인하세요"
          ctas={[
            { label: '포럼 참여', href: '/forum', icon: <span>💬</span> },
            { label: '콘텐츠 보기', href: '/library/content', icon: <span>📄</span> },
            { label: '사이니지 관리', href: '/partner/signage/content', icon: <span>🖥</span> },
          ]}
          accentColor={PINK}
        />

        {/* ─── 2. News / Notices (shared) ─── */}
        <NewsNoticesSection
          title="공지 / 새 소식"
          items={noticeItems}
          loading={feedLoading}
          emptyTitle="아직 등록된 공지가 없습니다."
          emptySubtitle="새 소식이 등록되면 여기에 표시됩니다."
          viewAllHref="/forum"
          accentColor={PINK}
          accentBg={PINK_BG}
        />

        {/* ─── 3. Activity (shared) ─── */}
        <ActivitySection
          featuredPosts={featuredPosts}
          recentPosts={recentPostItems}
          loading={feedLoading}
          emptyMessage="아직 게시물이 없습니다."
          emptyActionLabel="첫 글 작성하기"
          emptyActionHref="/forum/write"
          viewAllHref="/forum"
          accentColor={PINK}
        />

        {/* ─── 4. App Entry (shared) ─── */}
        <AppEntrySection
          title="서비스 바로가기"
          subtitle="각 서비스로 바로 이동하세요"
          cards={[
            { title: '뷰티 포럼', description: '뷰티 트렌드와 스킨케어 정보를 나누세요', href: '/forum', icon: <span>💬</span> },
            { title: '콘텐츠 허브', description: '매장 운영에 유용한 콘텐츠를 확인하세요', href: '/library/content', icon: <span>📄</span> },
            { title: '디지털 사이니지', description: '매장 디스플레이 콘텐츠를 관리하세요', href: '/partner/signage/content', icon: <span>🖥</span> },
          ]}
          accentColor={PINK}
        />

        {/* ─── 5. Content Highlight (shared) ─── */}
        <ContentHighlightSection
          title="콘텐츠"
          primaryGroupTitle="최근 콘텐츠"
          secondaryGroupTitle="추천 콘텐츠"
          primaryItems={recentContent.map(toContentHighlightItem)}
          secondaryItems={recommendedContent.map(toContentHighlightItem)}
          viewAllHref="/library/content"
          viewAllLabel="전체보기 →"
          emptyMessage="등록된 콘텐츠가 없습니다."
          loading={contentLoading}
          accentColor={PINK}
        />

        {/* ─── 6. Signage Preview (shared) ─── */}
        <SignagePreviewSection
          mediaItems={signageMedia}
          playlistItems={signagePlaylists}
          loading={signageLoading}
          viewAllHref="/partner/signage/content"
          viewAllLabel="전체보기 →"
          accentColor={PINK}
        />

        {/* ─── 7. CTA / Guidance (shared) ─── */}
        <CtaGuidanceSection
          title="매장 홍보에 도움이 필요하세요?"
          description="디지털 사이니지로 매장을 꾸며보세요"
          href="/partner/signage/content"
          linkLabel="사이니지 보기 →"
          icon={<span>🖥</span>}
          accentColor={PINK}
          accentBg={PINK_BG}
        />

        {/* ─── 8. Utility (서비스 고유) ─── */}
        <AdSection ads={pageAds} />
        <SponsorBar sponsors={sponsors} />

      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '60vh',
    backgroundColor: '#f8fafc',
  },
  content: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
};

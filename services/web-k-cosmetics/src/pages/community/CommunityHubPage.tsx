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
 *  5. Content Highlight (서비스 고유)
 *  6. Signage Preview → SignagePreviewSection (shared)
 *  7. CTA / Guidance → CtaGuidanceSection (shared)
 *  8. Utility (서비스 고유)
 */

import { useState, useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
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
} from '@o4o/shared-space-ui';
import type { NoticeItem, FeaturedPost, RecentPost, SignageMediaItem, SignagePlaylistItem } from '@o4o/shared-space-ui';

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

// ─── Content Card ──────────────────────────────────────────

function ContentCard({ item }: { item: HubContentItemResponse }) {
  const img = item.thumbnailUrl || item.imageUrl || null;
  const hasLink = !!item.linkUrl;

  return (
    <div
      onClick={() => { if (hasLink) window.open(item.linkUrl!, '_blank', 'noopener'); }}
      style={{
        ...styles.contentCard,
        cursor: hasLink ? 'pointer' : 'default',
        opacity: hasLink ? 1 : 0.8,
      }}
    >
      {img ? (
        <div style={styles.contentThumb}>
          <img
            src={img}
            alt={item.title}
            style={styles.thumbImg}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div style={{ ...styles.contentThumb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, color: '#cbd5e1' }}>📄</span>
        </div>
      )}
      <div style={styles.contentBody}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          {item.cmsType && (
            <span style={styles.contentBadge}>{item.cmsType}</span>
          )}
          {item.isPinned && (
            <span style={styles.contentPinnedBadge}>추천</span>
          )}
        </div>
        <p style={styles.contentTitle}>{item.title}</p>
        {item.description && (
          <p style={styles.contentDesc}>{item.description}</p>
        )}
        <p style={styles.contentDate}>
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </div>
  );
}

// ─── Section Wrapper ───────────────────────────────────────

function Section({ title, linkTo, linkLabel, children }: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {linkTo && linkLabel && (
          <Link to={linkTo} style={styles.sectionLink}>{linkLabel}</Link>
        )}
      </div>
      {children}
    </section>
  );
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

        {/* ─── 5. Content Highlight (서비스 고유) ─── */}
        <Section title="콘텐츠" linkTo="/library/content" linkLabel="전체보기 →">
          {contentLoading ? (
            <p style={styles.empty}>불러오는 중...</p>
          ) : contentItems.length === 0 ? (
            <p style={styles.empty}>등록된 콘텐츠가 없습니다.</p>
          ) : (
            <>
              {recentContent.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={styles.subLabel}>최근 콘텐츠</p>
                  <div style={styles.contentGrid}>
                    {recentContent.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
              {recommendedContent.length > 0 && (
                <div>
                  <p style={styles.subLabel}>추천 콘텐츠</p>
                  <div style={styles.contentGrid}>
                    {recommendedContent.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Section>

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

// ─── Styles (서비스 고유 섹션만) ──────────────────────────────

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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  sectionLink: {
    fontSize: 13,
    color: PINK,
    textDecoration: 'none',
    fontWeight: 500,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px 0',
  },

  // Content grid & cards
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  contentThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  contentBody: {
    padding: '8px 12px 10px',
  },
  contentBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
  },
  contentPinnedBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: PINK_BG,
    color: PINK,
    borderRadius: 4,
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  contentDesc: {
    fontSize: 11,
    color: '#94a3b8',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  contentDate: {
    fontSize: 10,
    color: '#cbd5e1',
    margin: 0,
  },

  // Utility
  empty: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center' as const,
    padding: '24px 0',
  },
};

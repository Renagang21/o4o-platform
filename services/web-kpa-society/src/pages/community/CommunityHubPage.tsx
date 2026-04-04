/**
 * CommunityHubPage — KPA Community Hub Main Page
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1: 콘텐츠 섹션 추가
 *
 * Route: /community
 * Forum Core 수정 없음. 기존 Forum API / Home API 재활용.
 *
 * 8개 섹션:
 *  1. HeroBannerSection  — community_ads type=hero
 *  2. ForumSection       — 포럼 카테고리 카드 → /forum
 *  3. LatestPostsSection — 최근 글 5개
 *  4. AdSection          — community_ads type=page
 *  5. VideoSection       — signage media → /signage
 *  5.5 ContentSection    — CMS hub content (최근 + 추천)
 *  6. ResourceSection    — 자료실 → /docs
 *  7. SponsorBar         — community_sponsors
 */

import { useState, useEffect, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { communityApi, type CommunityAd, type CommunitySponsor } from '../../api/community';
import { forumApi } from '../../api/forum';
import { homeApi } from '../../api/home';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { HeroBannerSection } from '../../components/community/HeroBannerSection';
import { AdSection } from '../../components/community/AdSection';
import { SponsorBar } from '../../components/community/SponsorBar';
import { colors, spacing, typography } from '../../styles/theme';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  iconEmoji?: string;
}

interface ForumPost {
  id: string;
  title: string;
  authorName?: string;
  categoryName?: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  createdAt: string;
}

interface HomeMedia {
  id: string;
  name: string;
  duration: number;
  thumbnailUrl?: string;
}

export default function CommunityHubPage() {
  const [heroAds, setHeroAds] = useState<CommunityAd[]>([]);
  const [pageAds, setPageAds] = useState<CommunityAd[]>([]);
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [media, setMedia] = useState<HomeMedia[]>([]);
  const [contentItems, setContentItems] = useState<HubContentItemResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      communityApi.getHeroAds(),
      communityApi.getPageAds(),
      communityApi.getSponsors(),
      forumApi.getCategories(),
      forumApi.getPosts({ limit: 5 }),
      homeApi.getSignage(4, 0),
      hubContentApi.list({ serviceKey: 'kpa', sourceDomain: 'cms', limit: 50 }).catch(() => ({ data: [] })),
    ]).then(([heroRes, pageRes, sponsorRes, catRes, postsRes, signageRes, contentRes]) => {
      if (heroRes.status === 'fulfilled') setHeroAds((heroRes.value as any)?.data?.ads ?? (heroRes.value as any)?.ads ?? []);
      if (pageRes.status === 'fulfilled') setPageAds((pageRes.value as any)?.data?.ads ?? (pageRes.value as any)?.ads ?? []);
      if (sponsorRes.status === 'fulfilled') setSponsors((sponsorRes.value as any)?.data?.sponsors ?? (sponsorRes.value as any)?.sponsors ?? []);
      if (catRes.status === 'fulfilled') setCategories((catRes.value as any)?.data ?? (catRes.value as any) ?? []);
      if (postsRes.status === 'fulfilled') {
        const postData = (postsRes.value as any)?.data ?? (postsRes.value as any) ?? [];
        setPosts(Array.isArray(postData) ? postData : postData.data ?? []);
      }
      if (signageRes.status === 'fulfilled') {
        const sig = (signageRes.value as any)?.data ?? (signageRes.value as any) ?? {};
        setMedia(sig.media ?? []);
      }
      if (contentRes.status === 'fulfilled') {
        const v = contentRes.value as any;
        const items = Array.isArray(v?.data) ? v.data : [];
        setContentItems(items);
      }
      setLoading(false);
    });
  }, []);

  // Split content into recommended (isPinned) and recent
  const recommendedContent = contentItems.filter((c) => c.isPinned).slice(0, 6);
  const recommendedIds = new Set(recommendedContent.map((c) => c.id));
  const recentContent = contentItems.filter((c) => !recommendedIds.has(c.id)).slice(0, 6);

  if (loading) {
    return (
      <div style={styles.loading}>
        <p style={{ color: colors.neutral500 }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        {/* 1. Hero Banner */}
        <HeroBannerSection ads={heroAds} />

        {/* 2. Forum Section */}
        <Section title="포럼" linkTo="/forum" linkLabel="포럼 바로가기 →">
          {categories.length > 0 ? (
            <div style={styles.categoryGrid}>
              {categories.slice(0, 6).map((cat) => (
                <Link key={cat.id} to={`/forum/all?category=${cat.id}`} style={styles.categoryCard}>
                  <span style={styles.categoryEmoji}>{cat.iconEmoji || '💬'}</span>
                  <span style={styles.categoryName}>{cat.name}</span>
                  <span style={styles.categoryCount}>{cat.postCount}개 글</span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>포럼 카테고리가 없습니다.</p>
          )}
        </Section>

        {/* 3. Latest Posts */}
        <Section title="최근 글" linkTo="/forum/all" linkLabel="전체 보기 →">
          {posts.length > 0 ? (
            <div style={styles.postList}>
              {posts.map((post) => (
                <Link key={post.id} to={`/forum/post/${post.id}`} style={styles.postItem}>
                  <div style={styles.postMain}>
                    {post.categoryName && <span style={styles.postCategory}>{post.categoryName}</span>}
                    <span style={styles.postTitle}>{post.title}</span>
                  </div>
                  <div style={styles.postMeta}>
                    <span>{post.authorName || '익명'}</span>
                    <span>♥ {post.likeCount}</span>
                    <span>👁 {post.viewCount}</span>
                    <span>💬 {post.commentCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>게시글이 없습니다.</p>
          )}
        </Section>

        {/* 4. Page Ads */}
        <AdSection ads={pageAds} />

        {/* 5. Video Section */}
        <Section title="영상" linkTo="/signage" linkLabel="사이니지 보기 →">
          {media.length > 0 ? (
            <div style={styles.mediaGrid}>
              {media.slice(0, 4).map((item) => (
                <Link key={item.id} to={`/signage/media/${item.id}`} style={styles.mediaCard}>
                  <div style={styles.mediaThumb}>
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.name} style={styles.mediaImg} />
                    ) : (
                      <div style={styles.mediaPlaceholder}>▶</div>
                    )}
                  </div>
                  <p style={styles.mediaName}>{item.name}</p>
                  {item.duration > 0 && (
                    <p style={styles.mediaDuration}>{Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>등록된 영상이 없습니다.</p>
          )}
        </Section>

        {/* 5.5 Content Section (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1) */}
        <Section title="콘텐츠" linkTo="/content" linkLabel="전체보기 →">
          {contentItems.length === 0 ? (
            <p style={styles.empty}>등록된 콘텐츠가 없습니다.</p>
          ) : (
            <>
              {recentContent.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={styles.contentSubTitle}>최근 콘텐츠</p>
                  <div style={styles.contentGrid}>
                    {recentContent.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
              {recommendedContent.length > 0 && (
                <div>
                  <p style={styles.contentSubTitle}>추천 콘텐츠</p>
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

        {/* 6. Resource Section */}
        <Section title="자료실" linkTo="/docs" linkLabel="자료실 바로가기 →">
          <div style={styles.resourceCard}>
            <p style={styles.resourceText}>약사 업무에 필요한 자료를 확인하세요.</p>
            <Link to="/docs" style={styles.resourceLink}>자료실 이동 →</Link>
          </div>
        </Section>

        {/* 7. Sponsor Bar */}
        <SponsorBar sponsors={sponsors} />
      </div>
    </div>
  );
}

// ─── Content Card ───

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
            style={styles.mediaImg}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div style={{ ...styles.contentThumb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, color: colors.neutral300 }}>📄</span>
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

// ─── Section wrapper ───

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

// ─── Styles ───

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '60vh',
    backgroundColor: colors.neutral50,
  },
  content: {
    maxWidth: 960,
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.md}`,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral800,
    margin: 0,
  },
  sectionLink: {
    fontSize: 13,
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  empty: {
    color: colors.neutral400,
    fontSize: 14,
    textAlign: 'center' as const,
    padding: '24px 0',
  },
  // Forum categories
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  categoryCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    padding: '16px 12px',
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'box-shadow 0.2s',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.neutral700,
  },
  categoryCount: {
    fontSize: 11,
    color: colors.neutral400,
  },
  // Posts
  postList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  postItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'white',
    textDecoration: 'none',
  },
  postMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  postCategory: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: '#dbeafe',
    padding: '2px 8px',
    borderRadius: 4,
    flexShrink: 0,
  },
  postTitle: {
    fontSize: 14,
    color: colors.neutral700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  postMeta: {
    display: 'flex',
    gap: 10,
    fontSize: 12,
    color: colors.neutral400,
    flexShrink: 0,
    marginLeft: 12,
  },
  // Media
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  mediaCard: {
    display: 'block',
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    textDecoration: 'none',
  },
  mediaThumb: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  mediaPlaceholder: {
    fontSize: 28,
    color: colors.neutral300,
  },
  mediaName: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.neutral700,
    padding: '8px 12px 4px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  mediaDuration: {
    fontSize: 11,
    color: colors.neutral400,
    padding: '0 12px 8px',
    margin: 0,
  },
  // Content (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1)
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  contentSubTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 10,
    margin: '0 0 10px 0',
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
    backgroundColor: '#dbeafe',
    color: colors.primary,
    borderRadius: 4,
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.neutral700,
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  contentDesc: {
    fontSize: 11,
    color: colors.neutral400,
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  contentDate: {
    fontSize: 10,
    color: colors.neutral300,
    margin: 0,
  },
  // Resources
  resourceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceText: {
    fontSize: 14,
    color: colors.neutral600,
    margin: 0,
  },
  resourceLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 500,
    textDecoration: 'none',
  },
};

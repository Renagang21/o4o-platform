/**
 * CommunityHubPage — K-Cosmetics Community Hub Main Page
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1: 콘텐츠 섹션 추가
 *
 * Route: /community
 * Adapted from KPA CommunityHubPage template.
 *
 * 8 sections:
 *  1. HeroBannerSection  — community_ads type=hero
 *  2. ForumSection       — forum categories
 *  3. LatestPostsSection — recent posts
 *  4. AdSection          — community_ads type=page
 *  5. VideoSection       — signage media
 *  5.5 ContentSection    — CMS hub content (최근 + 추천)
 *  6. ResourceSection    — placeholder
 *  7. SponsorBar         — community_sponsors
 */

import { useState, useEffect, CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { communityApi, type CommunityAd, type CommunitySponsor } from '../../services/communityApi';
import { fetchPopularForums, fetchForumPosts, type PopularForum, type ForumPost } from '../../services/forumApi';
import { publicContentApi, type SignageMedia } from '../../lib/api/signageV2';
import { hubContentApi, type HubContentItemResponse } from '../../lib/api/hubContent';
import { HeroBannerSection } from '../../components/community/HeroBannerSection';
import { AdSection } from '../../components/community/AdSection';
import { SponsorBar } from '../../components/community/SponsorBar';

export default function CommunityHubPage() {
  const navigate = useNavigate();
  const [heroAds, setHeroAds] = useState<CommunityAd[]>([]);
  const [pageAds, setPageAds] = useState<CommunityAd[]>([]);
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [categories, setCategories] = useState<PopularForum[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [media, setMedia] = useState<SignageMedia[]>([]);
  const [contentItems, setContentItems] = useState<HubContentItemResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      communityApi.getHeroAds(),
      communityApi.getPageAds(),
      communityApi.getSponsors(),
      fetchPopularForums(6),
      fetchForumPosts({ limit: 5 }),
      publicContentApi.listMedia(undefined, 'k-cosmetics', { limit: 4 }).catch(() => ({ data: [] })),
      hubContentApi.list({ sourceDomain: 'cms', limit: 50 }).catch(() => ({ data: [] })),
    ]).then(([heroRes, pageRes, sponsorRes, catRes, postsRes, signageRes, contentRes]) => {
      if (heroRes.status === 'fulfilled') {
        const v = heroRes.value as any;
        setHeroAds(v?.data?.ads ?? v?.ads ?? []);
      }
      if (pageRes.status === 'fulfilled') {
        const v = pageRes.value as any;
        setPageAds(v?.data?.ads ?? v?.ads ?? []);
      }
      if (sponsorRes.status === 'fulfilled') {
        const v = sponsorRes.value as any;
        setSponsors(v?.data?.sponsors ?? v?.sponsors ?? []);
      }
      if (catRes.status === 'fulfilled') {
        const v = catRes.value as any;
        setCategories(v?.data ?? []);
      }
      if (postsRes.status === 'fulfilled') {
        const v = postsRes.value as any;
        const postData = v?.data ?? [];
        setPosts(Array.isArray(postData) ? postData : []);
      }
      if (signageRes.status === 'fulfilled') {
        const v = signageRes.value as any;
        setMedia(v?.data?.items ?? v?.data ?? []);
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
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        {/* 1. Hero Banner */}
        <HeroBannerSection ads={heroAds} />

        {/* 2. Forum Section */}
        <Section title="Forum" linkTo="/forum" linkLabel="Go to Forum">
          {categories.length > 0 ? (
            <div style={styles.categoryGrid}>
              {categories.slice(0, 6).map((cat) => (
                <Link key={cat.id} to={`/forum/posts?category=${cat.id}`} style={styles.categoryCard}>
                  <span style={styles.categoryEmoji}>{CATEGORY_ICONS[cat.name] || '💬'}</span>
                  <span style={styles.categoryName}>{cat.name}</span>
                  <span style={styles.categoryCount}>{cat.postCount} posts</span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>No forum categories yet.</p>
          )}
        </Section>

        {/* 3. Latest Posts */}
        <Section title="Recent Posts" linkTo="/forum/posts" linkLabel="View All">
          {posts.length > 0 ? (
            <div style={styles.postList}>
              {posts.map((post) => (
                <Link key={post.id} to={`/forum/post/${post.id}`} style={styles.postItem}>
                  <div style={styles.postMain}>
                    <span style={styles.postTitle}>{post.title}</span>
                  </div>
                  <div style={styles.postMeta}>
                    <span>{post.author?.name || 'Anonymous'}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>No posts yet.</p>
          )}
        </Section>

        {/* 4. Page Ads */}
        <AdSection ads={pageAds} />

        {/* 5. Video Section (WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1) */}
        <Section title="Videos" linkTo="/partner/signage/content" linkLabel="View All">
          {media.length > 0 ? (
            <div style={styles.mediaGrid}>
              {media.slice(0, 4).map((item) => (
                <div key={item.id} style={styles.mediaCard}>
                  <Link to={`/partner/signage/media/${item.id}`} style={{ textDecoration: 'none' }}>
                    <div style={styles.mediaThumb}>
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.name} style={styles.mediaImg} />
                      ) : (
                        <div style={styles.mediaPlaceholder}>&#9654;</div>
                      )}
                    </div>
                    <p style={styles.mediaName}>{item.name}</p>
                  </Link>
                  <div style={styles.mediaAction}>
                    <button
                      onClick={() => navigate(`/store/signage?mediaId=${item.id}`)}
                      style={styles.applyButton}
                    >
                      매장에 적용 &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>No videos yet.</p>
          )}
        </Section>

        {/* 5.5 Content Section (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1) */}
        <Section title="콘텐츠" linkTo="/library/content" linkLabel="전체보기 →">
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
        <Section title="Resources">
          <div style={styles.resourceCard}>
            <p style={styles.resourceText}>Resource section coming soon.</p>
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

// ─── Category emoji mapping ───
const CATEGORY_ICONS: Record<string, string> = {
  'Free Board': '💬',
  'Beauty Trends': '💄',
  'Skincare': '🧴',
  'Makeup': '💋',
  'Reviews': '⭐',
  'Q&A': '❓',
  '자유게시판': '💬',
  '뷰티 트렌드': '💄',
  '스킨케어': '🧴',
  '메이크업': '💋',
  '리뷰': '⭐',
  '질문답변': '❓',
};

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
    backgroundColor: '#f8fafc',
  },
  content: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 16px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  sectionLink: {
    fontSize: 13,
    color: '#DB2777',
    textDecoration: 'none',
    fontWeight: 500,
  },
  empty: {
    color: '#94a3b8',
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
    color: '#334155',
  },
  categoryCount: {
    fontSize: 11,
    color: '#94a3b8',
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
  postTitle: {
    fontSize: 14,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  postMeta: {
    display: 'flex',
    gap: 10,
    fontSize: 12,
    color: '#94a3b8',
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
    color: '#cbd5e1',
  },
  mediaName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#334155',
    padding: '8px 12px 8px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
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
    color: '#64748b',
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
    backgroundColor: '#fdf2f8',
    color: '#DB2777',
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
    color: '#475569',
    margin: 0,
  },
  // Media action
  mediaAction: {
    padding: '0 12px 10px',
  },
  applyButton: {
    width: '100%',
    padding: '6px 0',
    fontSize: 12,
    fontWeight: 600,
    color: '#DB2777',
    backgroundColor: '#fdf2f8',
    border: '1px solid #fbcfe8',
    borderRadius: 6,
    cursor: 'pointer',
  },
};

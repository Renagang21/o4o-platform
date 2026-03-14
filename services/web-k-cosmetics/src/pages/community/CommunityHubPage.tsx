/**
 * CommunityHubPage — K-Cosmetics Community Hub Main Page
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Route: /community
 * Adapted from KPA CommunityHubPage template.
 *
 * 7 sections:
 *  1. HeroBannerSection  — community_ads type=hero
 *  2. ForumSection       — forum categories
 *  3. LatestPostsSection — recent posts
 *  4. AdSection          — community_ads type=page
 *  5. VideoSection       — signage media
 *  6. ResourceSection    — placeholder
 *  7. SponsorBar         — community_sponsors
 */

import { useState, useEffect, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { communityApi, type CommunityAd, type CommunitySponsor } from '../../services/communityApi';
import { fetchPopularForums, fetchForumPosts, type PopularForum, type ForumPost } from '../../services/forumApi';
import { publicContentApi, type SignageMedia } from '../../lib/api/signageV2';
import { HeroBannerSection } from '../../components/community/HeroBannerSection';
import { AdSection } from '../../components/community/AdSection';
import { SponsorBar } from '../../components/community/SponsorBar';

export default function CommunityHubPage() {
  const [heroAds, setHeroAds] = useState<CommunityAd[]>([]);
  const [pageAds, setPageAds] = useState<CommunityAd[]>([]);
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [categories, setCategories] = useState<PopularForum[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [media, setMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      communityApi.getHeroAds(),
      communityApi.getPageAds(),
      communityApi.getSponsors(),
      fetchPopularForums(6),
      fetchForumPosts({ limit: 5 }),
      publicContentApi.listMedia(undefined, 'k-cosmetics', { limit: 4 }).catch(() => ({ data: [] })),
    ]).then(([heroRes, pageRes, sponsorRes, catRes, postsRes, signageRes]) => {
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
      setLoading(false);
    });
  }, []);

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

        {/* 5. Video Section */}
        <Section title="Videos" linkTo="/partner/signage/content" linkLabel="View All">
          {media.length > 0 ? (
            <div style={styles.mediaGrid}>
              {media.slice(0, 4).map((item) => (
                <Link key={item.id} to={`/partner/signage/media/${item.id}`} style={styles.mediaCard}>
                  <div style={styles.mediaThumb}>
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.name} style={styles.mediaImg} />
                    ) : (
                      <div style={styles.mediaPlaceholder}>&#9654;</div>
                    )}
                  </div>
                  <p style={styles.mediaName}>{item.name}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>No videos yet.</p>
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
};

/**
 * CommunityHubPage — KPA Community Hub Main Page
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Route: /community
 * Forum Core 수정 없음. 기존 Forum API / Home API 재활용.
 *
 * 7개 섹션:
 *  1. HeroBannerSection  — community_ads type=hero
 *  2. ForumSection       — 포럼 카테고리 카드 → /forum
 *  3. LatestPostsSection — 최근 글 5개
 *  4. AdSection          — community_ads type=page
 *  5. VideoSection       — signage media → /signage
 *  6. ResourceSection    — 자료실 → /docs
 *  7. SponsorBar         — community_sponsors
 */

import { useState, useEffect, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { communityApi, type CommunityAd, type CommunitySponsor } from '../../api/community';
import { forumApi } from '../../api/forum';
import { homeApi } from '../../api/home';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      communityApi.getHeroAds(),
      communityApi.getPageAds(),
      communityApi.getSponsors(),
      forumApi.getCategories(),
      forumApi.getPosts({ limit: 5 }),
      homeApi.getSignage(4, 0),
    ]).then(([heroRes, pageRes, sponsorRes, catRes, postsRes, signageRes]) => {
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
      setLoading(false);
    });
  }, []);

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

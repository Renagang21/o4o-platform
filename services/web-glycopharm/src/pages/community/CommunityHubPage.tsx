/**
 * CommunityHubPage — GlycoPharm Community Hub Main Page
 *
 * WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Route: /community
 * Adapted from KPA CommunityHubPage template + GlycoPharm Forum Extension.
 *
 * 8 sections:
 *  1. HeroBannerSection  — community_ads type=hero
 *  2. ForumSection       — forum categories
 *  3. ForumExtSection    — 약국 공동 서비스 (GlycoPharm unique)
 *  4. LatestPostsSection — recent posts
 *  5. AdSection          — community_ads type=page
 *  6. VideoSection       — signage media
 *  7. ResourceSection    — placeholder
 *  8. SponsorBar         — community_sponsors
 */

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { communityApi, type CommunityAd, type CommunitySponsor } from '../../services/communityApi';
import { publicContentApi, type SignageMedia } from '../../lib/api/signageV2';
import { HeroBannerSection } from '../../components/community/HeroBannerSection';
import { AdSection } from '../../components/community/AdSection';
import { SponsorBar } from '../../components/community/SponsorBar';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  iconEmoji?: string | null;
}

interface ForumPost {
  id: string;
  title: string;
  createdAt: string;
  author?: { name?: string };
}

export default function CommunityHubPage() {
  const [heroAds, setHeroAds] = useState<CommunityAd[]>([]);
  const [pageAds, setPageAds] = useState<CommunityAd[]>([]);
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [media, setMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      communityApi.getHeroAds(),
      communityApi.getPageAds(),
      communityApi.getSponsors(),
      apiClient.get<ForumCategory[]>('/api/v1/glycopharm/forum/categories'),
      apiClient.get<ForumPost[]>('/api/v1/glycopharm/forum/posts?limit=5'),
      publicContentApi.listMedia(undefined, 'glycopharm', { limit: 4 }).catch(() => ({ data: [] })),
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
        const catData = v?.data ?? [];
        setCategories(Array.isArray(catData) ? catData : []);
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
        <Section title="포럼" linkTo="/forum" linkLabel="포럼 전체보기">
          {categories.length > 0 ? (
            <div style={styles.categoryGrid}>
              {categories.slice(0, 6).map((cat) => (
                <Link key={cat.id} to={`/forum/posts?category=${cat.id}`} style={styles.categoryCard}>
                  <span style={styles.categoryEmoji}>{cat.iconEmoji || CATEGORY_ICONS[cat.name] || '💬'}</span>
                  <span style={styles.categoryName}>{cat.name}</span>
                  <span style={styles.categoryCount}>{cat.postCount} posts</span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>포럼 카테고리가 없습니다.</p>
          )}
        </Section>

        {/* 3. Forum Extension — 약국 공동 서비스 (GlycoPharm unique) */}
        <Section title="약국 공동 서비스" linkTo="/forum-ext" linkLabel="전체보기">
          <div style={styles.extCard}>
            <div style={styles.extIcon}>🏥</div>
            <div style={styles.extInfo}>
              <h3 style={styles.extTitle}>약국 공동 포럼</h3>
              <p style={styles.extDesc}>혼자 운영하지 않습니다. 회원 약사들의 공동 포럼에 참여하세요.</p>
            </div>
            <Link to="/forum-ext" style={styles.extBtn}>참여하기</Link>
          </div>
        </Section>

        {/* 4. Latest Posts */}
        <Section title="최근 게시글" linkTo="/forum/posts" linkLabel="전체보기">
          {posts.length > 0 ? (
            <div style={styles.postList}>
              {posts.map((post) => (
                <Link key={post.id} to={`/forum/posts`} style={styles.postItem}>
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
            <p style={styles.empty}>게시글이 없습니다.</p>
          )}
        </Section>

        {/* 5. Page Ads */}
        <AdSection ads={pageAds} />

        {/* 6. Video Section */}
        <Section title="영상" linkTo="/signage" linkLabel="전체보기">
          {media.length > 0 ? (
            <div style={styles.mediaGrid}>
              {media.slice(0, 4).map((item) => (
                <Link key={item.id} to={`/store/signage/media/${item.id}`} style={styles.mediaCard}>
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
            <p style={styles.empty}>영상이 없습니다.</p>
          )}
        </Section>

        {/* 7. Resource Section */}
        <Section title="자료실">
          <div style={styles.resourceCard}>
            <p style={styles.resourceText}>자료실 준비 중입니다.</p>
            <Link to="/education" style={styles.resourceLink}>교육 콘텐츠 보기 &rarr;</Link>
          </div>
        </Section>

        {/* 8. Sponsor Bar */}
        <SponsorBar sponsors={sponsors} />
      </div>
    </div>
  );
}

// ─── Category emoji mapping ───
const CATEGORY_ICONS: Record<string, string> = {
  '자유게시판': '💬',
  'Free Board': '💬',
  '약국 운영': '🏥',
  'Pharmacy': '🏥',
  '제품 리뷰': '⭐',
  'Reviews': '⭐',
  '질문답변': '❓',
  'Q&A': '❓',
  '공지사항': '📢',
  'Announcement': '📢',
  '건강 정보': '💊',
  'Health': '💊',
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
    color: '#059669',
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
  // Forum Extension card
  extCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 24px',
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #d1fae5',
    background: 'linear-gradient(135deg, #f0fdf4, #ffffff)',
  },
  extIcon: {
    fontSize: 32,
    flexShrink: 0,
  },
  extInfo: {
    flex: 1,
    minWidth: 0,
  },
  extTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  extDesc: {
    fontSize: 13,
    color: '#64748b',
    margin: 0,
  },
  extBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#059669',
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
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
  resourceLink: {
    fontSize: 13,
    color: '#059669',
    textDecoration: 'none',
    fontWeight: 500,
  },
};

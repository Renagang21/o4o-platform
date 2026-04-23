/**
 * ForumHubTemplate — /forum HUB 공통 템플릿
 *
 * WO-O4O-FORUM-HUB-TEMPLATE-FOUNDATION-V1
 *
 * KPA-Society ForumHomePage를 canonical 기준으로 추출.
 * 서비스별 차이(제목, 경로, API, 검색, 서브섹션)는 ForumHubConfig로 주입.
 *
 * 확장 패턴:
 *   <ForumHubTemplate config={serviceConfig} isAuthenticated={...} />
 *
 * 서비스별 오버라이드 패턴:
 *   config.renderCategorySection  — KPA: ForumHubSection (sort/tag 포함)
 *   config.renderActivitySection  — KPA: ForumActivitySection
 *   config.renderSearchSection    — KPA: ForumSearchBar
 *   config.renderSearchResults    — KPA: ForumSearchResults
 *   config.renderWritePrompt      — KPA/Glyco: 각자 auth-aware CTA
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface ForumHubCategory {
  id: string;
  name: string;
  description?: string | null;
  iconEmoji?: string | null;
  iconUrl?: string | null;
  color?: string | null;
  postCount: number;
  isPinned?: boolean;
  lastPostTitle?: string | null;
  lastActivityAt?: string | null;
}

export interface ForumHubPost {
  id: string;
  title: string;
  authorName?: string | null;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  isPinned?: boolean;
}

// ─── Config Interface ─────────────────────────────────────────────────────────

export interface ForumHubConfig {
  serviceKey: string;

  /** Block 1: Hero */
  heroTitle: string;
  heroDesc: string;

  /** 카테고리 상세 경로 생성 */
  categoryPath: (categoryId: string) => string;
  /** "전체 글" 링크 경로 */
  listPath: string;

  /** 카테고리 목록 조회 (기본 렌더러 사용 시) */
  fetchCategories: () => Promise<ForumHubCategory[]>;
  /** 최근 게시글 조회 (기본 활동 렌더러 사용 시) */
  fetchRecentPosts: () => Promise<ForumHubPost[]>;

  /**
   * 글쓰기 유도 CTA 설정 (기본 렌더러 사용 시)
   * renderWritePrompt가 있으면 무시됨
   */
  writePrompt?: {
    authTitle?: string;
    authDesc?: string;
    unauthTitle?: string;
    unauthDesc?: string;
    /** 인증 후 CTA 경로 */
    ctaPath: string;
  };

  /** 하단 바로가기 링크 목록 */
  infoLinks?: { label: string; href: string }[];

  // ── 섹션 오버라이드 (optional) ───────────────────────────────────────────

  /**
   * 카테고리 섹션 전체 대체.
   * KPA: () => <ForumHubSection /> 으로 sort/tag 기능 유지
   */
  renderCategorySection?: () => React.ReactNode;

  /**
   * 활동 섹션 전체 대체.
   * KPA: () => <ForumActivitySection /> 으로 서버 집계 기능 유지
   */
  renderActivitySection?: () => React.ReactNode;

  /**
   * 검색바 렌더러.
   * KPA: (onSearch, onClear, isSearching) => <ForumSearchBar ... />
   * 미제공 시 검색 UI 없음
   */
  renderSearchSection?: (
    onSearch: (query: string) => void,
    onClear: () => void,
    isSearching: boolean,
  ) => React.ReactNode;

  /**
   * 검색 결과 렌더러 (isSearchMode 활성 시 카테고리/활동 대신 표시).
   * KPA: (query) => <ForumSearchResults query={query} />
   */
  renderSearchResults?: (query: string) => React.ReactNode;

  /**
   * 글쓰기 유도 CTA 전체 대체.
   * KPA: () => <ForumWritePrompt /> (내부 useAuth 사용)
   * 미제공 시 기본 CTA 렌더러 사용 (isAuthenticated prop 기반)
   */
  renderWritePrompt?: () => React.ReactNode;

  /** Hero 우측 액션 버튼 슬롯 */
  headerAction?: React.ReactNode;
}

// ─── Default Category Section ─────────────────────────────────────────────────

function DefaultCategorySection({
  categories,
  categoryPath,
  listPath,
  loading,
}: {
  categories: ForumHubCategory[];
  categoryPath: (id: string) => string;
  listPath: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section style={catSt.container}>
        <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>불러오는 중...</p>
      </section>
    );
  }

  return (
    <section style={catSt.container}>
      <div style={catSt.header}>
        <h2 style={catSt.title}>포럼 목록</h2>
        <Link to={listPath} style={catSt.moreLink}>전체 보기 →</Link>
      </div>

      {categories.length === 0 ? (
        <div style={catSt.emptyCard}>
          <p style={{ color: '#6B7280', textAlign: 'center', margin: 0 }}>
            등록된 포럼이 없습니다
          </p>
        </div>
      ) : (
        <div style={catSt.listCard}>
          {categories.map((cat, idx) => (
            <Link
              key={cat.id}
              to={categoryPath(cat.id)}
              style={{
                ...catSt.item,
                borderBottom: idx < categories.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}
            >
              {/* Icon */}
              <div style={catSt.iconWrap}>
                {cat.iconUrl ? (
                  <img src={cat.iconUrl} alt={cat.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                ) : (
                  <span style={{ ...catSt.iconEmoji, backgroundColor: cat.color ? `${cat.color}1a` : '#ECFDF5' }}>
                    {cat.iconEmoji || '📂'}
                  </span>
                )}
              </div>

              {/* Content */}
              <div style={catSt.content}>
                <div style={catSt.nameRow}>
                  <span style={catSt.name}>{cat.name}</span>
                  {cat.isPinned && (
                    <span style={catSt.pinnedBadge}>추천</span>
                  )}
                  {cat.lastActivityAt && isToday(cat.lastActivityAt) && (
                    <span style={catSt.todayBadge}>오늘 글 있음</span>
                  )}
                </div>
                {cat.description && (
                  <p style={catSt.desc}>{cat.description}</p>
                )}
                {cat.lastPostTitle && (
                  <p style={catSt.lastPost}>최근: {cat.lastPostTitle}</p>
                )}
                <span style={catSt.postCount}>글 {cat.postCount ?? 0}개</span>
              </div>

              {/* Chevron */}
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

// ─── Default Activity Section ─────────────────────────────────────────────────

function DefaultActivitySection({
  posts,
  listPath,
  loading,
}: {
  posts: ForumHubPost[];
  listPath: string;
  loading: boolean;
}) {
  const recent = posts.slice(0, 5);
  const popular = [...posts].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, 5);
  const hasContent = !loading && (recent.length > 0 || popular.length > 0);

  if (loading || !hasContent) return null;

  return (
    <section style={actSt.container}>
      <div style={actSt.grid}>
        {/* 인기 글 */}
        <div style={actSt.card}>
          <div style={actSt.cardHeader}>
            <h3 style={actSt.cardTitle}>인기 글</h3>
            <Link to={listPath} style={actSt.moreLink}>더보기 →</Link>
          </div>
          <PostList posts={popular} />
        </div>
        {/* 최근 글 */}
        <div style={actSt.card}>
          <div style={actSt.cardHeader}>
            <h3 style={actSt.cardTitle}>최근 글</h3>
            <Link to={listPath} style={actSt.moreLink}>더보기 →</Link>
          </div>
          <PostList posts={recent} />
        </div>
      </div>
    </section>
  );
}

function PostList({ posts }: { posts: ForumHubPost[] }) {
  if (posts.length === 0) {
    return <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '24px 0', margin: 0, fontSize: 14 }}>아직 게시글이 없습니다</p>;
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {posts.map((post) => (
        <li key={post.id} style={actSt.postItem}>
          <div style={actSt.postTitleRow}>
            {post.isPinned && <span style={actSt.pinnedBadge}>공지</span>}
            <span style={actSt.postTitle}>{post.title}</span>
            {(post.commentCount ?? 0) > 0 && (
              <span style={actSt.commentCount}>[{post.commentCount}]</span>
            )}
          </div>
          <div style={actSt.postMeta}>
            <span>{post.authorName || '익명'}</span>
            <span style={actSt.dot}>·</span>
            <span>{formatDate(post.createdAt)}</span>
            <span style={actSt.dot}>·</span>
            <span>조회 {post.viewCount ?? 0}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  if (hours < 48) return '어제';
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// ─── Default Write Prompt ─────────────────────────────────────────────────────

function DefaultWritePrompt({
  writePrompt,
  isAuthenticated,
}: {
  writePrompt: NonNullable<ForumHubConfig['writePrompt']>;
  isAuthenticated: boolean;
}) {
  const authTitle = writePrompt.authTitle ?? '포럼에서 소통해 보세요';
  const authDesc = writePrompt.authDesc ?? '관심 있는 포럼을 선택하고 글을 작성해 보세요';
  const unauthTitle = writePrompt.unauthTitle ?? '포럼에 참여해 보세요';
  const unauthDesc = writePrompt.unauthDesc ?? '로그인 후 포럼 글을 작성하고 토론에 참여할 수 있습니다';

  return (
    <section style={ctaSt.container}>
      <div style={ctaSt.card}>
        <div style={ctaSt.left}>
          <span style={ctaSt.icon}>✏️</span>
          <div>
            <h3 style={ctaSt.title}>
              {isAuthenticated ? authTitle : unauthTitle}
            </h3>
            <p style={ctaSt.desc}>
              {isAuthenticated ? authDesc : unauthDesc}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link to={writePrompt.ctaPath} style={ctaSt.ctaPrimary}>
            포럼 보기
          </Link>
        ) : (
          <Link to="/login" style={ctaSt.ctaOutline}>
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

// ─── Info Links Section ───────────────────────────────────────────────────────

function InfoLinksSection({ links }: { links: { label: string; href: string }[] }) {
  return (
    <section style={infoSt.container}>
      <div style={infoSt.linkRow}>
        {links.map((link) => (
          <Link key={link.href} to={link.href} style={infoSt.link}>
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Template Component ───────────────────────────────────────────────────────

interface ForumHubTemplateProps {
  config: ForumHubConfig;
  /** 글쓰기 CTA 기본 렌더러에 사용 (renderWritePrompt 미제공 시) */
  isAuthenticated?: boolean;
}

export function ForumHubTemplate({ config, isAuthenticated = false }: ForumHubTemplateProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const isSearchMode = searchQuery.length >= 2;

  const [categories, setCategories] = useState<ForumHubCategory[]>([]);
  const [posts, setPosts] = useState<ForumHubPost[]>([]);
  const [catsLoading, setCatsLoading] = useState(!config.renderCategorySection);
  const [postsLoading, setPostsLoading] = useState(!config.renderActivitySection);

  const loadCategories = useCallback(async () => {
    if (config.renderCategorySection) return;
    setCatsLoading(true);
    try {
      const data = await config.fetchCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setCatsLoading(false);
    }
  }, [config]);

  const loadPosts = useCallback(async () => {
    if (config.renderActivitySection) return;
    setPostsLoading(true);
    try {
      const data = await config.fetchRecentPosts();
      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [config]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleSearch = (q: string) => setSearchQuery(q);
  const handleClear = () => setSearchQuery('');

  return (
    <div style={pageSt.page}>
      {/* Hero */}
      <PageHero>
        <div style={pageSt.heroInner}>
          <PageContainer>
            <div style={pageSt.heroRow}>
              <div>
                <h1 style={pageSt.heroTitle}>{config.heroTitle}</h1>
                <p style={pageSt.heroDesc}>{config.heroDesc}</p>
              </div>
              {config.headerAction}
            </div>
          </PageContainer>
        </div>
      </PageHero>

      <PageSection last>
        <PageContainer>
          {/* Search Section (optional) */}
          {config.renderSearchSection?.(handleSearch, handleClear, isSearchMode)}

          {/* Search Results OR Category + Activity */}
          {isSearchMode && config.renderSearchResults ? (
            config.renderSearchResults(searchQuery)
          ) : (
            <>
              {config.renderCategorySection?.() ?? (
                <DefaultCategorySection
                  categories={categories}
                  categoryPath={config.categoryPath}
                  listPath={config.listPath}
                  loading={catsLoading}
                />
              )}
              {config.renderActivitySection?.() ?? (
                <DefaultActivitySection
                  posts={posts}
                  listPath={config.listPath}
                  loading={postsLoading}
                />
              )}
            </>
          )}

          {/* Write CTA */}
          {config.renderWritePrompt?.() ?? (
            config.writePrompt && (
              <DefaultWritePrompt
                writePrompt={config.writePrompt}
                isAuthenticated={isAuthenticated}
              />
            )
          )}

          {/* Info Links */}
          {config.infoLinks && config.infoLinks.length > 0 && (
            <InfoLinksSection links={config.infoLinks} />
          )}
        </PageContainer>
      </PageSection>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageSt: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: '#F8FAFC',
    minHeight: '100vh',
  },
  heroInner: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    padding: '24px 0',
  },
  heroRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  heroDesc: {
    fontSize: '0.875rem',
    color: '#94A3B8',
    margin: '6px 0 0',
  },
};

const catSt: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 0 8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#1E293B',
    margin: 0,
  },
  moreLink: {
    fontSize: '0.875rem',
    color: '#2563EB',
    textDecoration: 'none',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    padding: '48px 16px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background 0.1s',
  },
  iconWrap: {
    flexShrink: 0,
  },
  iconEmoji: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 10,
    fontSize: 22,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  name: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1E293B',
  },
  pinnedBadge: {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '1px 6px',
    borderRadius: 4,
  },
  todayBadge: {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: '#10B981',
    padding: '1px 6px',
    borderRadius: 4,
  },
  desc: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    margin: '2px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  lastPost: {
    fontSize: '0.75rem',
    color: '#64748B',
    margin: '2px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  postCount: {
    fontSize: '0.6875rem',
    color: '#94A3B8',
    marginTop: 4,
    display: 'block',
  },
};

const actSt: Record<string, React.CSSProperties> = {
  container: {
    padding: '8px 0 16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #F1F5F9',
  },
  cardTitle: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#1E293B',
    margin: 0,
  },
  moreLink: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    textDecoration: 'none',
  },
  postItem: {
    padding: '10px 16px',
    borderBottom: '1px solid #F8FAFC',
  },
  postTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  pinnedBadge: {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: '#EF4444',
    padding: '1px 5px',
    borderRadius: 3,
    flexShrink: 0,
  },
  postTitle: {
    fontSize: '0.8125rem',
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  commentCount: {
    fontSize: '0.75rem',
    color: '#2563EB',
    fontWeight: 500,
    flexShrink: 0,
  },
  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    fontSize: '0.6875rem',
    color: '#94A3B8',
  },
  dot: {
    color: '#CBD5E1',
  },
};

const ctaSt: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px 0',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    background: 'linear-gradient(to right, #ECFDF5, #F0FDFA)',
    borderRadius: 12,
    border: '1px solid #D1FAE5',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    fontSize: 20,
  },
  title: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#1E293B',
    margin: 0,
  },
  desc: {
    fontSize: '0.75rem',
    color: '#64748B',
    margin: '3px 0 0',
  },
  ctaPrimary: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: '#059669',
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  ctaOutline: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#059669',
    border: '1px solid #A7F3D0',
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
};

const infoSt: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 0 8px',
    borderTop: '1px solid #E2E8F0',
    marginTop: 8,
  },
  linkRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  link: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    textDecoration: 'none',
    padding: '6px 12px',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
};

export default ForumHubTemplate;

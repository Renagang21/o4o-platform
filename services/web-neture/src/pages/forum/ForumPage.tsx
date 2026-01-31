/**
 * ForumPage - 포럼 홈 페이지
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * Phase B-2: forum-core API 연동
 *
 * 역할: Home에서 시작된 "이해와 질문"을 정식 대화와 기록으로 완결
 * - 커뮤니티 ❌ / 고객센터 ❌
 * - 질문·의견·제안의 공식 기록 공간
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchForumPosts,
  fetchPinnedPosts,
  fetchForumCategories,
  normalizePostType,
  getAuthorName,
  type ForumPost as ApiForumPost,
  type ForumCategory,
} from '../../services/forumApi';
import type { ForumPostType } from '@o4o/types/forum';

type PostType = ForumPostType;

interface DisplayPost {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  authorName: string;
  isPinned: boolean;
  commentCount: number;
  createdAt: string;
}

function apiTypeToDisplayType(apiType: string): PostType {
  // API now returns lowercase values matching PostType directly
  const valid: PostType[] = ['discussion', 'question', 'announcement', 'poll', 'guide'];
  const lower = apiType.toLowerCase() as PostType;
  return valid.includes(lower) ? lower : 'discussion';
}

function toDisplayPost(post: ApiForumPost): DisplayPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    type: apiTypeToDisplayType(normalizePostType(post.type)),
    authorName: getAuthorName(post),
    isPinned: post.isPinned,
    commentCount: post.commentCount || 0,
    createdAt: post.createdAt,
  };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 7) {
    return date.toLocaleDateString('ko-KR');
  } else if (days > 0) {
    return `${days}일 전`;
  } else {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) {
      return `${hours}시간 전`;
    }
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes}분 전` : '방금 전';
  }
}

function getTypeBadge(type: PostType): { label: string; bgColor: string; textColor: string } | null {
  const badges: Record<PostType, { label: string; bgColor: string; textColor: string }> = {
    announcement: { label: '공지', bgColor: '#fef2f2', textColor: '#dc2626' },
    question: { label: '질문', bgColor: '#f0fdf4', textColor: '#16a34a' },
    guide: { label: '가이드', bgColor: '#fefce8', textColor: '#ca8a04' },
    discussion: { label: '토론', bgColor: '#eff6ff', textColor: '#2563eb' },
    poll: { label: '투표', bgColor: '#faf5ff', textColor: '#9333ea' },
  };
  // discussion은 기본 타입이므로 배지 표시하지 않음
  if (type === 'discussion') return null;
  return badges[type];
}

function PostItem({ post, onClick }: { post: DisplayPost; onClick: () => void }) {
  const badge = getTypeBadge(post.type);

  return (
    <article style={styles.postItem} onClick={onClick}>
      <div style={styles.postContent}>
        <div style={styles.postTitleRow}>
          {post.isPinned && (
            <span style={styles.pinnedBadge}>고정</span>
          )}
          {badge && (
            <span style={{ ...styles.typeBadge, backgroundColor: badge.bgColor, color: badge.textColor }}>
              {badge.label}
            </span>
          )}
          <h3 style={styles.postTitle}>{post.title}</h3>
          {post.commentCount > 0 && (
            <span style={styles.commentCount}>[{post.commentCount}]</span>
          )}
        </div>
        <div style={styles.postMeta}>
          <span>{post.authorName}</span>
          <span style={styles.metaDivider}>·</span>
          <span>{formatRelativeTime(post.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}

const TYPE_FILTERS: { value: PostType | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'question', label: '질문' },
  { value: 'discussion', label: '토론' },
  { value: 'announcement', label: '공지' },
  { value: 'guide', label: '가이드' },
  { value: 'poll', label: '투표' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '조회수순' },
  { value: 'oldest', label: '오래된순' },
];

export function ForumPage({ boardSlug }: { boardSlug?: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven state
  const searchQuery = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  const typeFilter = (searchParams.get('type') || '') as PostType | '';
  const sortBy = (searchParams.get('sort') || 'latest') as 'latest' | 'popular' | 'oldest';
  const hasFilters = !!searchQuery || !!categoryFilter || !!typeFilter || sortBy !== 'latest';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<DisplayPost[]>([]);
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync input when URL query changes (e.g. browser back/forward)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Load categories once
  useEffect(() => {
    fetchForumCategories().then((res) => {
      if (res.success && res.data) {
        setCategories(res.data);
      }
    });
  }, []);

  useEffect(() => {
    async function loadPosts() {
      setIsLoading(true);
      setError(null);

      try {
        const isFiltering = !!searchQuery || !!categoryFilter || sortBy !== 'latest';

        if (isFiltering) {
          // Filtered mode: fetch with params, skip pinned
          const postsResponse = await fetchForumPosts({
            search: searchQuery || undefined,
            categoryId: categoryFilter || undefined,
            sortBy,
            page: 1,
            limit: 20,
          });

          setPinnedPosts([]);
          let results = postsResponse.data.map(toDisplayPost);

          // Client-side type filter (backend doesn't support postType param)
          if (typeFilter) {
            results = results.filter(p => p.type === typeFilter);
          }

          setPosts(results);
          setTotalCount(typeFilter ? results.length : postsResponse.totalCount);
        } else {
          // Default mode: fetch pinned and regular posts in parallel
          const [pinnedResponse, postsResponse] = await Promise.all([
            fetchPinnedPosts(2),
            fetchForumPosts({ page: 1, limit: 20 }),
          ]);

          setPinnedPosts(pinnedResponse.map(toDisplayPost));

          // Filter out pinned posts from regular list
          const pinnedIds = new Set(pinnedResponse.map(p => p.id));
          let regularPosts = postsResponse.data
            .filter(p => !pinnedIds.has(p.id) && !p.isPinned)
            .map(toDisplayPost);

          // Client-side type filter
          if (typeFilter) {
            regularPosts = regularPosts.filter(p => p.type === typeFilter);
          }

          setPosts(regularPosts);
          setTotalCount(typeFilter ? regularPosts.length : postsResponse.totalCount);
        }
      } catch (err) {
        console.error('Error loading forum posts:', err);
        setError(hasFilters ? '게시글을 불러오지 못했습니다.' : '게시글을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadPosts();
  }, [boardSlug, searchQuery, categoryFilter, typeFilter, sortBy]);

  const handlePostClick = (post: DisplayPost) => {
    navigate(`/forum/post/${post.slug}`);
  };

  // Helper to update URL params without losing other params
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams({});
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.pageTitle}>o4o · 네뚜레 의견 나누기</h1>
            <p style={styles.pageDescription}>
              o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다.
            </p>
          </div>
          <Link to="/forum/write" style={styles.writeButton}>
            의견 남기기
          </Link>
        </div>
      </header>

      {/* Notice Banner */}
      <div style={styles.noticeBanner}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <p style={styles.noticeText}>
          이 포럼은 상품 홍보나 고객 문의를 위한 공간이 아닙니다.
          <br />
          o4o와 네뚜레 구조에 대한 질문과 의견을 남겨주세요.
        </p>
      </div>

      {/* Search Bar */}
      <form style={styles.searchForm} onSubmit={handleSearchSubmit}>
        <div style={styles.searchInputWrapper}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="검색어를 입력하세요"
            style={styles.searchInput}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); updateParam('q', ''); }}
              style={styles.searchClearButton}
              aria-label="검색어 지우기"
            >
              x
            </button>
          )}
        </div>
        <button type="submit" style={styles.searchButton}>
          검색
        </button>
      </form>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => updateParam('category', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">카테고리 전체</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          {/* Type Filter Pills */}
          <div style={styles.typePills}>
            {TYPE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateParam('type', value)}
                style={{
                  ...styles.typePill,
                  ...(typeFilter === value ? styles.typePillActive : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.filterRight}>
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => updateParam('sort', e.target.value === 'latest' ? '' : e.target.value)}
            style={styles.filterSelect}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasFilters && (
        <div style={styles.activeFilters}>
          <span style={styles.activeFiltersLabel}>
            {searchQuery && `"${searchQuery}" `}
            {categoryFilter && categories.find(c => c.id === categoryFilter)
              ? `${categories.find(c => c.id === categoryFilter)!.name} `
              : ''}
            {typeFilter && TYPE_FILTERS.find(t => t.value === typeFilter)
              ? `${TYPE_FILTERS.find(t => t.value === typeFilter)!.label} `
              : ''}
            {sortBy !== 'latest' && SORT_OPTIONS.find(s => s.value === sortBy)
              ? `${SORT_OPTIONS.find(s => s.value === sortBy)!.label}`
              : ''}
          </span>
          <button onClick={handleClearAll} style={styles.clearAllButton}>
            초기화
          </button>
        </div>
      )}

      {/* Loading State - Skeleton */}
      {isLoading && (
        <div style={styles.postList}>
          <div style={styles.listHeader}>
            <span style={{ ...styles.skeletonBar, width: '100px' }} />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={styles.skeletonPost}>
              <div style={{ ...styles.skeletonBar, width: `${60 + (i % 3) * 15}%`, height: '16px' }} />
              <div style={{ ...styles.skeletonBar, width: '120px', height: '12px', marginTop: '8px' }} />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.errorState}>
          <p style={styles.errorText}>{error}</p>
          <button
            style={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Pinned Posts (hidden when filtering) */}
          {!hasFilters && pinnedPosts.length > 0 && (
            <section style={styles.pinnedSection}>
              {pinnedPosts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              ))}
            </section>
          )}

          {/* Post List */}
          <section style={styles.postList}>
            <div style={styles.listHeader}>
              <span style={styles.totalCount}>
                {hasFilters
                  ? `검색 결과 ${totalCount}건`
                  : `총 ${totalCount}개의 게시글`
                }
              </span>
            </div>
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              ))
            ) : hasFilters ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyTitle}>검색 결과가 없습니다</p>
                <p style={styles.emptyDescription}>다른 조건으로 검색해보세요.</p>
                <button onClick={handleClearAll} style={styles.emptyWriteButton}>
                  전체 목록 보기
                </button>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyTitle}>아직 등록된 글이 없습니다.</p>
                <p style={styles.emptyDescription}>첫 번째 의견을 남겨보세요.</p>
                <Link to="/forum/write" style={styles.emptyWriteButton}>
                  의견 남기기
                </Link>
              </div>
            )}
          </section>
        </>
      )}

      {/* Back to Home */}
      <div style={styles.footer}>
        <Link to="/" style={styles.backLink}>
          ← 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '32px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
  },
  writeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: PRIMARY_COLOR,
    textDecoration: 'none',
    borderRadius: '8px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  pageDescription: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  noticeBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.6,
    margin: 0,
  },
  // Filter bar
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  filterRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterSelect: {
    padding: '6px 12px',
    fontSize: '13px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,
  typePills: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  typePill: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    backgroundColor: '#fff',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  typePillActive: {
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    borderColor: PRIMARY_COLOR,
  } as React.CSSProperties,
  activeFilters: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    marginBottom: '12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd',
  },
  activeFiltersLabel: {
    fontSize: '13px',
    color: '#0369a1',
  },
  clearAllButton: {
    fontSize: '12px',
    color: '#0369a1',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '2px 4px',
  } as React.CSSProperties,
  // Search
  searchForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  searchInputWrapper: {
    position: 'relative',
    flex: 1,
  } as React.CSSProperties,
  searchInput: {
    width: '100%',
    padding: '10px 32px 10px 14px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  searchClearButton: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#94a3b8',
    padding: '2px 6px',
    lineHeight: 1,
  } as React.CSSProperties,
  searchButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: PRIMARY_COLOR,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  } as React.CSSProperties,
  // Skeleton loading
  skeletonPost: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
  },
  skeletonBar: {
    display: 'block',
    height: '14px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  } as React.CSSProperties,
  // Error state
  errorState: {
    padding: '48px 20px',
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '15px',
    margin: '0 0 16px 0',
  },
  retryButton: {
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#dc2626',
    backgroundColor: '#fff',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  // Empty state
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  emptyDescription: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 20px 0',
  },
  emptyWriteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: PRIMARY_COLOR,
    textDecoration: 'none',
    borderRadius: '8px',
  },
  pinnedSection: {
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fde68a',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  postList: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  listHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  totalCount: {
    fontSize: '13px',
    color: '#64748b',
  },
  postItem: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  postContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  postTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  pinnedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '4px',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
  },
  postTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1e293b',
    margin: 0,
  },
  commentCount: {
    fontSize: '13px',
    color: PRIMARY_COLOR,
    fontWeight: 500,
  },
  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  metaDivider: {
    color: '#cbd5e1',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
};

export default ForumPage;

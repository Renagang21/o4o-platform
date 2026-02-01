/**
 * ForumPage - K-Cosmetics 포럼 게시글 목록 (테이블 + 페이지네이션)
 *
 * Phase 22-F: 테이블 형태 + 20건 단위 페이지 넘김
 *
 * 컬럼: 유형 | 제목 | 작성자 | 작성일 | 댓글
 * 검색 + 유형 필터 + 정렬
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchForumPosts,
  fetchPinnedPosts,
  normalizePostType,
  getAuthorName,
  type ForumPost as ApiForumPost,
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

function toDisplayPost(post: ApiForumPost): DisplayPost {
  const valid: PostType[] = ['discussion', 'question', 'announcement', 'poll', 'guide'];
  const normalized = normalizePostType(post.type).toLowerCase() as PostType;
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    type: valid.includes(normalized) ? normalized : 'discussion',
    authorName: getAuthorName(post),
    isPinned: post.isPinned,
    commentCount: post.commentCount || 0,
    createdAt: post.createdAt,
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}시간 전`;
  const minutes = Math.floor(diff / (1000 * 60));
  return minutes > 0 ? `${minutes}분 전` : '방금 전';
}

const TYPE_BADGES: Record<PostType, { label: string; bg: string; color: string }> = {
  announcement: { label: '공지', bg: '#fef2f2', color: '#dc2626' },
  question: { label: '질문', bg: '#f0fdf4', color: '#16a34a' },
  guide: { label: '가이드', bg: '#fefce8', color: '#ca8a04' },
  discussion: { label: '토론', bg: '#eff6ff', color: '#2563eb' },
  poll: { label: '투표', bg: '#faf5ff', color: '#9333ea' },
};

const TYPE_FILTERS: { value: PostType | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'question', label: '질문' },
  { value: 'discussion', label: '토론' },
  { value: 'announcement', label: '공지' },
  { value: 'guide', label: '가이드' },
  { value: 'poll', label: '투표' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '조회수순' },
  { value: 'oldest', label: '오래된순' },
];

const PAGE_SIZE = 20;

export default function ForumPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const typeFilter = (searchParams.get('type') || '') as PostType | '';
  const sortBy = (searchParams.get('sort') || 'latest') as 'latest' | 'popular' | 'oldest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const hasFilters = !!searchQuery || !!typeFilter || sortBy !== 'latest';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [pinnedPosts, setPinnedPosts] = useState<DisplayPost[]>([]);
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  const filterKey = `${searchQuery}|${typeFilter}|${sortBy}|${currentPage}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const isFiltering = !!searchQuery || sortBy !== 'latest';

        if (isFiltering) {
          const res = await fetchForumPosts({ page: currentPage, limit: PAGE_SIZE });
          if (cancelled) return;

          setPinnedPosts([]);
          let results = res.data.map(toDisplayPost);
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(p =>
              p.title.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q)
            );
          }
          if (typeFilter) results = results.filter(p => p.type === typeFilter);

          setPosts(results);
          setTotalCount(results.length);
          setTotalPages(Math.max(1, Math.ceil(results.length / PAGE_SIZE)));
        } else {
          const [pinnedRes, postsRes] = await Promise.all([
            currentPage === 1 ? fetchPinnedPosts(5) : Promise.resolve([]),
            fetchForumPosts({ page: currentPage, limit: PAGE_SIZE }),
          ]);
          if (cancelled) return;

          const pinned = (pinnedRes as ApiForumPost[]).map(toDisplayPost);
          setPinnedPosts(currentPage === 1 ? pinned : []);

          const pinnedIds = new Set(pinned.map(p => p.id));
          let regular = postsRes.data
            .filter(p => !pinnedIds.has(p.id) && !p.isPinned)
            .map(toDisplayPost);

          if (typeFilter) regular = regular.filter(p => p.type === typeFilter);

          setPosts(regular);
          setTotalCount(postsRes.totalCount);
          setTotalPages(Math.max(1, Math.ceil(postsRes.totalCount / PAGE_SIZE)));
        }
      } catch {
        if (!cancelled) setError('게시글을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filterKey]);

  const handlePostClick = (post: DisplayPost) => navigate(`/forum/post/${post.id}`);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    updateParam('page', p === 1 ? '' : String(p));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div style={s.container}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerRow}>
          <div>
            <h1 style={s.title}>K-Cosmetics 커뮤니티</h1>
            <p style={s.description}>K-Cosmetics에 대한 질문과 의견을 나누는 공간입니다.</p>
          </div>
          <Link to="/forum" style={s.writeButton}>글쓰기</Link>
        </div>
      </header>

      {/* Search + Filters */}
      <div style={s.toolbar}>
        <form style={s.searchForm} onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="검색어를 입력하세요"
            style={s.searchInput}
          />
          <button type="submit" style={s.searchBtn}>검색</button>
        </form>
        <div style={s.filterRow}>
          <div style={s.pills}>
            {TYPE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateParam('type', value)}
                style={{ ...s.pill, ...(typeFilter === value ? s.pillActive : {}) }}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => updateParam('sort', e.target.value === 'latest' ? '' : e.target.value)} style={s.select}>
            {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {hasFilters && (
          <div style={s.activeFilters}>
            <span style={s.activeLabel}>
              {searchQuery && `"${searchQuery}" `}
              {typeFilter && TYPE_FILTERS.find(t => t.value === typeFilter)?.label
                ? `${TYPE_FILTERS.find(t => t.value === typeFilter)!.label} ` : ''}
              {sortBy !== 'latest' && SORT_OPTIONS.find(o => o.value === sortBy)?.label || ''}
            </span>
            <button onClick={handleClearAll} style={s.clearBtn}>초기화</button>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead><tr>
              <th style={{ ...s.th, width: '60px' }}>유형</th>
              <th style={s.th}>제목</th>
              <th style={{ ...s.th, width: '100px' }}>작성자</th>
              <th style={{ ...s.th, width: '100px' }}>작성일</th>
              <th style={{ ...s.th, width: '60px' }}>댓글</th>
            </tr></thead>
            <tbody>
              {[1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={5} style={s.td}>
                  <div style={{ ...s.skeleton, width: `${50 + i * 8}%` }} />
                </td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={s.errorBox}>
          <p style={s.errorText}>{error}</p>
          <button onClick={() => window.location.reload()} style={s.retryBtn}>다시 시도</button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          {/* Pinned rows (page 1 only) */}
          {!hasFilters && pinnedPosts.length > 0 && (
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <tbody>
                  {pinnedPosts.map(post => {
                    const badge = TYPE_BADGES[post.type];
                    return (
                      <tr key={post.id} style={s.pinnedRow} onClick={() => handlePostClick(post)}>
                        <td style={{ ...s.td, width: '60px', textAlign: 'center' }}>
                          <span style={{ ...s.badge, backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                        </td>
                        <td style={s.td}>
                          <span style={s.pinnedTag}>고정</span>
                          <span style={s.titleText}>{post.title}</span>
                          {post.commentCount > 0 && <span style={s.commentBadge}>[{post.commentCount}]</span>}
                        </td>
                        <td style={{ ...s.td, width: '100px', color: '#64748b' }}>{post.authorName}</td>
                        <td style={{ ...s.td, width: '100px', color: '#94a3b8' }}>{formatDate(post.createdAt)}</td>
                        <td style={{ ...s.td, width: '60px', textAlign: 'center', color: '#64748b' }}>{post.commentCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info bar */}
          <div style={s.infoBar}>
            <span style={s.totalCount}>
              {hasFilters ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
            </span>
            {totalPages > 1 && (
              <span style={s.pageInfo}>{currentPage} / {totalPages} 페이지</span>
            )}
          </div>

          {/* Posts table */}
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: '60px' }}>유형</th>
                  <th style={s.th}>제목</th>
                  <th style={{ ...s.th, width: '100px' }}>작성자</th>
                  <th style={{ ...s.th, width: '100px' }}>작성일</th>
                  <th style={{ ...s.th, width: '60px' }}>댓글</th>
                </tr>
              </thead>
              <tbody>
                {posts.length > 0 ? posts.map(post => {
                  const badge = TYPE_BADGES[post.type];
                  return (
                    <tr key={post.id} style={s.row} onClick={() => handlePostClick(post)}>
                      <td style={{ ...s.td, width: '60px', textAlign: 'center' }}>
                        <span style={{ ...s.badge, backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.titleText}>{post.title}</span>
                        {post.commentCount > 0 && <span style={s.commentBadge}>[{post.commentCount}]</span>}
                      </td>
                      <td style={{ ...s.td, width: '100px', color: '#64748b', fontSize: '13px' }}>{post.authorName}</td>
                      <td style={{ ...s.td, width: '100px', color: '#94a3b8', fontSize: '13px' }}>{formatDate(post.createdAt)}</td>
                      <td style={{ ...s.td, width: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>{post.commentCount}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} style={s.emptyCell}>
                      {hasFilters ? (
                        <>
                          <p style={s.emptyTitle}>검색 결과가 없습니다</p>
                          <button onClick={handleClearAll} style={s.emptyBtn}>전체 목록 보기</button>
                        </>
                      ) : (
                        <>
                          <p style={s.emptyTitle}>아직 등록된 글이 없습니다</p>
                          <Link to="/forum" style={s.emptyBtn}>글쓰기</Link>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button onClick={() => goToPage(1)} disabled={currentPage === 1}
                style={{ ...s.pageBtn, ...(currentPage === 1 ? s.pageBtnDisabled : {}) }}>&laquo;</button>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                style={{ ...s.pageBtn, ...(currentPage === 1 ? s.pageBtnDisabled : {}) }}>&lsaquo;</button>
              {pageNumbers.map(p => (
                <button key={p} onClick={() => goToPage(p)}
                  style={{ ...s.pageBtn, ...(p === currentPage ? s.pageBtnActive : {}) }}>{p}</button>
              ))}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                style={{ ...s.pageBtn, ...(currentPage === totalPages ? s.pageBtnDisabled : {}) }}>&rsaquo;</button>
              <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
                style={{ ...s.pageBtn, ...(currentPage === totalPages ? s.pageBtnDisabled : {}) }}>&raquo;</button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={s.footer}>
        <Link to="/" style={s.backLink}>&larr; 홈으로 돌아가기</Link>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const PRIMARY = '#e91e63';

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '960px', margin: '0 auto', padding: '40px 20px' },
  header: { marginBottom: '24px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' },
  description: { fontSize: '14px', color: '#64748b', margin: 0 },
  writeButton: {
    display: 'inline-flex', alignItems: 'center', padding: '10px 20px',
    fontSize: '14px', fontWeight: 600, color: '#fff', backgroundColor: PRIMARY,
    textDecoration: 'none', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0,
  },
  toolbar: { marginBottom: '16px' },
  searchForm: { display: 'flex', gap: '8px', marginBottom: '12px' },
  searchInput: {
    flex: 1, padding: '8px 14px', fontSize: '14px', border: '1px solid #e2e8f0',
    borderRadius: '6px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box',
  } as React.CSSProperties,
  searchBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 500, color: '#fff',
    backgroundColor: PRIMARY, border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  filterRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
    flexWrap: 'wrap', marginBottom: '8px',
  } as React.CSSProperties,
  select: {
    padding: '6px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '6px',
    backgroundColor: '#fff', color: '#334155', cursor: 'pointer', outline: 'none',
  } as React.CSSProperties,
  pills: { display: 'flex', gap: '4px', flexWrap: 'wrap' } as React.CSSProperties,
  pill: {
    padding: '4px 12px', fontSize: '12px', fontWeight: 500, border: '1px solid #e2e8f0',
    borderRadius: '16px', backgroundColor: '#fff', color: '#64748b', cursor: 'pointer',
  } as React.CSSProperties,
  pillActive: { backgroundColor: PRIMARY, color: '#fff', borderColor: PRIMARY } as React.CSSProperties,
  activeFilters: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 12px', backgroundColor: '#fce4ec', borderRadius: '6px', border: '1px solid #f8bbd0',
  },
  activeLabel: { fontSize: '13px', color: '#c2185b' },
  clearBtn: {
    fontSize: '12px', color: '#c2185b', background: 'none', border: 'none',
    cursor: 'pointer', textDecoration: 'underline', padding: '2px 4px',
  } as React.CSSProperties,

  tableWrapper: {
    backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
    overflow: 'hidden', marginBottom: '8px',
  },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' } as React.CSSProperties,
  th: {
    padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#64748b',
    backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left',
  } as React.CSSProperties,
  td: {
    padding: '12px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #f1f5f9',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  row: { cursor: 'pointer', transition: 'background-color 0.1s' },
  pinnedRow: { cursor: 'pointer', backgroundColor: '#fffbeb', transition: 'background-color 0.1s' },
  badge: { display: 'inline-block', padding: '2px 8px', fontSize: '11px', fontWeight: 500, borderRadius: '4px' },
  pinnedTag: {
    display: 'inline-block', padding: '1px 6px', fontSize: '11px', fontWeight: 600,
    backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '3px', marginRight: '6px',
  },
  titleText: { fontWeight: 500 },
  commentBadge: { marginLeft: '6px', fontSize: '13px', color: PRIMARY, fontWeight: 500 },

  infoBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', marginBottom: '4px',
  },
  totalCount: { fontSize: '13px', color: '#64748b' },
  pageInfo: { fontSize: '13px', color: '#94a3b8' },

  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', padding: '24px 0',
  },
  pageBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '36px', height: '36px', padding: '0 8px',
    fontSize: '14px', fontWeight: 500, color: '#475569',
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px',
    cursor: 'pointer', transition: 'all 0.15s',
  } as React.CSSProperties,
  pageBtnActive: { backgroundColor: PRIMARY, color: '#fff', borderColor: PRIMARY },
  pageBtnDisabled: { color: '#cbd5e1', cursor: 'default', opacity: 0.5 },

  emptyCell: { padding: '60px 20px', textAlign: 'center' } as React.CSSProperties,
  emptyTitle: { fontSize: '15px', color: '#64748b', margin: '0 0 12px 0' },
  emptyBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '8px 18px',
    fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: PRIMARY,
    textDecoration: 'none', borderRadius: '6px', border: 'none', cursor: 'pointer',
  },

  errorBox: { padding: '40px 20px', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' },
  errorText: { color: '#dc2626', fontSize: '14px', margin: '0 0 12px 0' },
  retryBtn: {
    padding: '8px 18px', fontSize: '13px', fontWeight: 500, color: '#dc2626',
    backgroundColor: '#fff', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer',
  },
  skeleton: { height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' },

  footer: { marginTop: '24px', textAlign: 'center' },
  backLink: { fontSize: '14px', color: '#64748b', textDecoration: 'none' },
};

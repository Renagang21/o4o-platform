/**
 * ForumListPage - KPA Society 포럼 게시글 목록 (테이블 + 페이지네이션)
 *
 * Phase 22-F: 테이블 형태 + 20건 단위 페이지 넘김
 *
 * 컬럼: 카테고리 | 제목 | 작성자 | 작성일 | 조회 | 댓글
 * 검색 + 카테고리 필터
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/common';
import { forumApi } from '../../api';
import { colors } from '../../styles/theme';
import type { ForumPost, ForumCategory } from '../../types';

const PAGE_SIZE = 20;

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

export function ForumListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const hasFilters = !!searchQuery || !!currentCategory;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [currentPage, currentCategory, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [postsRes, categoriesRes] = await Promise.all([
        forumApi.getPosts({
          categoryId: currentCategory || undefined,
          page: currentPage,
          limit: PAGE_SIZE,
          search: searchQuery || undefined,
        }),
        forumApi.getCategories(),
      ]);

      setPosts(postsRes.data || []);
      setTotalPages(postsRes.totalPages || 1);
      setTotalCount(postsRes.total || postsRes.data?.length || 0);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.warn('Forum API not available:', err);
      setPosts([]);
      setCategories([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

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
    updateParam('search', searchInput.trim());
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
      <PageHeader
        title="포럼"
        description="회원들과 자유롭게 의견을 나눠보세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '포럼', href: '/forum' }, { label: '전체 글' }]}
      />

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
          <div style={s.categories}>
            <button
              style={{ ...s.catBtn, ...(currentCategory === '' ? s.catBtnActive : {}) }}
              onClick={() => updateParam('category', '')}
            >전체</button>
            {categories.map(cat => (
              <button
                key={cat.id}
                style={{ ...s.catBtn, ...(currentCategory === cat.id ? s.catBtnActive : {}) }}
                onClick={() => updateParam('category', cat.id)}
              >{cat.name}</button>
            ))}
          </div>
          <Link to="/forum/write" style={s.writeButton}>글쓰기</Link>
        </div>
        {hasFilters && (
          <div style={s.activeFilters}>
            <span style={s.activeLabel}>
              {searchQuery && `"${searchQuery}" `}
              {currentCategory && categories.find(c => c.id === currentCategory)?.name
                ? `${categories.find(c => c.id === currentCategory)!.name}` : ''}
            </span>
            <button onClick={handleClearAll} style={s.clearBtn}>초기화</button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead><tr>
              <th style={{ ...s.th, width: '80px' }}>카테고리</th>
              <th style={s.th}>제목</th>
              <th style={{ ...s.th, width: '100px' }}>작성자</th>
              <th style={{ ...s.th, width: '100px' }}>작성일</th>
              <th style={{ ...s.th, width: '50px' }}>조회</th>
              <th style={{ ...s.th, width: '50px' }}>댓글</th>
            </tr></thead>
            <tbody>
              {[1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={6} style={s.td}>
                  <div style={{ height: '14px', backgroundColor: colors.neutral200, borderRadius: '4px', width: `${50 + i * 8}%` }} />
                </td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <>
          {/* Info bar */}
          <div style={s.infoBar}>
            <span style={s.totalCount}>
              {hasFilters ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
            </span>
            {totalPages > 1 && (
              <span style={s.pageInfo}>{currentPage} / {totalPages} 페이지</span>
            )}
          </div>

          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: '80px' }}>카테고리</th>
                  <th style={s.th}>제목</th>
                  <th style={{ ...s.th, width: '100px' }}>작성자</th>
                  <th style={{ ...s.th, width: '100px' }}>작성일</th>
                  <th style={{ ...s.th, width: '50px' }}>조회</th>
                  <th style={{ ...s.th, width: '50px' }}>댓글</th>
                </tr>
              </thead>
              <tbody>
                {posts.length > 0 ? posts.map(post => (
                  <tr key={post.id} style={post.isPinned ? s.pinnedRow : s.row}>
                    <td style={{ ...s.td, width: '80px', textAlign: 'center' }}>
                      <span style={s.catBadge}>{post.categoryName}</span>
                    </td>
                    <td style={s.td}>
                      <Link to={`/forum/post/${post.id}`} style={s.postLink}>
                        {post.isPinned && <span style={s.pinnedTag}>공지</span>}
                        <span style={s.titleText}>{post.title}</span>
                        {post.commentCount > 0 && <span style={s.commentBadge}>[{post.commentCount}]</span>}
                      </Link>
                    </td>
                    <td style={{ ...s.td, width: '100px', color: colors.neutral500, fontSize: '13px' }}>{post.authorName}</td>
                    <td style={{ ...s.td, width: '100px', color: colors.neutral400, fontSize: '13px' }}>{formatDate(post.createdAt)}</td>
                    <td style={{ ...s.td, width: '50px', textAlign: 'center', color: colors.neutral500, fontSize: '13px' }}>{post.viewCount}</td>
                    <td style={{ ...s.td, width: '50px', textAlign: 'center', color: colors.neutral500, fontSize: '13px' }}>{post.commentCount}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={s.emptyCell}>
                      {hasFilters ? (
                        <>
                          <p style={s.emptyTitle}>검색 결과가 없습니다</p>
                          <button onClick={handleClearAll} style={s.emptyBtn}>전체 목록 보기</button>
                        </>
                      ) : (
                        <>
                          <p style={s.emptyTitle}>아직 등록된 글이 없습니다</p>
                          <Link to="/forum/write" style={s.emptyBtn}>글쓰기</Link>
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
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '0 20px 40px' },
  toolbar: { marginBottom: '16px' },
  searchForm: { display: 'flex', gap: '8px', marginBottom: '12px' },
  searchInput: {
    flex: 1, padding: '8px 14px', fontSize: '14px', border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px', outline: 'none', backgroundColor: colors.white, boxSizing: 'border-box',
  } as React.CSSProperties,
  searchBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 500, color: colors.white,
    backgroundColor: colors.primary, border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  filterRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
    flexWrap: 'wrap', marginBottom: '8px',
  } as React.CSSProperties,
  categories: { display: 'flex', gap: '8px', flexWrap: 'wrap' } as React.CSSProperties,
  catBtn: {
    padding: '6px 14px', fontSize: '13px', fontWeight: 500,
    border: `1px solid ${colors.neutral300}`, borderRadius: '20px',
    backgroundColor: colors.white, color: colors.neutral700, cursor: 'pointer',
  } as React.CSSProperties,
  catBtnActive: {
    backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white,
  },
  writeButton: {
    padding: '10px 20px', backgroundColor: colors.primary, color: colors.white,
    textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap',
  } as React.CSSProperties,
  activeFilters: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe',
  },
  activeLabel: { fontSize: '13px', color: '#1d4ed8' },
  clearBtn: {
    fontSize: '12px', color: '#1d4ed8', background: 'none', border: 'none',
    cursor: 'pointer', textDecoration: 'underline', padding: '2px 4px',
  } as React.CSSProperties,

  tableWrapper: {
    backgroundColor: colors.white, borderRadius: '8px', border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden', marginBottom: '8px',
  },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' } as React.CSSProperties,
  th: {
    padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: colors.neutral500,
    backgroundColor: colors.neutral50, borderBottom: `1px solid ${colors.neutral200}`, textAlign: 'left',
  } as React.CSSProperties,
  td: {
    padding: '12px', fontSize: '14px', color: colors.neutral900, borderBottom: `1px solid ${colors.neutral100}`,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  row: { cursor: 'pointer', transition: 'background-color 0.1s' },
  pinnedRow: { cursor: 'pointer', backgroundColor: '#fffbeb', transition: 'background-color 0.1s' },
  catBadge: {
    display: 'inline-block', padding: '2px 8px', fontSize: '11px', fontWeight: 500,
    borderRadius: '4px', backgroundColor: colors.neutral100, color: colors.neutral700,
  },
  postLink: { display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'inherit' },
  pinnedTag: {
    display: 'inline-block', padding: '1px 6px', fontSize: '11px', fontWeight: 600,
    backgroundColor: '#fef2f2', color: colors.accentRed, borderRadius: '3px', flexShrink: 0,
  },
  titleText: { fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
  commentBadge: { marginLeft: '6px', fontSize: '13px', color: colors.primary, fontWeight: 500, flexShrink: 0 },

  infoBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', marginBottom: '4px',
  },
  totalCount: { fontSize: '13px', color: colors.neutral500 },
  pageInfo: { fontSize: '13px', color: colors.neutral400 },

  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', padding: '24px 0',
  },
  pageBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '36px', height: '36px', padding: '0 8px',
    fontSize: '14px', fontWeight: 500, color: colors.neutral600,
    backgroundColor: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: '6px',
    cursor: 'pointer', transition: 'all 0.15s',
  } as React.CSSProperties,
  pageBtnActive: { backgroundColor: colors.primary, color: colors.white, borderColor: colors.primary },
  pageBtnDisabled: { color: colors.neutral300, cursor: 'default', opacity: 0.5 },

  emptyCell: { padding: '60px 20px', textAlign: 'center' } as React.CSSProperties,
  emptyTitle: { fontSize: '15px', color: colors.neutral500, margin: '0 0 12px 0' },
  emptyBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '8px 18px',
    fontSize: '13px', fontWeight: 600, color: colors.white, backgroundColor: colors.primary,
    textDecoration: 'none', borderRadius: '6px', border: 'none', cursor: 'pointer',
  },
};

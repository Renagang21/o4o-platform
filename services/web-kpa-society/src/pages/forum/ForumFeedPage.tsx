/**
 * ForumFeedPage — 포럼 게시글 피드 (/forum/:slug)
 *
 * WO-FORUM-POST-LIST-TABLE-STANDARDIZATION-V1
 * - 카드형 리스트 → BaseTable 표준 테이블 전환
 * - 태그 필터 제거, 검색 중심 통합
 * - 서버 페이지네이션 적용
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { BaseTable, RowActionMenu, type O4OColumn, type RowActionItem } from '@o4o/ui';
import { homeApi } from '../../api';
import { forumApi } from '../../api';
import { LoadingSpinner } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import type { ForumPost } from '../../types';

interface ForumDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconEmoji: string | null;
  forumType: string | null;
  tags: string[] | null;
  organizationId: string | null;
}

type SortKey = 'recent' | 'popular';

const PAGE_SIZE = 10;

const css = `
  .ff-sort-btn {
    background: none;
    border: none;
    padding: 6px 14px;
    font-size: 0.813rem;
    font-weight: 500;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
  }
  .ff-sort-btn:hover { color: #475569; background: #f1f5f9; }
  .ff-sort-btn.active { color: #2563eb; background: #eff6ff; }
`;

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

export function ForumFeedPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // URL state
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';

  // Local state
  const [forum, setForum] = useState<ForumDetail | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [forumLoading, setForumLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recent');
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Inject CSS once
  useEffect(() => {
    const id = 'forum-feed-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = css;
      document.head.appendChild(el);
    }
  }, []);

  // Sync search input with URL param
  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  // Load forum info
  useEffect(() => {
    if (!slug) return;
    setForumLoading(true);
    setError(null);
    homeApi.getForumDetail(slug, { limit: 1 })
      .then((res) => {
        if (res?.data?.forum) {
          setForum(res.data.forum);
        } else {
          setError('포럼을 찾을 수 없습니다.');
        }
      })
      .catch((err: any) => {
        if (err?.response?.status === 404) {
          setError('포럼을 찾을 수 없습니다.');
        } else {
          setError('포럼 정보를 불러오지 못했습니다.');
        }
      })
      .finally(() => setForumLoading(false));
  }, [slug]);

  // Load posts (depends on forum.id)
  const loadPosts = useCallback(async () => {
    if (!forum) return;
    setPostsLoading(true);
    try {
      const res = await forumApi.getPosts({
        forumId: forum.id,
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
      });
      setPosts(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || res.data?.length || 0);
    } catch {
      setPosts([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setPostsLoading(false);
    }
  }, [forum, currentPage, searchQuery]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Client-side sort (인기)
  const displayedPosts = useMemo(() => {
    if (sort === 'popular') {
      return [...posts].sort((a, b) =>
        ((b.viewCount || 0) + (b.likeCount || 0) * 2) - ((a.viewCount || 0) + (a.likeCount || 0) * 2),
      );
    }
    return posts;
  }, [posts, sort]);

  // URL param helpers
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

  const handleWriteClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/forum/${slug}/write` } });
    } else {
      navigate(`/forum/${slug}/write`);
    }
  };

  const handleDeletePost = useCallback(async (id: string) => {
    try {
      await forumApi.deletePost(id);
      toast.success('게시글이 삭제되었습니다');
      loadPosts();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [loadPosts]);

  // ── Columns ──
  const columns = useMemo((): O4OColumn<ForumPost>[] => [
    {
      key: 'title',
      header: '제목',
      render: (_v, row) => (
        <div>
          <Link to={`/forum/post/${row.id}`} className="flex items-center gap-1.5 no-underline text-inherit">
            {row.isPinned && <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 rounded shrink-0">공지</span>}
            <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {row.title}
            </span>
            {(row.commentCount ?? 0) > 0 && (
              <span className="ml-1.5 text-xs text-primary font-medium shrink-0">[{row.commentCount}]</span>
            )}
          </Link>
          {Array.isArray((row as any).tags) && (row as any).tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {((row as any).tags as string[]).slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-[11px] font-medium rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'authorName',
      header: '작성자',
      width: '100px',
      render: (val) => (
        <span className="text-xs text-slate-500">{val || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '100px',
      render: (val) => (
        <span className="text-xs text-slate-400">{formatDate(val)}</span>
      ),
    },
    {
      key: 'viewCount',
      header: '조회',
      width: '60px',
      align: 'center',
      render: (val) => (
        <span className="text-xs text-slate-500">{val ?? 0}</span>
      ),
    },
    {
      key: 'commentCount',
      header: '댓글',
      width: '60px',
      align: 'center',
      render: (val) => (
        <span className="text-xs text-slate-500">{val ?? 0}</span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: '52px',
      align: 'center',
      system: true,
      render: (_v, row) => {
        const isOwner = !!(user && row.authorId === user.id);
        if (!isOwner) return null;
        const actions: RowActionItem[] = [
          {
            key: 'edit',
            label: '수정',
            onClick: () => navigate(`/forum/edit/${row.id}`),
          },
          {
            key: 'delete',
            label: '삭제',
            variant: 'danger',
            onClick: () => handleDeletePost(row.id),
            confirm: {
              title: '게시글 삭제',
              message: '이 게시글을 삭제하시겠습니까?',
              variant: 'danger',
            },
          },
        ];
        return <RowActionMenu actions={actions} />;
      },
    },
  ], [user, navigate, handleDeletePost]);

  // ── Pagination numbers ──
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  // ── Empty message ──
  const emptyMessage = (
    <div className="py-16 px-5 text-center">
      {searchQuery ? (
        <>
          <p className="text-sm text-slate-500 mb-3 mt-0">검색 결과가 없습니다</p>
          <button
            onClick={() => { setSearchInput(''); updateParam('search', ''); }}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary rounded-md border-none cursor-pointer"
          >전체 보기</button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-3 mt-0">아직 등록된 글이 없습니다</p>
          <p className="text-xs text-slate-400 mb-4 mt-0">첫 글을 작성해서 대화를 시작해보세요</p>
          {isAuthenticated && (
            <button onClick={handleWriteClick} className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-md border-none cursor-pointer">
              첫 글 작성하기
            </button>
          )}
        </>
      )}
    </div>
  );

  // ── Render ──

  if (forumLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <div style={styles.errorWrap}>
        <h2 style={styles.errorTitle}>{error}</h2>
        <Link to="/forum" style={styles.backLink}>← 포럼 홈으로</Link>
      </div>
    );
  }
  if (!forum) return null;

  return (
    <div style={styles.page}>
      {/* Forum header */}
      <header style={styles.header}>
        <div style={styles.titleRow}>
          {forum.iconEmoji && <span style={styles.icon}>{forum.iconEmoji}</span>}
          <h1 style={styles.title}>{forum.name}</h1>
        </div>
        {forum.description && <p style={styles.desc}>{forum.description}</p>}
        {forum.tags && forum.tags.length > 0 && (
          <div style={styles.forumTagRow}>
            {forum.tags.map((t) => (
              <span key={t} style={styles.forumTag}>#{t}</span>
            ))}
          </div>
        )}
        <Link to="/forum" style={styles.backLink}>← 포럼 홈</Link>
      </header>

      {/* Search + Write */}
      <div className="flex gap-2 mt-5 mb-3">
        <form className="flex gap-2 flex-1" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목, 내용, 태그, 작성자 검색"
            className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-md outline-none bg-white"
          />
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary border-none rounded-md cursor-pointer whitespace-nowrap">검색</button>
        </form>
        <button onClick={handleWriteClick} style={styles.writeBtn}>+ 글쓰기</button>
      </div>

      {/* Sort tabs + info */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-1">
          <button
            className={`ff-sort-btn${sort === 'recent' ? ' active' : ''}`}
            onClick={() => setSort('recent')}
          >최신</button>
          <button
            className={`ff-sort-btn${sort === 'popular' ? ' active' : ''}`}
            onClick={() => setSort('popular')}
          >인기</button>
        </div>
        {!postsLoading && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {searchQuery ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
            </span>
            {totalPages > 1 && (
              <span className="text-xs text-slate-400">{currentPage} / {totalPages} 페이지</span>
            )}
          </div>
        )}
      </div>

      {/* Search active indicator */}
      {searchQuery && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-blue-50 rounded-md border border-blue-200">
          <span className="text-xs text-blue-700">"{searchQuery}" 검색 결과</span>
          <button
            onClick={() => { setSearchInput(''); updateParam('search', ''); }}
            className="text-xs text-blue-700 bg-transparent border-none cursor-pointer underline px-1 py-0.5"
          >전체 보기</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
        <BaseTable<ForumPost>
          columns={columns}
          data={displayedPosts}
          rowKey={(row) => row.id}
          emptyMessage={emptyMessage}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 py-6">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1}
            className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
              currentPage === 1 ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
            }`}>&laquo;</button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
            className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
              currentPage === 1 ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
            }`}>&lsaquo;</button>
          {pageNumbers.map(p => (
            <button key={p} onClick={() => goToPage(p)}
              className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all cursor-pointer ${
                p === currentPage ? 'bg-primary text-white border-primary' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }`}>{p}</button>
          ))}
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
            className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
              currentPage === totalPages ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
            }`}>&rsaquo;</button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
            className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
              currentPage === totalPages ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
            }`}>&raquo;</button>
        </div>
      )}
    </div>
  );
}

export default ForumFeedPage;

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 800, margin: '0 auto', padding: '0 16px' },
  header: { borderBottom: '1px solid #e2e8f0', padding: '32px 0 24px', marginBottom: 0 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  icon: { fontSize: 28 },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  desc: { fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' },
  forumTagRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 16 },
  forumTag: {
    fontSize: '0.8125rem', color: '#1d4ed8', backgroundColor: '#eff6ff',
    borderRadius: 4, padding: '3px 8px',
  },
  writeBtn: {
    padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600,
    color: '#fff', backgroundColor: '#2563eb', border: 'none',
    borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  backLink: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
  errorWrap: { textAlign: 'center', padding: '64px 16px' },
  errorTitle: { fontSize: '1.25rem', color: '#475569', marginBottom: 16 },
};

/**
 * ForumListPage - KPA Society 포럼 게시글 목록
 *
 * WO-O4O-FORUM-CATEGORY-REMOVE-AND-ORPHAN-CLEANUP-V1:
 * 카테고리 구조 제거 — 단일 피드 뷰, 검색만 지원
 *
 * WO-O4O-FORUM-TAG-UX-AND-SEARCH-V1:
 * 태그 필터 + 인기 태그 바 추가
 *
 * WO-O4O-FORUM-LIST-DESIGN-REFINEMENT-V1:
 * inline style → Tailwind, hardcoded hex → theme class
 *
 * 컬럼: 제목 (태그 포함) | 작성자 | 작성일 | 👍 | 👁 | 💬 | 액션
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, Trash2, Sparkles, Tag } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { BaseTable, ActionBar, RowActionMenu, PageSection, PageContainer, type O4OColumn, type ActionBarAction, type RowActionItem } from '@o4o/ui';
import { PageHeader } from '../../components/common';
import { forumApi } from '../../api';
import { useAuth } from '../../contexts';
import type { ForumPost } from '../../types';
import { buildAiClipboardText, stripHtml, blocksToText } from '../../utils/ai-clipboard';

const PAGE_SIZE = 10;

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
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';
  const activeTag = searchParams.get('tag') || '';
  const hasFilters = !!(searchQuery || activeTag);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  // Load popular tags once on mount
  useEffect(() => {
    forumApi.getPopularTags(15)
      .then((res) => { if (res?.data) setPopularTags(res.data); })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const postsRes = await forumApi.getPosts({
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        tag: activeTag || undefined,
      });
      setPosts(postsRes.data || []);
      setTotalPages(postsRes.totalPages || 1);
      setTotalCount(postsRes.total || postsRes.data?.length || 0);
    } catch {
      setPosts([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, activeTag]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
    setSelectedKeys(new Set());
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

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      updateParam('tag', '');
    } else {
      const next = new URLSearchParams(searchParams);
      next.set('tag', tag);
      next.delete('page');
      setSearchParams(next);
      setSelectedKeys(new Set());
    }
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams({});
    setSelectedKeys(new Set());
  };

  const handleDeletePost = useCallback(async (id: string) => {
    try {
      await forumApi.deletePost(id);
      toast.success('게시글이 삭제되었습니다');
      setSelectedKeys((prev) => { const next = new Set(prev); next.delete(id); return next; });
      loadData();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [loadData]);

  const handleBulkCopy = useCallback(() => {
    const urls = Array.from(selectedKeys)
      .map((id) => `${window.location.origin}/forum/post/${id}`)
      .join('\n');
    navigator.clipboard.writeText(urls)
      .then(() => toast.success(`${selectedKeys.size}개 링크가 복사되었습니다`))
      .catch(() => toast.error('복사에 실패했습니다'));
  }, [selectedKeys]);

  const handleBulkAiCopy = useCallback(() => {
    const selected = posts.filter((post) => selectedKeys.has(post.id));
    const aiItems = selected.map((post, i) => {
      const rawContent = post.content;
      const content = Array.isArray(rawContent)
        ? blocksToText(rawContent)
        : stripHtml(String(rawContent || post.excerpt || ''));
      return {
        index: i + 1,
        title: post.title,
        url: `${window.location.origin}/forum/post/${post.id}`,
        content,
      };
    });
    const text = buildAiClipboardText(aiItems);
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${selected.length}개 AI용 텍스트가 복사되었습니다`))
      .catch(() => toast.error('복사에 실패했습니다'));
  }, [selectedKeys, posts]);

  const handleBulkDelete = useCallback(async () => {
    try {
      await Promise.all(Array.from(selectedKeys).map((id) => forumApi.deletePost(id)));
      toast.success(`${selectedKeys.size}개가 삭제되었습니다`);
      setSelectedKeys(new Set());
      loadData();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [selectedKeys, loadData]);


  // ── Columns ──

  const columns = useMemo((): O4OColumn<ForumPost>[] => [
    {
      key: 'title',
      header: '제목',
      render: (_v, row) => (
        <div>
          <Link to={`/forum/post/${row.id}`} className="flex items-center gap-1.5 no-underline text-inherit">
            {row.isPinned && <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 rounded shrink-0">공지</span>}
            <span className={`font-medium overflow-hidden text-ellipsis whitespace-nowrap ${row.isPinned ? 'bg-amber-50' : ''}`}>
              {row.title}
            </span>
            {(row.commentCount ?? 0) > 0 && (
              <span className="ml-1.5 text-xs text-primary font-medium shrink-0">[{row.commentCount}]</span>
            )}
          </Link>
          {Array.isArray((row as any).tags) && (row as any).tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {((row as any).tags as string[]).slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => { e.stopPropagation(); handleTagClick(tag); }}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-xl border cursor-pointer transition-all ${
                    activeTag === tag
                      ? 'bg-primary border-primary text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  #{tag}
                </button>
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
      header: '작성일',
      width: '100px',
      render: (val) => (
        <span className="text-xs text-slate-400">{formatDate(val)}</span>
      ),
    },
    {
      key: 'likeCount',
      header: '👍',
      width: '50px',
      align: 'center',
      render: (val) => (
        <span className="text-xs text-slate-500">{(val ?? 0) > 0 ? val : ''}</span>
      ),
    },
    {
      key: 'viewCount',
      header: '👁',
      width: '50px',
      align: 'center',
      render: (val) => (
        <span className="text-xs text-slate-500">{val ?? 0}</span>
      ),
    },
    {
      key: 'commentCount',
      header: '💬',
      width: '50px',
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
  ], [user, navigate, handleDeletePost, activeTag]);

  // ── Bulk Actions ──

  const bulkActions: ActionBarAction[] = [
    {
      key: 'copy',
      label: '링크 복사',
      icon: <Link2 size={14} />,
      onClick: handleBulkCopy,
    },
    {
      key: 'ai_copy',
      label: 'AI용 텍스트 복사',
      icon: <Sparkles size={14} />,
      onClick: handleBulkAiCopy,
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      icon: <Trash2 size={14} />,
      onClick: handleBulkDelete,
      confirm: {
        title: '삭제 확인',
        message: `선택한 ${selectedKeys.size}개를 삭제하시겠습니까?`,
        variant: 'danger',
      },
    },
  ];

  // ── Empty Message ──

  const emptyMessage = (
    <div className="py-16 px-5 text-center">
      {hasFilters ? (
        <>
          <p className="text-sm text-slate-500 mb-3 mt-0">검색 결과가 없습니다</p>
          <button onClick={handleClearAll} className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary rounded-md border-none cursor-pointer">전체 보기</button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-3 mt-0">아직 등록된 글이 없습니다</p>
          {user && (
            <Link to="/forum/write" className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary rounded-md no-underline">글쓰기</Link>
          )}
        </>
      )}
    </div>
  );

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

  return (
    <PageSection last>
      <PageContainer>
      <PageHeader
        title="포럼"
        description="회원들과 자유롭게 의견을 나눠보세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '포럼', href: '/forum' }, { label: '전체 글' }]}
      />

      {/* Popular Tags Bar */}
      {popularTags.length > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-lg flex-wrap">
          <span className="inline-flex items-center text-xs font-semibold text-slate-500 whitespace-nowrap shrink-0">
            <Tag size={12} style={{ marginRight: '4px' }} />
            인기 태그
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {popularTags.map(({ tag }) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`px-2.5 py-0.5 text-xs font-medium rounded-xl border cursor-pointer transition-all ${
                  activeTag === tag
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-slate-300 text-slate-600'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-4">
        <form className="flex gap-2 mb-3" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-md outline-none bg-white"
          />
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary border-none rounded-md cursor-pointer whitespace-nowrap">검색</button>
        </form>
        <div className="flex justify-between items-center gap-2 flex-wrap mb-2">
          {user && (
            <Link to="/forum/write" className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-md no-underline whitespace-nowrap ml-auto">글쓰기</Link>
          )}
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-primary-50 rounded-md border border-primary-200">
            <span className="text-xs text-primary-700">
              {searchQuery && `"${searchQuery}"`}
              {searchQuery && activeTag && ' + '}
              {activeTag && `#${activeTag}`}
            </span>
            <button onClick={handleClearAll} className="text-xs text-primary-700 bg-transparent border-none cursor-pointer underline px-1 py-0.5">전체 보기</button>
          </div>
        )}
      </div>

      {/* Bulk ActionBar */}
      {selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={bulkActions}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

      {/* Info bar */}
      {!loading && (
        <div className="flex justify-between items-center py-2 mb-1">
          <span className="text-xs text-slate-500">
            {hasFilters ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">{currentPage} / {totalPages} 페이지</span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
        <BaseTable<ForumPost>
          columns={columns}
          data={posts}
          rowKey={(row) => row.id}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
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
      </PageContainer>
    </PageSection>
  );
}

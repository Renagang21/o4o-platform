/**
 * ForumListPage - KPA Society 포럼 게시글 목록
 *
 * WO-O4O-FORUM-CATEGORY-REMOVE-AND-ORPHAN-CLEANUP-V1:
 * 카테고리 구조 제거 — 단일 피드 뷰, 검색만 지원
 *
 * WO-O4O-FORUM-TAG-UX-AND-SEARCH-V1:
 * 태그 필터 + 인기 태그 바 추가
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
import { colors } from '../../styles/theme';
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
          <Link to={`/forum/post/${row.id}`} style={s.postLink}>
            {row.isPinned && <span style={s.pinnedTag}>공지</span>}
            <span style={{
              ...s.titleText,
              backgroundColor: row.isPinned ? '#fffbeb' : undefined,
            }}>
              {row.title}
            </span>
            {(row.commentCount ?? 0) > 0 && (
              <span style={s.commentBadge}>[{row.commentCount}]</span>
            )}
          </Link>
          {Array.isArray((row as any).tags) && (row as any).tags.length > 0 && (
            <div style={s.tagRow}>
              {((row as any).tags as string[]).slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => { e.stopPropagation(); handleTagClick(tag); }}
                  style={{
                    ...s.tagChip,
                    ...(activeTag === tag ? s.tagChipActive : {}),
                  }}
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
        <span style={{ fontSize: '13px', color: colors.neutral500 }}>{val || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '작성일',
      width: '100px',
      render: (val) => (
        <span style={{ fontSize: '13px', color: colors.neutral400 }}>{formatDate(val)}</span>
      ),
    },
    {
      key: 'likeCount',
      header: '👍',
      width: '50px',
      align: 'center',
      render: (val) => (
        <span style={{ fontSize: '13px', color: colors.neutral500 }}>{(val ?? 0) > 0 ? val : ''}</span>
      ),
    },
    {
      key: 'viewCount',
      header: '👁',
      width: '50px',
      align: 'center',
      render: (val) => (
        <span style={{ fontSize: '13px', color: colors.neutral500 }}>{val ?? 0}</span>
      ),
    },
    {
      key: 'commentCount',
      header: '💬',
      width: '50px',
      align: 'center',
      render: (val) => (
        <span style={{ fontSize: '13px', color: colors.neutral500 }}>{val ?? 0}</span>
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
    <div style={s.emptyCell}>
      {hasFilters ? (
        <>
          <p style={s.emptyTitle}>검색 결과가 없습니다</p>
          <button onClick={handleClearAll} style={s.emptyBtn}>전체 보기</button>
        </>
      ) : (
        <>
          <p style={s.emptyTitle}>아직 등록된 글이 없습니다</p>
          {user && (
            <Link to="/forum/write" style={s.emptyBtn}>글쓰기</Link>
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
        <div style={s.popularTagsBar}>
          <span style={s.popularTagsLabel}>
            <Tag size={12} style={{ marginRight: '4px' }} />
            인기 태그
          </span>
          <div style={s.popularTagsList}>
            {popularTags.map(({ tag }) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                style={{
                  ...s.popularTagBtn,
                  ...(activeTag === tag ? s.popularTagBtnActive : {}),
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

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
          {user && (
            <Link to="/forum/write" style={{ ...s.writeButton, marginLeft: 'auto' }}>글쓰기</Link>
          )}
        </div>
        {hasFilters && (
          <div style={s.activeFilters}>
            <span style={s.activeLabel}>
              {searchQuery && `"${searchQuery}"`}
              {searchQuery && activeTag && ' + '}
              {activeTag && `#${activeTag}`}
            </span>
            <button onClick={handleClearAll} style={s.clearBtn}>전체 보기</button>
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
        <div style={s.infoBar}>
          <span style={s.totalCount}>
            {hasFilters ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
          </span>
          {totalPages > 1 && (
            <span style={s.pageInfo}>{currentPage} / {totalPages} 페이지</span>
          )}
        </div>
      )}

      {/* Table */}
      <div style={s.tableWrapper}>
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
      </PageContainer>
    </PageSection>
  );
}

// ============================================================================
// Styles
// ============================================================================

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '0 20px 40px' },
  popularTagsBar: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', marginBottom: '12px',
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  popularTagsLabel: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0,
  } as React.CSSProperties,
  popularTagsList: { display: 'flex', gap: '6px', flexWrap: 'wrap' } as React.CSSProperties,
  popularTagBtn: {
    padding: '3px 10px', fontSize: '12px', fontWeight: 500,
    border: '1px solid #cbd5e1', borderRadius: '12px',
    backgroundColor: '#fff', color: '#475569', cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  popularTagBtnActive: {
    backgroundColor: colors.primary, borderColor: colors.primary, color: '#fff',
  },
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
  infoBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', marginBottom: '4px',
  },
  totalCount: { fontSize: '13px', color: colors.neutral500 },
  pageInfo: { fontSize: '13px', color: colors.neutral400 },
  tableWrapper: {
    backgroundColor: colors.white, borderRadius: '8px', border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden', marginBottom: '8px',
  },
  postLink: { display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'inherit' },
  pinnedTag: {
    display: 'inline-block', padding: '1px 6px', fontSize: '11px', fontWeight: 600,
    backgroundColor: '#fef2f2', color: colors.accentRed, borderRadius: '3px', flexShrink: 0,
  },
  titleText: { fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
  commentBadge: { marginLeft: '6px', fontSize: '13px', color: colors.primary, fontWeight: 500, flexShrink: 0 },
  tagRow: { display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' } as React.CSSProperties,
  tagChip: {
    padding: '2px 8px', fontSize: '11px', fontWeight: 500,
    border: '1px solid #e2e8f0', borderRadius: '10px',
    backgroundColor: '#f8fafc', color: '#64748b', cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  tagChipActive: {
    backgroundColor: colors.primary, borderColor: colors.primary, color: '#fff',
  },
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

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
 * WO-O4O-KPA-FORUM-ALL-SEARCH-AND-FILTER-UX-V1:
 * 포럼 선택 Combobox + 게시글 검색(q) + URL 상태 유지
 *
 * 컬럼: 제목 (태그 포함) | 작성자 | 작성일 | 👍 | 👁 | 💬 | 액션
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, Trash2, Sparkles, Tag, AlertCircle, RefreshCw, ChevronDown, X } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { BaseTable, ActionBar, RowActionMenu, PageSection, PageContainer, Card, type O4OColumn, type ActionBarAction, type RowActionItem } from '@o4o/ui';
import { PageHeader } from '../../components/common';
import { forumApi } from '../../api';
import { appreciationApi } from '../../api/appreciation';
import { useAuth } from '../../contexts';
import type { ForumInfo, ForumPost } from '../../types';
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

// ── ForumCombobox ──────────────────────────────────────────────────────────

interface ForumComboboxProps {
  forums: Pick<ForumInfo, 'id' | 'name' | 'slug'>[];
  value: string;
  onChange: (forumId: string) => void;
}

function ForumCombobox({ forums, value, onChange }: ForumComboboxProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = forums.find((f) => f.id === value);
  const displayLabel = selected ? selected.name : '전체 포럼';

  const filtered = filterText
    ? forums.filter((f) => f.name.toLowerCase().includes(filterText.toLowerCase()))
    : forums;

  // Click outside closes
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilterText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => {
      if (!prev) setTimeout(() => inputRef.current?.focus(), 10);
      return !prev;
    });
    setFilterText('');
  };

  const handleSelect = (forumId: string) => {
    onChange(forumId);
    setOpen(false);
    setFilterText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setFilterText(''); }
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[140px] max-w-[200px] whitespace-nowrap"
      >
        <span className="flex-1 text-left truncate text-slate-700">{displayLabel}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-lg"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="px-2 pt-2 pb-1">
            <input
              ref={inputRef}
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="포럼 검색..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30 bg-slate-50"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  !value ? 'font-semibold text-primary' : 'text-slate-700'
                }`}
              >
                전체 포럼
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">검색 결과 없음</li>
            ) : (
              filtered.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(f.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                      value === f.id ? 'font-semibold text-primary bg-primary-50' : 'text-slate-700'
                    }`}
                  >
                    {f.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── ForumListPage ──────────────────────────────────────────────────────────

export function ForumListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // URL params
  // WO-O4O-KPA-FORUM-ALL-SEARCH-AND-FILTER-UX-V1:
  //   q — 게시글 검색 (search 하위 호환 유지)
  //   forum — 포럼 필터 (forumId)
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
  const activeTag = searchParams.get('tag') || '';
  const forumParam = searchParams.get('forum') || '';
  const hasFilters = !!(searchQuery || activeTag || forumParam);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [forums, setForums] = useState<Pick<ForumInfo, 'id' | 'name' | 'slug'>[]>([]);
  // WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1
  const [appreciationMap, setAppreciationMap] = useState<Record<string, number>>({});

  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  // Load popular tags once on mount
  useEffect(() => {
    forumApi.getPopularTags(15)
      .then((res) => { if (res?.data) setPopularTags(res.data); })
      .catch(() => {});
  }, []);

  // Load forum list once on mount (WO-O4O-KPA-FORUM-ALL-SEARCH-AND-FILTER-UX-V1)
  useEffect(() => {
    forumApi.getCategories()
      .then((res) => { if (res?.data) setForums(res.data); })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const postsRes = await forumApi.getPosts({
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        tag: activeTag || undefined,
        forumId: forumParam || undefined,
      }) as any;

      // WO-O4O-KPA-FORUM-ERROR-MASKING-REMOVAL-AND-POST-VISIBILITY-FIX-V1:
      // Backend는 top-level total/page/totalPages + pagination 객체 둘 다 반환.
      // top-level 우선, fallback으로 pagination 객체 읽기.
      const data: ForumPost[] = postsRes.data ?? [];
      const total: number = postsRes.total ?? postsRes.totalCount ?? data.length;
      const pages: number = postsRes.totalPages ?? postsRes.pagination?.totalPages ?? 1;

      setPosts(data);
      setTotalPages(pages);
      setTotalCount(total);
    } catch (e: any) {
      // WO-O4O-KPA-FORUM-ERROR-MASKING-REMOVAL-AND-POST-VISIBILITY-FIX-V1:
      // 에러를 조용히 빈 배열로 숨기지 않음 — 사용자에게 원인 표시
      const msg = e?.message ?? '게시글을 불러오는 중 오류가 발생했습니다';
      setError(msg);
      setPosts([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, activeTag, forumParam]);

  useEffect(() => { loadData(); }, [loadData]);

  // WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1: posts 변경 시 감사 총액 배치 로드
  useEffect(() => {
    if (posts.length === 0) return;
    Promise.allSettled(posts.map((p) => appreciationApi.getSummary('forum_post', p.id))).then((results) => {
      const map: Record<string, number> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.data?.totalAmount > 0) {
          map[posts[i].id] = r.value.data.totalAmount;
        }
      });
      setAppreciationMap(map);
    });
  }, [posts]);

  // ── URL param helpers ──

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('search'); // migrate old `search` param → `q`
    setSearchParams(next);
    setSelectedKeys(new Set());
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    const next = new URLSearchParams(searchParams);
    if (p === 1) next.delete('page'); else next.set('page', String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim(), page: '' });
  };

  const handleTagClick = (tag: string) => {
    updateParams({ tag: activeTag === tag ? '' : tag, page: '' });
  };

  const handleForumChange = (forumId: string) => {
    updateParams({ forum: forumId, page: '' });
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams({});
    setSelectedKeys(new Set());
  };

  // ── Post actions ──

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
            <span className={`font-medium line-clamp-2 ${row.isPinned ? 'bg-amber-50' : ''}`}>
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
      key: '_appreciation',
      header: '🎁',
      width: '60px',
      align: 'center',
      render: (_v, row) => {
        const amt = appreciationMap[row.id];
        return amt ? <span className="text-xs font-medium" style={{ color: '#92400e' }}>{amt >= 1000 ? `${(amt / 1000).toFixed(1)}k` : amt}P</span> : null;
      },
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
  ], [user, navigate, handleDeletePost, activeTag, appreciationMap]);

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

  const selectedForumName = forums.find((f) => f.id === forumParam)?.name;

  const emptyMessage = (
    <div className="py-16 px-5 text-center">
      {hasFilters ? (
        <>
          <p className="text-sm text-slate-500 mb-1 mt-0">검색 결과가 없습니다</p>
          <p className="text-xs text-slate-400 mb-3">검색어나 필터를 변경해 주세요</p>
          <button onClick={handleClearAll} className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary rounded-md border-none cursor-pointer">전체 보기</button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-3 mt-0">등록된 게시글이 없습니다</p>
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

  // Active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (forumParam && selectedForumName) {
    activeChips.push({ label: selectedForumName, onRemove: () => handleForumChange('') });
  }
  if (searchQuery) {
    activeChips.push({ label: `"${searchQuery}"`, onRemove: () => updateParams({ q: '', page: '' }) });
  }
  if (activeTag) {
    activeChips.push({ label: `#${activeTag}`, onRemove: () => updateParams({ tag: '', page: '' }) });
  }

  return (
    <PageSection last>
      <PageContainer>
      <PageHeader
        title="포럼"
        description="회원들과 자유롭게 의견을 나눠보세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '포럼', href: '/forum' }, { label: '전체 글' }]}
      />

      {/* WO-O4O-KPA-FORUM-ERROR-MASKING-REMOVAL-AND-POST-VISIBILITY-FIX-V1: 에러 표시 */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span className="text-sm flex-1">{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 bg-transparent border-none cursor-pointer"
          >
            <RefreshCw size={12} />
            다시 시도
          </button>
        </div>
      )}

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

      {/* Search + Forum Filter (WO-O4O-KPA-FORUM-ALL-SEARCH-AND-FILTER-UX-V1) */}
      <div className="mb-4">
        <form
          className="flex flex-col sm:flex-row gap-2 mb-3"
          onSubmit={handleSearchSubmit}
        >
          {/* 포럼 선택 Combobox */}
          <ForumCombobox
            forums={forums}
            value={forumParam}
            onChange={handleForumChange}
          />

          {/* 제목/내용 검색 */}
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목 또는 내용 검색"
            className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-md outline-none bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary border-none rounded-md cursor-pointer whitespace-nowrap"
          >
            검색
          </button>
        </form>

        {/* 글쓰기 버튼 */}
        {user && (
          <div className="flex justify-end mb-2">
            <Link
              to="/forum/write"
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-md no-underline whitespace-nowrap"
            >
              글쓰기
            </Link>
          </div>
        )}

        {/* 활성 필터 칩 */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-primary-50 rounded-md border border-primary-200">
            <span className="text-xs text-primary-600 font-medium shrink-0">필터:</span>
            {activeChips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-white border border-primary-200 text-primary-700 rounded-full"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center justify-center w-3.5 h-3.5 text-primary-400 hover:text-primary-700 bg-transparent border-none cursor-pointer p-0"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={handleClearAll}
              className="ml-auto text-xs text-primary-600 bg-transparent border-none cursor-pointer underline px-1 py-0.5"
            >
              전체 초기화
            </button>
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
            {hasFilters
              ? `검색 결과 ${totalCount}건`
              : `총 ${totalCount}개의 게시글`}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">{currentPage} / {totalPages} 페이지</span>
          )}
        </div>
      )}

      {/* Desktop: Table */}
      <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
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

      {/* Mobile: Card List (WO-O4O-RESPONSIVE-LIST-V1) */}
      <div className="block md:hidden mb-2">
        {posts.length === 0 && !loading ? (
          emptyMessage
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <Link key={post.id} to={`/forum/post/${post.id}`} className="no-underline text-inherit">
                <Card className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col gap-2">
                    {/* Title row */}
                    <div className="flex items-start gap-1.5">
                      {post.isPinned && (
                        <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 rounded shrink-0 mt-0.5">공지</span>
                      )}
                      <span className="text-sm font-medium text-slate-800 line-clamp-2">
                        {post.title}
                        {(post.commentCount ?? 0) > 0 && (
                          <span className="ml-1 text-xs text-primary font-medium">[{post.commentCount}]</span>
                        )}
                      </span>
                    </div>

                    {/* Tags */}
                    {Array.isArray((post as any).tags) && (post as any).tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {((post as any).tags as string[]).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-xl border ${
                              activeTag === tag
                                ? 'bg-primary border-primary text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        {post.authorName || '-'} · {formatDate(post.createdAt)}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {(post.likeCount ?? 0) > 0 && <span>👍 {post.likeCount}</span>}
                        <span>👁 {post.viewCount ?? 0}</span>
                        {(post.commentCount ?? 0) > 0 && <span>💬 {post.commentCount}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
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

/**
 * ForumPage - K-Cosmetics 포럼 게시글 목록 (테이블 + 페이지네이션)
 *
 * Phase 22-F: 테이블 형태 + 20건 단위 페이지 넘김
 * WO-O4O-FORUM-LIST-DESIGN-REFINEMENT-V1: inline style → Tailwind, hardcoded hex → theme
 *
 * 컬럼: 유형 | 제목 | 작성자 | 작성일 | 좋아요 | 댓글
 * 검색 + 유형 필터 + 정렬
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
// WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1: 공통 목록 컴포넌트
import { ForumListTemplate } from '@o4o/shared-space-ui';
import {
  fetchForumPosts,
  fetchPinnedPosts,
  normalizePostType,
  getAuthorName,
  type ForumPost as ApiForumPost,
} from '../../services/forumApi';
import type { ForumPostType } from '@o4o/types/forum';
// WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1: 공통 표시 타입
import type { ForumListItem } from '@o4o/shared-space-ui';

type PostType = ForumPostType;
type DisplayPost = ForumListItem;

function toDisplayPost(post: ApiForumPost): DisplayPost {
  const valid: PostType[] = ['discussion', 'question', 'announcement', 'poll', 'guide'];
  const normalized = normalizePostType(post.type).toLowerCase() as PostType;
  return {
    id: post.id,
    title: post.title,
    postType: valid.includes(normalized) ? normalized : 'discussion',
    authorName: getAuthorName(post),
    isPinned: post.isPinned,
    commentCount: post.commentCount || 0,
    likeCount: post.likeCount || 0,
    createdAt: post.createdAt,
    routeTo: `/forum/post/${post.id}`,
  };
}


const TYPE_BADGES: Record<PostType, { label: string; className: string }> = {
  announcement: { label: '공지', className: 'bg-red-50 text-red-600' },
  question: { label: '질문', className: 'bg-green-50 text-green-600' },
  guide: { label: '가이드', className: 'bg-yellow-50 text-yellow-600' },
  discussion: { label: '토론', className: 'bg-blue-50 text-blue-600' },
  poll: { label: '투표', className: 'bg-purple-50 text-purple-600' },
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
          if (typeFilter) results = results.filter(p => p.postType === typeFilter);

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

          if (typeFilter) regular = regular.filter(p => p.postType === typeFilter);

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

  const handlePostClick = (post: DisplayPost) => navigate(post.routeTo);

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


  return (
    <PageSection last>
      <PageContainer>
      {/* Header */}
      <header className="mb-6">
        <div className="flex justify-between items-start gap-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2 mt-0">K-Cosmetics 커뮤니티</h1>
            <p className="text-sm text-slate-500 m-0">K-Cosmetics에 대한 질문과 의견을 나누는 공간입니다.</p>
          </div>
          <Link to="/forum" className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg no-underline whitespace-nowrap shrink-0">글쓰기</Link>
        </div>
      </header>

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
          <div className="flex gap-1 flex-wrap">
            {TYPE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateParam('type', value)}
                className={`px-3 py-1 text-xs font-medium rounded-full border cursor-pointer transition-colors ${
                  typeFilter === value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => updateParam('sort', e.target.value === 'latest' ? '' : e.target.value)} className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 outline-none cursor-pointer">
            {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-primary-50 rounded-md border border-primary-200">
            <span className="text-xs text-primary-700">
              {searchQuery && `"${searchQuery}" `}
              {typeFilter && TYPE_FILTERS.find(t => t.value === typeFilter)?.label
                ? `${TYPE_FILTERS.find(t => t.value === typeFilter)!.label} ` : ''}
              {sortBy !== 'latest' && SORT_OPTIONS.find(o => o.value === sortBy)?.label || ''}
            </span>
            <button onClick={handleClearAll} className="text-xs text-primary-700 bg-transparent border-none cursor-pointer underline px-1 py-0.5">초기화</button>
          </div>
        )}
      </div>

      {/* Info bar */}
      {!isLoading && !error && (
        <div className="flex justify-between items-center py-2 mb-1">
          <span className="text-xs text-slate-500">
            {hasFilters ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">{currentPage} / {totalPages} 페이지</span>
          )}
        </div>
      )}

      {/* WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1: 공통 목록 컴포넌트 */}
      <ForumListTemplate
        posts={posts}
        pinnedPosts={!hasFilters ? pinnedPosts : undefined}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        onPostClick={handlePostClick}
        loading={isLoading}
        error={error}
        onRetry={() => window.location.reload()}
        showPostType
        accentColor="var(--color-primary)"
        renderTypeBadge={(post) => {
          const badge = TYPE_BADGES[post.postType ?? 'discussion'];
          return <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded ${badge.className}`}>{badge.label}</span>;
        }}
        renderEmpty={() => (hasFilters ? (
          <>
            <p className="text-sm text-slate-500 mb-3 mt-0">검색 결과가 없습니다</p>
            <button onClick={handleClearAll} className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary rounded-md border-none cursor-pointer">전체 목록 보기</button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-3 mt-0">아직 등록된 글이 없습니다</p>
            <Link to="/forum" className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary rounded-md no-underline border-none">글쓰기</Link>
          </>
        ))}
      />

      {/* Footer */}
      <div className="mt-6 text-center">
        <Link to="/" className="text-sm text-slate-500 no-underline hover:text-primary">&larr; 홈으로 돌아가기</Link>
      </div>
      </PageContainer>
    </PageSection>
  );
}

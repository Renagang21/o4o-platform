/**
 * ForumListView - Forum Post List Component
 *
 * Displays a list of forum posts with filtering, sorting, and pagination.
 * Uses CSS variables for theming (cosmetics theme support).
 */

'use client';

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getForumPosts,
  getForumCategories,
  type ForumPost,
  type ForumCategory,
} from '@/lib/cms/client';
import { formatRelativeTime } from './utils';

interface ForumListViewProps {
  categorySlug?: string;
  tagSlug?: string;
  postsPerPage?: number;
  viewMode?: 'list' | 'card';
  showFilter?: boolean;
  showSidebar?: boolean;
}

export function ForumListView({
  categorySlug,
  tagSlug,
  postsPerPage = 20,
  viewMode = 'list',
  showFilter = true,
  showSidebar = true,
}: ForumListViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = (searchParams.get('sort') as 'newest' | 'oldest' | 'popular' | 'commented') || 'newest';
  const search = searchParams.get('q') || '';

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [postsData, categoriesData] = await Promise.all([
          getForumPosts({
            categorySlug,
            tag: tagSlug,
            sortBy,
            search: search || undefined,
            limit: postsPerPage,
            page: currentPage,
          }),
          showSidebar ? getForumCategories() : Promise.resolve([]),
        ]);

        setPosts(postsData.posts);
        setTotalPosts(postsData.total);
        setHasMore(postsData.hasMore);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading forum list:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [categorySlug, tagSlug, sortBy, search, currentPage, postsPerPage, showSidebar]);

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.delete('page');
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const totalPages = Math.ceil(totalPosts / postsPerPage);

  return (
    <div className="forum-list py-6">
      <div className={showSidebar ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}>
        {/* Main Content */}
        <div className={showSidebar ? 'lg:col-span-3' : ''}>
          {/* Filter Bar */}
          {showFilter && (
            <div
              className="rounded-lg border p-4 mb-6"
              style={{
                backgroundColor: 'var(--forum-bg-primary)',
                borderColor: 'var(--forum-border-light)',
              }}
            >
              <div className="flex flex-wrap gap-4 items-center justify-between">
                {/* Search */}
                <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
                  <div className="relative">
                    <input
                      type="text"
                      name="search"
                      placeholder="검색어를 입력하세요..."
                      defaultValue={search}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--forum-bg-secondary)',
                        borderColor: 'var(--forum-border-medium)',
                        color: 'var(--forum-text-primary)',
                      }}
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded"
                      style={{ color: 'var(--forum-text-muted)' }}
                    >
                      🔍
                    </button>
                  </div>
                </form>

                {/* Sort Options */}
                <div className="flex gap-2">
                  {[
                    { value: 'newest', label: '최신순' },
                    { value: 'popular', label: '인기순' },
                    { value: 'commented', label: '댓글순' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className="px-3 py-1 rounded-lg text-sm transition-colors"
                      style={{
                        backgroundColor: sortBy === option.value
                          ? 'var(--forum-primary)'
                          : 'var(--forum-bg-tertiary)',
                        color: sortBy === option.value
                          ? '#ffffff'
                          : 'var(--forum-text-secondary)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--forum-primary)]"></div>
            </div>
          ) : posts.length === 0 ? (
            /* Empty State */
            <div
              className="text-center py-12 rounded-lg border"
              style={{
                backgroundColor: 'var(--forum-bg-secondary)',
                borderColor: 'var(--forum-border-light)',
              }}
            >
              <p style={{ color: 'var(--forum-text-muted)' }}>게시글이 없습니다.</p>
              {search && (
                <p className="text-sm mt-1" style={{ color: 'var(--forum-text-muted)' }}>
                  다른 검색어로 시도해보세요.
                </p>
              )}
            </div>
          ) : (
            /* Post List */
            <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} viewMode={viewMode} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasMore={hasMore}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="lg:col-span-1">
            <Sidebar categories={categories} currentCategorySlug={categorySlug} />
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, viewMode }: { post: ForumPost; viewMode: 'list' | 'card' }) {
  const isListMode = viewMode === 'list';

  return (
    <Link
      to={`/forum/post/${post.slug || post.id}`}
      className={`block rounded-lg border p-4 transition-shadow hover:shadow-md ${isListMode ? '' : 'h-full'}`}
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
        boxShadow: 'var(--forum-shadow-sm)',
      }}
    >
      <div className={isListMode ? 'flex items-start gap-4' : ''}>
        {/* Author Avatar */}
        <div
          className={`rounded-full flex items-center justify-center text-sm font-medium overflow-hidden flex-shrink-0 ${isListMode ? 'w-10 h-10' : 'w-8 h-8 mb-3'}`}
          style={{
            backgroundColor: 'var(--forum-bg-tertiary)',
            color: 'var(--forum-text-secondary)',
          }}
        >
          {post.author?.avatar ? (
            <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (post.author?.name || '익명').charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.isPinned && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--forum-badge-pinned-bg)',
                  color: 'var(--forum-badge-pinned-text)',
                }}
              >
                고정
              </span>
            )}
            {post.isLocked && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--forum-badge-locked-bg)',
                  color: 'var(--forum-badge-locked-text)',
                }}
              >
                잠금
              </span>
            )}
            {post.categoryName && (
              <span className="text-xs" style={{ color: 'var(--forum-text-link)' }}>
                {post.categoryName}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold truncate" style={{ color: 'var(--forum-text-primary)' }}>
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--forum-text-secondary)' }}>
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div
            className="flex items-center gap-3 mt-2 text-xs flex-wrap"
            style={{ color: 'var(--forum-text-muted)' }}
          >
            <span>{post.author?.name || '익명'}</span>
            <span>{formatRelativeTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
            <span>댓글 {post.commentCount}</span>
            {post.likeCount > 0 && <span>❤️ {post.likeCount}</span>}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: 'var(--forum-bg-tertiary)', color: 'var(--forum-text-muted)' }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function Pagination({
  currentPage,
  totalPages,
  hasMore,
  searchParams,
  setSearchParams,
}: {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
}) {
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      {currentPage > 1 && (
        <button
          onClick={() => goToPage(currentPage - 1)}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--forum-bg-tertiary)',
            color: 'var(--forum-text-secondary)',
          }}
        >
          이전
        </button>
      )}

      <span className="px-4 py-2" style={{ color: 'var(--forum-text-muted)' }}>
        {currentPage} / {totalPages}
      </span>

      {hasMore && (
        <button
          onClick={() => goToPage(currentPage + 1)}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--forum-primary)',
            color: '#ffffff',
          }}
        >
          다음
        </button>
      )}
    </div>
  );
}

function Sidebar({
  categories,
  currentCategorySlug,
}: {
  categories: ForumCategory[];
  currentCategorySlug?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--forum-bg-primary)',
          borderColor: 'var(--forum-border-light)',
        }}
      >
        <h3 className="font-semibold mb-3" style={{ color: 'var(--forum-text-primary)' }}>
          카테고리
        </h3>
        <ul className="space-y-2">
          <li>
            <Link
              to="/forum/list"
              className={`block px-3 py-2 rounded-lg transition-colors ${!currentCategorySlug ? 'font-medium' : ''}`}
              style={{
                backgroundColor: !currentCategorySlug ? 'var(--forum-bg-highlight)' : 'transparent',
                color: !currentCategorySlug ? 'var(--forum-primary)' : 'var(--forum-text-secondary)',
              }}
            >
              전체
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/forum/category/${category.slug}`}
                className={`block px-3 py-2 rounded-lg transition-colors ${currentCategorySlug === category.slug ? 'font-medium' : ''}`}
                style={{
                  backgroundColor: currentCategorySlug === category.slug ? 'var(--forum-bg-highlight)' : 'transparent',
                  color: currentCategorySlug === category.slug ? 'var(--forum-primary)' : 'var(--forum-text-secondary)',
                }}
              >
                <span className="flex items-center justify-between">
                  <span>{category.name}</span>
                  <span className="text-xs" style={{ color: 'var(--forum-text-muted)' }}>
                    {category.postCount}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Write Post Button */}
      <Link
        to="/forum/write"
        className="block w-full text-center px-4 py-3 rounded-lg font-medium transition-colors"
        style={{
          backgroundColor: 'var(--forum-primary)',
          color: '#ffffff',
        }}
      >
        글쓰기
      </Link>
    </div>
  );
}

export default ForumListView;

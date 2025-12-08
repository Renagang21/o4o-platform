/**
 * CosmeticsForumListView - Cosmetics Forum List with Enhanced Filtering
 *
 * Specialized forum list view for cosmetics posts with:
 * - Skin type filtering
 * - Concerns multi-select
 * - Brand filtering
 * - Product-based filtering
 * - Cosmetics-themed card display
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getCosmeticsForumPosts,
  getForumCategories,
  type CosmeticsForumPost,
  type CosmeticsForumFilters,
  type ForumCategory,
} from '@/lib/cms/client';
import { CosmeticsFilterBar, type CosmeticsFilters } from './CosmeticsFilterBar';
import { formatRelativeTime } from './utils';

interface CosmeticsForumListViewProps {
  categorySlug?: string;
  productId?: string;
  postsPerPage?: number;
  viewMode?: 'list' | 'card' | 'gallery';
  showFilter?: boolean;
  showSidebar?: boolean;
}

// Skin type labels
const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

export function CosmeticsForumListView({
  categorySlug,
  productId,
  postsPerPage = 20,
  viewMode: initialViewMode = 'list',
  showFilter = true,
  showSidebar = true,
}: CosmeticsForumListViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<CosmeticsForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'gallery'>(initialViewMode);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Build filters from URL params
  const getFiltersFromParams = useCallback((): CosmeticsForumFilters => ({
    categorySlug,
    productId: productId || searchParams.get('productId') || undefined,
    skinType: searchParams.get('skinType') || undefined,
    concerns: searchParams.get('concerns')?.split(',').filter(Boolean) || undefined,
    brand: searchParams.get('brand') || undefined,
    search: searchParams.get('q') || undefined,
    sortBy: (searchParams.get('sort') as CosmeticsForumFilters['sortBy']) || 'newest',
    limit: postsPerPage,
    page: currentPage,
  }), [categorySlug, productId, searchParams, postsPerPage, currentPage]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const filters = getFiltersFromParams();
        const [postsData, categoriesData] = await Promise.all([
          getCosmeticsForumPosts(filters),
          showSidebar ? getForumCategories() : Promise.resolve([]),
        ]);

        setPosts(postsData.posts);
        setTotalPosts(postsData.total);
        setHasMore(postsData.hasMore);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading cosmetics forum list:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [getFiltersFromParams, showSidebar]);

  const handleFilterChange = (_filters: CosmeticsFilters) => {
    // Filters are already synced to URL by CosmeticsFilterBar
    // This callback is for any additional side effects
  };

  const totalPages = Math.ceil(totalPosts / postsPerPage);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="cosmetics-forum-list py-6">
      <div className={showSidebar ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}>
        {/* Main Content */}
        <div className={showSidebar ? 'lg:col-span-3' : ''}>
          {/* Filter Bar */}
          {showFilter && (
            <CosmeticsFilterBar
              onFilterChange={handleFilterChange}
              showSearch={true}
              showBrandFilter={true}
            />
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mt-4 mb-4">
            <p className="text-sm" style={{ color: 'var(--forum-text-muted)' }}>
              {totalPosts > 0 ? `${totalPosts}개의 게시글` : ''}
            </p>
            <div className="flex gap-1">
              {(['list', 'card', 'gallery'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="px-2 py-1 rounded text-sm"
                  style={{
                    backgroundColor: viewMode === mode ? 'var(--forum-primary)' : 'var(--forum-bg-tertiary)',
                    color: viewMode === mode ? '#ffffff' : 'var(--forum-text-muted)',
                  }}
                >
                  {mode === 'list' ? '목록' : mode === 'card' ? '카드' : '갤러리'}
                </button>
              ))}
            </div>
          </div>

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
              <p className="text-lg mb-2" style={{ color: 'var(--forum-text-secondary)' }}>
                게시글이 없습니다
              </p>
              <p className="text-sm" style={{ color: 'var(--forum-text-muted)' }}>
                필터 조건을 변경하거나 첫 번째 글을 작성해보세요!
              </p>
            </div>
          ) : (
            /* Post List */
            <div
              className={
                viewMode === 'gallery'
                  ? 'grid grid-cols-2 md:grid-cols-3 gap-3'
                  : viewMode === 'card'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    : 'space-y-3'
              }
            >
              {posts.map((post) => (
                <CosmeticsPostCard key={post.id} post={post} viewMode={viewMode} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
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
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="lg:col-span-1">
            <CosmeticsSidebar categories={categories} currentCategorySlug={categorySlug} />
          </div>
        )}
      </div>
    </div>
  );
}

function CosmeticsPostCard({
  post,
  viewMode,
}: {
  post: CosmeticsForumPost;
  viewMode: 'list' | 'card' | 'gallery';
}) {
  const metadata = post.cosmeticsMetadata;

  if (viewMode === 'gallery') {
    return (
      <Link
        to={`/forum/post/${post.slug || post.id}`}
        className="block rounded-lg overflow-hidden transition-shadow hover:shadow-lg aspect-square relative"
        style={{
          backgroundColor: 'var(--forum-bg-tertiary)',
        }}
      >
        {/* Thumbnail or placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">💄</span>
        </div>
        {/* Overlay with title */}
        <div
          className="absolute bottom-0 left-0 right-0 p-2"
          style={{
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          }}
        >
          <p className="text-sm font-medium text-white line-clamp-2">{post.title}</p>
        </div>
        {/* Skin type badge */}
        {metadata?.skinType && (
          <div className="absolute top-2 left-2">
            <SkinTypeBadge skinType={metadata.skinType} size="sm" />
          </div>
        )}
      </Link>
    );
  }

  const isListMode = viewMode === 'list';

  return (
    <Link
      to={`/forum/post/${post.slug || post.id}`}
      className={`block rounded-lg border p-4 transition-all hover:shadow-md ${isListMode ? '' : 'h-full'}`}
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
          {/* Badges Row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
            {metadata?.skinType && <SkinTypeBadge skinType={metadata.skinType} />}
            {post.categoryName && (
              <span className="text-xs" style={{ color: 'var(--forum-text-link)' }}>
                {post.categoryName}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold line-clamp-2" style={{ color: 'var(--forum-text-primary)' }}>
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--forum-text-secondary)' }}>
              {post.excerpt}
            </p>
          )}

          {/* Concerns Tags */}
          {metadata?.concerns && metadata.concerns.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {metadata.concerns.slice(0, 3).map((concern) => (
                <span
                  key={concern}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: 'var(--forum-bg-highlight)',
                    color: 'var(--forum-primary)',
                  }}
                >
                  {concern}
                </span>
              ))}
              {metadata.concerns.length > 3 && (
                <span className="text-xs" style={{ color: 'var(--forum-text-muted)' }}>
                  +{metadata.concerns.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Meta */}
          <div
            className="flex items-center gap-3 mt-2 text-xs flex-wrap"
            style={{ color: 'var(--forum-text-muted)' }}
          >
            <span>{post.author?.name || '익명'}</span>
            <span>{formatRelativeTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
            <span>💬 {post.commentCount}</span>
            {post.likeCount > 0 && <span>❤️ {post.likeCount}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkinTypeBadge({ skinType, size = 'md' }: { skinType: string; size?: 'sm' | 'md' }) {
  const label = SKIN_TYPE_LABELS[skinType] || skinType;
  const colors: Record<string, { bg: string; text: string }> = {
    dry: { bg: '#fef3c7', text: '#b45309' },
    oily: { bg: '#dcfce7', text: '#166534' },
    combination: { bg: '#e0e7ff', text: '#3730a3' },
    sensitive: { bg: '#fce7f3', text: '#9d174d' },
    normal: { bg: '#f3f4f6', text: '#374151' },
  };
  const style = colors[skinType] || colors.normal;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

function CosmeticsSidebar({
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
        <ul className="space-y-1">
          <li>
            <Link
              to="/forum/cosmetics"
              className={`block px-3 py-2 rounded-lg transition-colors text-sm ${!currentCategorySlug ? 'font-medium' : ''}`}
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
                className={`block px-3 py-2 rounded-lg transition-colors text-sm ${currentCategorySlug === category.slug ? 'font-medium' : ''}`}
                style={{
                  backgroundColor:
                    currentCategorySlug === category.slug ? 'var(--forum-bg-highlight)' : 'transparent',
                  color:
                    currentCategorySlug === category.slug
                      ? 'var(--forum-primary)'
                      : 'var(--forum-text-secondary)',
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

      {/* Quick Filters */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--forum-bg-primary)',
          borderColor: 'var(--forum-border-light)',
        }}
      >
        <h3 className="font-semibold mb-3" style={{ color: 'var(--forum-text-primary)' }}>
          인기 태그
        </h3>
        <div className="flex flex-wrap gap-2">
          {['리뷰', '추천', '비교', '튜토리얼', '신제품'].map((tag) => (
            <Link
              key={tag}
              to={`/forum/tag/${tag}`}
              className="px-2 py-1 rounded-full text-xs transition-colors hover:opacity-80"
              style={{
                backgroundColor: 'var(--forum-bg-tertiary)',
                color: 'var(--forum-text-secondary)',
              }}
            >
              #{tag}
            </Link>
          ))}
        </div>
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
        ✍️ 글쓰기
      </Link>
    </div>
  );
}

export default CosmeticsForumListView;

/**
 * CosmeticsProductForumPosts
 *
 * Displays a paginated list of forum posts for a specific product.
 * Supports pagination and filtering options.
 */

import React, { useEffect, useState, useCallback } from 'react';

export interface ProductForumPostsProps {
  productId: string;
  pageSize?: number;
  showFilters?: boolean;
  apiBaseUrl?: string;
  className?: string;
  onPostClick?: (postId: string) => void;
}

interface ForumPost {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  createdAt: string;
  viewCount?: number;
  author?: {
    id?: string;
    nickname?: string;
    avatar?: string;
  };
  cosmeticsMeta?: {
    rating?: number;
    skinType?: string;
    concerns?: string;
    brand?: string;
    productName?: string;
    isVerifiedPurchase?: boolean;
    isFeatured?: boolean;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Skin type label mapping
const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

// Concern label mapping
const CONCERN_LABELS: Record<string, string> = {
  pores: '모공',
  whitening: '미백',
  wrinkles: '주름',
  elasticity: '탄력',
  acne: '여드름',
  redness: '홍조',
  dead_skin: '각질',
  spots: '잡티',
  dark_circles: '다크서클',
};

export const CosmeticsProductForumPosts: React.FC<ProductForumPostsProps> = ({
  productId,
  pageSize = 10,
  showFilters = true,
  apiBaseUrl = '/api/v1',
  className = '',
  onPostClick,
}) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'createdAt' | 'rating'>('createdAt');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder: 'DESC',
      });

      const response = await fetch(
        `${apiBaseUrl}/cosmetics/forum/product/${productId}/posts?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setPosts(result.data || []);
        setPagination(result.pagination || null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[CosmeticsProductForumPosts] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [productId, currentPage, pageSize, sortBy, apiBaseUrl]);

  useEffect(() => {
    if (productId) {
      fetchPosts();
    }
  }, [fetchPosts, productId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSortBy: 'createdAt' | 'rating') => {
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={i < rating ? 'text-yellow-400' : 'text-gray-300'}
      >
        &#9733;
      </span>
    ));
  };

  const renderConcerns = (concernsStr: string) => {
    const concerns = concernsStr.split(',').filter(Boolean);
    return concerns.slice(0, 3).map(concern => (
      <span
        key={concern}
        className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs mr-1"
      >
        {CONCERN_LABELS[concern.trim()] || concern.trim()}
      </span>
    ));
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const { page, totalPages } = pagination;

    // Always show first page
    pages.push(1);

    if (page > 3) {
      pages.push('...');
    }

    // Show pages around current page
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (page < totalPages - 2) {
      pages.push('...');
    }

    // Always show last page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return (
      <div className="flex justify-center items-center gap-1 mt-6">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          이전
        </button>
        {pages.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              onClick={() => handlePageChange(p)}
              className={`w-8 h-8 rounded text-sm ${
                p === page
                  ? 'bg-pink-500 text-white'
                  : 'border border-gray-300 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-2 text-gray-400">
              {p}
            </span>
          )
        )}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          다음
        </button>
      </div>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <div className={`cosmetics-product-forum-posts ${className}`}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse border rounded-lg p-4">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`cosmetics-product-forum-posts ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchPosts}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`cosmetics-product-forum-posts ${className}`}>
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          포럼 리뷰
          {pagination && (
            <span className="text-sm text-gray-500 font-normal ml-2">
              ({pagination.total}개)
            </span>
          )}
        </h3>
        {showFilters && (
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => handleSortChange(e.target.value as 'createdAt' | 'rating')}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="createdAt">최신순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
        )}
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">아직 작성된 리뷰가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">첫 번째 리뷰를 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <article
              key={post.id}
              onClick={() => onPostClick?.(post.id)}
              className={`border border-gray-200 rounded-lg p-4 ${
                onPostClick ? 'cursor-pointer hover:bg-gray-50' : ''
              } transition-colors`}
            >
              {/* Post header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 hover:text-pink-600">
                    {post.cosmeticsMeta?.isFeatured && (
                      <span className="inline-block mr-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                        추천
                      </span>
                    )}
                    {post.title}
                  </h4>
                </div>
                {post.cosmeticsMeta?.rating && (
                  <div className="flex items-center shrink-0">
                    {renderStars(post.cosmeticsMeta.rating)}
                  </div>
                )}
              </div>

              {/* Post content excerpt */}
              {(post.excerpt || post.content) && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {post.excerpt || post.content?.substring(0, 200)}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                {/* Author */}
                <span className="text-gray-600">
                  {post.author?.nickname || '익명'}
                </span>

                {/* Skin type */}
                {post.cosmeticsMeta?.skinType && (
                  <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded">
                    {SKIN_TYPE_LABELS[post.cosmeticsMeta.skinType] || post.cosmeticsMeta.skinType}
                  </span>
                )}

                {/* Concerns */}
                {post.cosmeticsMeta?.concerns && renderConcerns(post.cosmeticsMeta.concerns)}

                {/* Verified purchase */}
                {post.cosmeticsMeta?.isVerifiedPurchase && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                    인증구매
                  </span>
                )}

                {/* Spacer */}
                <span className="flex-1" />

                {/* View count */}
                {post.viewCount !== undefined && (
                  <span className="text-gray-400">
                    조회 {post.viewCount}
                  </span>
                )}

                {/* Date */}
                <span className="text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {renderPagination()}

      {/* Loading overlay for page changes */}
      {loading && posts.length > 0 && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
          <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
};

export default CosmeticsProductForumPosts;

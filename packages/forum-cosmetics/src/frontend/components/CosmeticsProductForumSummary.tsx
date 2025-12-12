/**
 * CosmeticsProductForumSummary
 *
 * Displays a summary of forum activity for a specific product.
 * Designed to be embedded in product detail pages.
 * Shows: average rating, rating distribution, review count, top concerns, and recent posts.
 */

import React, { useEffect, useState } from 'react';

export interface ProductForumSummaryProps {
  productId: string;
  maxPosts?: number;
  showRatingBreakdown?: boolean;
  showConcerns?: boolean;
  showSkinTypes?: boolean;
  apiBaseUrl?: string;
  className?: string;
  onViewAllClick?: () => void;
}

interface ForumPostData {
  id: string;
  title: string;
  excerpt?: string;
  createdAt: string;
  author?: {
    nickname?: string;
  };
  cosmeticsMeta?: {
    rating?: number;
    skinType?: string;
    concerns?: string;
    isVerifiedPurchase?: boolean;
  };
}

interface ProductForumSummary {
  productId: string;
  avgRating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
  topConcerns: string[];
  topSkinTypes: string[];
  verifiedPurchaseCount: number;
  latestPosts: ForumPostData[];
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

export const CosmeticsProductForumSummary: React.FC<ProductForumSummaryProps> = ({
  productId,
  maxPosts = 3,
  showRatingBreakdown = true,
  showConcerns = true,
  showSkinTypes = true,
  apiBaseUrl = '/api/v1',
  className = '',
  onViewAllClick,
}) => {
  const [summary, setSummary] = useState<ProductForumSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchSummary();
    }
  }, [productId, apiBaseUrl]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/cosmetics/forum/product/${productId}/summary`);

      if (!response.ok) {
        throw new Error(`Failed to fetch forum summary: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Limit latest posts to maxPosts
        const data = result.data as ProductForumSummary;
        if (data.latestPosts && data.latestPosts.length > maxPosts) {
          data.latestPosts = data.latestPosts.slice(0, maxPosts);
        }
        setSummary(data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[CosmeticsProductForumSummary] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load forum summary');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="text-yellow-400">&#9733;</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="text-yellow-400">&#9733;</span>);
      } else {
        stars.push(<span key={i} className="text-gray-300">&#9733;</span>);
      }
    }
    return stars;
  };

  const renderRatingBar = (count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`cosmetics-product-forum-summary ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-200 rounded" />
          <div className="space-y-2">
            {Array.from({ length: maxPosts }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`cosmetics-product-forum-summary ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary || summary.reviewCount === 0) {
    return (
      <div className={`cosmetics-product-forum-summary ${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500">아직 작성된 리뷰가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">첫 번째 리뷰를 작성해보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cosmetics-product-forum-summary ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          뷰티 포럼 리뷰
          <span className="text-sm text-gray-500 font-normal ml-2">
            ({summary.reviewCount}개)
          </span>
        </h3>
        {onViewAllClick && (
          <button
            onClick={onViewAllClick}
            className="text-sm text-pink-500 hover:text-pink-600 font-medium"
          >
            전체보기 &rarr;
          </button>
        )}
      </div>

      {/* Rating Overview */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-6">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800">
              {summary.avgRating.toFixed(1)}
            </div>
            <div className="flex justify-center mt-1">
              {renderStars(summary.avgRating)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.verifiedPurchaseCount > 0 && (
                <span className="text-green-600">
                  인증구매 {summary.verifiedPurchaseCount}건
                </span>
              )}
            </div>
          </div>

          {/* Rating Distribution */}
          {showRatingBreakdown && (
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-gray-600">{star}점</span>
                  <div className="flex-1">
                    {renderRatingBar(
                      summary.ratingDistribution[star] || 0,
                      summary.reviewCount
                    )}
                  </div>
                  <span className="w-8 text-right text-gray-400 text-xs">
                    {summary.ratingDistribution[star] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skin Types & Concerns */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4">
          {showSkinTypes && summary.topSkinTypes.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-500">주요 피부타입:</span>
              {summary.topSkinTypes.slice(0, 3).map(type => (
                <span
                  key={type}
                  className="inline-block ml-2 px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs"
                >
                  {SKIN_TYPE_LABELS[type] || type}
                </span>
              ))}
            </div>
          )}
          {showConcerns && summary.topConcerns.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-500">주요 고민:</span>
              {summary.topConcerns.slice(0, 3).map(concern => (
                <span
                  key={concern}
                  className="inline-block ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                >
                  {CONCERN_LABELS[concern] || concern}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Latest Posts */}
      {summary.latestPosts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">최근 리뷰</h4>
          {summary.latestPosts.map(post => (
            <div
              key={post.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-800 truncate">
                    {post.title}
                  </h5>
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                {post.cosmeticsMeta?.rating && (
                  <div className="flex items-center shrink-0">
                    <span className="text-yellow-400">&#9733;</span>
                    <span className="text-sm font-medium ml-1">
                      {post.cosmeticsMeta.rating}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {post.author?.nickname && (
                  <span>{post.author.nickname}</span>
                )}
                {post.cosmeticsMeta?.skinType && (
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                    {SKIN_TYPE_LABELS[post.cosmeticsMeta.skinType] || post.cosmeticsMeta.skinType}
                  </span>
                )}
                {post.cosmeticsMeta?.isVerifiedPurchase && (
                  <span className="text-green-600 font-medium">인증구매</span>
                )}
                <span className="ml-auto">
                  {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CosmeticsProductForumSummary;

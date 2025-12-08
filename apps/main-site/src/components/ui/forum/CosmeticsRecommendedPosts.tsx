/**
 * CosmeticsRecommendedPosts - Related/Recommended Posts Component
 *
 * Shows recommended cosmetics forum posts based on:
 * - Same product
 * - Same skin type
 * - Similar concerns
 * - Popular posts
 */

'use client';

import { useState, useEffect } from 'react';
import { getCosmeticsForumPosts, type CosmeticsForumPost } from '@/lib/cms/client';
import { CosmeticsReviewCard, type CosmeticsReviewData } from './CosmeticsReviewCard';

interface CosmeticsRecommendedPostsProps {
  currentPostId: string;
  currentPost: {
    skinType?: string;
    concerns?: string[];
    productId?: string;
    brand?: string;
    categoryId?: string;
  };
  limit?: number;
  title?: string;
  showTabs?: boolean;
}

type RecommendationType = 'related' | 'similar' | 'popular';

// Convert CosmeticsForumPost to CosmeticsReviewData
function postToReview(post: CosmeticsForumPost): CosmeticsReviewData {
  const cosmetics = post.cosmeticsMetadata || {};
  const author = post.author;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    authorName: author?.name || '익명',
    authorAvatar: author?.avatar,
    createdAt: post.createdAt,
    rating: undefined, // Rating not in CosmeticsPostMetadata
    skinType: cosmetics.skinType,
    concerns: cosmetics.concerns,
    productName: undefined, // Product name not in CosmeticsPostMetadata
    brand: cosmetics.brand,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    viewCount: post.viewCount,
    helpfulCount: post.likeCount, // Use like count as helpful indicator
    isHelpful: false,
  };
}

export function CosmeticsRecommendedPosts({
  currentPostId,
  currentPost,
  limit = 5,
  title = '추천 리뷰',
  showTabs = false,
}: CosmeticsRecommendedPostsProps) {
  const [posts, setPosts] = useState<CosmeticsForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RecommendationType>('related');

  useEffect(() => {
    async function loadRecommendations() {
      setLoading(true);
      try {
        // Load recommendations based on current post attributes
        const result = await getCosmeticsForumPosts({
          skinType: currentPost.skinType,
          concerns: currentPost.concerns,
          categoryId: currentPost.categoryId,
          sortBy: 'popular',
          limit: limit + 1, // Get extra to filter out current
        });

        // Filter out current post
        const filtered = result.posts
          .filter((p) => p.id !== currentPostId)
          .slice(0, limit);

        setPosts(filtered);
      } catch (error) {
        console.error('Error loading recommended posts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRecommendations();
  }, [currentPostId, currentPost, limit]);

  const tabs: { key: RecommendationType; label: string }[] = [
    { key: 'related', label: '관련 리뷰' },
    { key: 'similar', label: '비슷한 피부' },
    { key: 'popular', label: '인기 리뷰' },
  ];

  if (loading) {
    return (
      <div
        className="cosmetics-recommended-posts p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--forum-bg-primary)',
          borderColor: 'var(--forum-border-light)',
        }}
      >
        <h3
          className="font-semibold mb-4"
          style={{ color: 'var(--forum-text-primary)' }}
        >
          {title}
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg p-3"
              style={{ backgroundColor: 'var(--forum-bg-tertiary)' }}
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null; // Don't show if no recommendations
  }

  return (
    <div
      className="cosmetics-recommended-posts p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-semibold"
          style={{ color: 'var(--forum-text-primary)' }}
        >
          {title}
        </h3>

        {showTabs && (
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor:
                    activeTab === tab.key
                      ? 'var(--forum-primary)'
                      : 'var(--forum-bg-tertiary)',
                  color:
                    activeTab === tab.key
                      ? '#ffffff'
                      : 'var(--forum-text-secondary)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Post List */}
      <div className="space-y-3">
        {posts.map((post) => (
          <CosmeticsReviewCard
            key={post.id}
            review={postToReview(post)}
            variant="compact"
            showActions={false}
          />
        ))}
      </div>

      {/* More Link */}
      <div className="mt-4 text-center">
        <a
          href="/forum/cosmetics"
          className="text-sm hover:underline"
          style={{ color: 'var(--forum-text-link)' }}
        >
          더 많은 리뷰 보기 →
        </a>
      </div>
    </div>
  );
}

/**
 * CosmeticsRelatedProducts - Shows related products based on current review
 */
interface RelatedProduct {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  averageRating?: number;
  reviewCount: number;
}

interface CosmeticsRelatedProductsProps {
  currentProductId?: string;
  brand?: string;
  limit?: number;
}

export function CosmeticsRelatedProducts({
  currentProductId,
  brand,
  limit = 4,
}: CosmeticsRelatedProductsProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        // TODO: Implement product API integration
        // For now, show placeholder
        setProducts([]);
      } catch (error) {
        console.error('Error loading related products:', error);
      } finally {
        setLoading(false);
      }
    }

    if (currentProductId || brand) {
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [currentProductId, brand, limit]);

  if (loading) {
    return (
      <div
        className="cosmetics-related-products p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--forum-bg-primary)',
          borderColor: 'var(--forum-border-light)',
        }}
      >
        <h3
          className="font-semibold mb-4"
          style={{ color: 'var(--forum-text-primary)' }}
        >
          관련 제품
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg p-2"
              style={{ backgroundColor: 'var(--forum-bg-tertiary)' }}
            >
              <div className="aspect-square bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div
      className="cosmetics-related-products p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      <h3
        className="font-semibold mb-4"
        style={{ color: 'var(--forum-text-primary)' }}
      >
        관련 제품
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <a
            key={product.id}
            href={`/products/${product.id}`}
            className="block rounded-lg border p-2 transition-shadow hover:shadow-sm"
            style={{
              backgroundColor: 'var(--forum-bg-secondary)',
              borderColor: 'var(--forum-border-light)',
            }}
          >
            {/* Product Image */}
            <div
              className="aspect-square rounded-lg mb-2 flex items-center justify-center"
              style={{ backgroundColor: 'var(--forum-bg-tertiary)' }}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span
                  className="text-2xl"
                  style={{ color: 'var(--forum-text-muted)' }}
                >
                  ?
                </span>
              )}
            </div>

            {/* Product Info */}
            <div>
              <p
                className="text-xs"
                style={{ color: 'var(--forum-text-muted)' }}
              >
                {product.brand}
              </p>
              <p
                className="text-sm font-medium line-clamp-2"
                style={{ color: 'var(--forum-text-primary)' }}
              >
                {product.name}
              </p>
              {product.averageRating && (
                <div className="flex items-center gap-1 mt-1">
                  <span style={{ color: '#fbbf24' }}>★</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--forum-text-secondary)' }}
                  >
                    {product.averageRating.toFixed(1)}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--forum-text-muted)' }}
                  >
                    ({product.reviewCount})
                  </span>
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default CosmeticsRecommendedPosts;

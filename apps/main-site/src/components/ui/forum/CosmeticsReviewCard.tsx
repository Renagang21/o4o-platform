/**
 * CosmeticsReviewCard - Product Review Card Component
 *
 * Displays a cosmetics product review with rating, skin type,
 * and helpful indicators. Used in cosmetics forum views.
 */

'use client';

// Skin type display mapping
const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

const SKIN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  dry: { bg: '#fef3c7', text: '#b45309' },
  oily: { bg: '#dbeafe', text: '#1e40af' },
  combination: { bg: '#e0e7ff', text: '#3730a3' },
  sensitive: { bg: '#fce7f3', text: '#9d174d' },
  normal: { bg: '#dcfce7', text: '#166534' },
};

export interface CosmeticsReviewData {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  rating?: number;
  skinType?: string;
  concerns?: string[];
  productName?: string;
  brand?: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isHelpful?: boolean;
  helpfulCount?: number;
}

interface CosmeticsReviewCardProps {
  review: CosmeticsReviewData;
  variant?: 'default' | 'compact' | 'featured';
  showActions?: boolean;
  onHelpfulClick?: (reviewId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 30) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

const RatingStars = ({
  rating,
  size = 'md',
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  return (
    <div className={`inline-flex items-center gap-0.5 ${sizeClasses[size]}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{ color: star <= rating ? '#fbbf24' : '#d1d5db' }}
        >
          ★
        </span>
      ))}
      <span
        className="ml-1 font-medium"
        style={{ color: 'var(--forum-text-secondary)' }}
      >
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

const SkinTypeBadge = ({ skinType }: { skinType: string }) => {
  const colors = SKIN_TYPE_COLORS[skinType] || { bg: '#f3f4f6', text: '#374151' };
  const label = SKIN_TYPE_LABELS[skinType] || skinType;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
};

export function CosmeticsReviewCard({
  review,
  variant = 'default',
  showActions = true,
  onHelpfulClick,
}: CosmeticsReviewCardProps) {
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <div
      className={`cosmetics-review-card rounded-lg border transition-shadow hover:shadow-md ${
        isFeatured ? 'ring-2 ring-pink-200' : ''
      } ${isCompact ? 'p-3' : 'p-4'}`}
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: isFeatured
          ? 'var(--forum-primary)'
          : 'var(--forum-border-light)',
      }}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-3"
          style={{
            backgroundColor: 'var(--forum-primary-light)',
            color: 'var(--forum-primary)',
          }}
        >
          <span>BEST</span>
        </div>
      )}

      {/* Header */}
      <div className={`flex items-start gap-3 ${isCompact ? 'mb-2' : 'mb-3'}`}>
        {/* Avatar */}
        <div
          className={`rounded-full flex items-center justify-center font-medium overflow-hidden flex-shrink-0 ${
            isCompact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
          }`}
          style={{
            backgroundColor: 'var(--forum-bg-tertiary)',
            color: 'var(--forum-text-secondary)',
          }}
        >
          {review.authorAvatar ? (
            <img
              src={review.authorAvatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            review.authorName?.charAt(0).toUpperCase() || 'U'
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Author & Date */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-medium text-sm"
              style={{ color: 'var(--forum-text-primary)' }}
            >
              {review.authorName || '익명'}
            </span>
            {review.skinType && <SkinTypeBadge skinType={review.skinType} />}
            <span
              className="text-xs"
              style={{ color: 'var(--forum-text-muted)' }}
            >
              {formatRelativeTime(review.createdAt)}
            </span>
          </div>

          {/* Rating */}
          {review.rating && (
            <div className="mt-1">
              <RatingStars rating={review.rating} size={isCompact ? 'sm' : 'md'} />
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      {(review.productName || review.brand) && (
        <div
          className={`${isCompact ? 'mb-2' : 'mb-3'} text-sm`}
          style={{ color: 'var(--forum-primary)' }}
        >
          {review.brand && <span className="font-medium">{review.brand}</span>}
          {review.brand && review.productName && ' · '}
          {review.productName}
        </div>
      )}

      {/* Title & Excerpt */}
      <a
        href={`/forum/post/${review.slug}`}
        className="block group"
      >
        <h3
          className={`font-semibold group-hover:underline ${
            isCompact ? 'text-sm line-clamp-1' : 'text-base line-clamp-2'
          }`}
          style={{ color: 'var(--forum-text-primary)' }}
        >
          {review.title}
        </h3>
        {review.excerpt && !isCompact && (
          <p
            className="text-sm mt-1 line-clamp-2"
            style={{ color: 'var(--forum-text-secondary)' }}
          >
            {review.excerpt}
          </p>
        )}
      </a>

      {/* Concerns Tags */}
      {review.concerns && review.concerns.length > 0 && !isCompact && (
        <div className="flex flex-wrap gap-1 mt-3">
          {review.concerns.slice(0, 4).map((concern) => (
            <span
              key={concern}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor: 'var(--forum-bg-highlight)',
                color: 'var(--forum-primary)',
              }}
            >
              {concern}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        className={`flex items-center justify-between flex-wrap gap-2 ${
          isCompact ? 'mt-2 pt-2' : 'mt-4 pt-3'
        } border-t`}
        style={{ borderColor: 'var(--forum-border-light)' }}
      >
        {/* Stats */}
        <div
          className="flex items-center gap-3 text-xs"
          style={{ color: 'var(--forum-text-muted)' }}
        >
          <span>조회 {review.viewCount}</span>
          <span>댓글 {review.commentCount}</span>
          {review.likeCount > 0 && (
            <span style={{ color: 'var(--forum-like-active)' }}>
              {review.likeCount}
            </span>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2">
            {review.helpfulCount !== undefined && (
              <button
                onClick={() => onHelpfulClick?.(review.id)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  review.isHelpful ? 'font-medium' : ''
                }`}
                style={{
                  backgroundColor: review.isHelpful
                    ? 'var(--forum-primary-light)'
                    : 'var(--forum-bg-tertiary)',
                  color: review.isHelpful
                    ? 'var(--forum-primary)'
                    : 'var(--forum-text-secondary)',
                }}
              >
                <span>{review.isHelpful ? '도움됨' : '도움이 됐어요'}</span>
                <span className="font-medium">{review.helpfulCount}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CosmeticsReviewCard;

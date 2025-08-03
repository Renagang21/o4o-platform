import { ReviewsResponse, ReviewFilters } from '@o4o/types';
import { ReviewItem } from './ReviewItem';
import { ReviewFiltersBar } from './ReviewFiltersBar';
import { Button } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import { AlertCircle } from 'lucide-react';
import { cn } from '@o4o/utils';

interface ReviewListProps {
  reviews?: ReviewsResponse;
  filters?: ReviewFilters;
  onFiltersChange?: (filters: ReviewFilters) => void;
  onHelpful?: (reviewId: string, helpful: boolean) => void;
  onReport?: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  className?: string;
}

export function ReviewList({
  reviews,
  filters,
  onFiltersChange,
  onHelpful,
  onReport,
  onEdit,
  onDelete,
  onLoadMore,
  isLoading,
  hasMore,
  className
}: ReviewListProps) {
  if (isLoading && !reviews) {
    return <ReviewListSkeleton />;
  }

  if (!reviews || reviews.reviews.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">아직 작성된 리뷰가 없습니다.</p>
        <p className="text-sm text-gray-500 mt-1">
          첫 번째 리뷰를 작성해보세요!
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Filters */}
      {onFiltersChange && (
        <ReviewFiltersBar
          filters={filters || {}}
          totalReviews={reviews.total}
          onFiltersChange={onFiltersChange}
        />
      )}

      {/* Reviews */}
      <div className="space-y-6">
        {reviews.reviews.map((review: any) => (
          <ReviewItem
            key={review.id}
            review={review}
            onHelpful={(helpful) => onHelpful?.(review.id, helpful)}
            onReport={() => onReport?.(review.id)}
            onEdit={() => onEdit?.(review.id)}
            onDelete={() => onDelete?.(review.id)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i: any) => (
        <div key={i} className="border-b pb-6 last:border-0">
          <div className="flex items-start gap-3 mb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
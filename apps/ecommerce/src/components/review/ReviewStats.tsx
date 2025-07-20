import React from 'react';
import { ReviewStats as ReviewStatsType } from '@o4o/types/ecommerce';
import { ReviewRating } from './ReviewRating';
import { Progress } from '@o4o/ui/components/ui/progress';
import { cn } from '@o4o/ui/lib/utils';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  className?: string;
}

export function ReviewStats({ stats, className }: ReviewStatsProps) {
  const maxCount = Math.max(...Object.values(stats.ratingDistribution));

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Rating */}
      <div className="text-center">
        <div className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
        <ReviewRating rating={stats.averageRating} size="lg" />
        <p className="text-sm text-gray-600 mt-1">
          {stats.totalReviews.toLocaleString()}개의 리뷰
        </p>
      </div>

      {/* Rating Distribution */}
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
          const percentage = stats.totalReviews > 0 
            ? (count / stats.totalReviews) * 100 
            : 0;

          return (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-3">{rating}</span>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <div className="flex-1">
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
              </div>
              <span className="text-sm text-gray-600 w-12 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Verified Purchase Percentage */}
      {stats.verifiedPercentage > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{stats.verifiedPercentage.toFixed(0)}%</span>가 
            실제 구매자의 리뷰입니다
          </p>
        </div>
      )}
    </div>
  );
}

// Star icon component
function Star({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
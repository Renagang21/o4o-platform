import { ReviewStats as ReviewStatsType } from '@o4o/types';
import { ReviewRating } from './ReviewRating';
import { Progress } from '@o4o/ui';
import { cn } from '@o4o/utils';
import { Star } from 'lucide-react';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  className?: string;
}

export function ReviewStats({ stats, className }: ReviewStatsProps) {

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
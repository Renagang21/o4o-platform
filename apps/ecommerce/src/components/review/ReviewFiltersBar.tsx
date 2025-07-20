import type { ReviewFilters } from '@o4o/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@o4o/ui';
import { ToggleGroup, ToggleGroupItem } from '@o4o/ui';
import { Star, CheckCircle } from 'lucide-react';
import { cn } from '@o4o/utils';

interface ReviewFiltersBarProps {
  filters: ReviewFilters;
  totalReviews: number;
  onFiltersChange: (filters: ReviewFilters) => void;
  className?: string;
}

export function ReviewFiltersBar({
  filters,
  totalReviews,
  onFiltersChange,
  className
}: ReviewFiltersBarProps) {
  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sort: value as ReviewFilters['sort']
    });
  };

  const handleRatingFilter = (value: string) => {
    const rating = value ? parseInt(value) : undefined;
    onFiltersChange({
      ...filters,
      rating
    });
  };

  const handleVerifiedFilter = (value: string) => {
    const verified = value === 'verified' ? true : value === 'all' ? undefined : undefined;
    onFiltersChange({
      ...filters,
      verified
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          총 {totalReviews.toLocaleString()}개의 리뷰
        </p>
        
        {/* Sort */}
        <Select
          value={filters.sort || 'recent'}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">최신순</SelectItem>
            <SelectItem value="helpful">도움순</SelectItem>
            <SelectItem value="rating_high">평점 높은순</SelectItem>
            <SelectItem value="rating_low">평점 낮은순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Rating Filter */}
        <ToggleGroup
          type="single"
          value={filters.rating?.toString() || 'all'}
          onValueChange={(value) => handleRatingFilter(typeof value === 'string' ? value : value[0] || '')}
        >
          <ToggleGroupItem value="all" className="gap-1">
            전체
          </ToggleGroupItem>
          {[5, 4, 3, 2, 1].map((rating) => (
            <ToggleGroupItem
              key={rating}
              value={rating.toString()}
              className="gap-1"
            >
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {rating}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Verified Filter */}
        <ToggleGroup
          type="single"
          value={filters.verified === true ? 'verified' : 'all'}
          onValueChange={(value) => handleVerifiedFilter(typeof value === 'string' ? value : value[0] || '')}
        >
          <ToggleGroupItem value="all">
            모든 리뷰
          </ToggleGroupItem>
          <ToggleGroupItem value="verified" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            구매 인증
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
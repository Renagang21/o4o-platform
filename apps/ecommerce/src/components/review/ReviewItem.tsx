import React from 'react';
import { Review } from '@o4o/types';
import { ReviewRating } from './ReviewRating';
import { Button } from '@o4o/ui';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MoreVertical, 
  CheckCircle,
  Flag,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@o4o/ui';
import { formatDate } from '@o4o/utils';
import { cn } from '@o4o/utils';
import { useAuth } from '@o4o/auth-context';

interface ReviewItemProps {
  review: Review;
  onHelpful?: (helpful: boolean) => void;
  onReport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ReviewItem({
  review,
  onHelpful,
  onReport,
  onEdit,
  onDelete,
  className
}: ReviewItemProps) {
  const { user } = useAuth();
  const [helpfulClicked, setHelpfulClicked] = React.useState<boolean | null>(null);
  const isOwner = user?.id === review.userId;

  const handleHelpful = (helpful: boolean) => {
    if (helpfulClicked !== null) return; // Already clicked
    setHelpfulClicked(helpful);
    onHelpful?.(helpful);
  };

  return (
    <div className={cn('border-b pb-6 last:border-0', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <ReviewRating rating={review.rating} size="sm" />
            <h4 className="font-medium">{review.title}</h4>
            {review.verified && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                구매 인증
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <span>{review.user?.name || '익명'}</span>
            <span>·</span>
            <span>{formatDate(review.createdAt)}</span>
          </div>

          {/* Content */}
          <p className="text-gray-700 whitespace-pre-line mb-3">
            {review.content}
          </p>

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mb-3">
              {review.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`리뷰 이미지 ${index + 1}`}
                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-90"
                  onClick={() => {
                    // TODO: Open image modal
                  }}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              도움이 되었나요?
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleHelpful(true)}
                disabled={helpfulClicked !== null}
                className={cn(
                  'gap-1',
                  helpfulClicked === true && 'text-blue-600'
                )}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{review.helpful}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleHelpful(false)}
                disabled={helpfulClicked !== null}
                className={cn(
                  'gap-1',
                  helpfulClicked === false && 'text-red-600'
                )}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>{review.unhelpful}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner ? (
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={onReport}>
                <Flag className="mr-2 h-4 w-4" />
                신고
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
/**
 * CreditBadge Component
 *
 * Displays credit amount with visual styling based on value
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CreditBadgeProps {
  credits: number;
  required?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CreditBadge({
  credits,
  required,
  showProgress = false,
  size = 'md',
  className,
}: CreditBadgeProps) {
  const isComplete = required ? credits >= required : true;
  const progress = required ? Math.min((credits / required) * 100, 100) : 100;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const variant = isComplete ? 'default' : credits > 0 ? 'secondary' : 'outline';

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <Badge
        variant={variant}
        className={cn(
          sizeClasses[size],
          isComplete && 'bg-green-600 hover:bg-green-700',
          !isComplete && credits > 0 && 'bg-yellow-600 hover:bg-yellow-700',
          !isComplete && credits === 0 && 'bg-gray-400'
        )}
      >
        {credits.toFixed(1)} {required ? `/ ${required}` : ''} 평점
      </Badge>

      {showProgress && required && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              isComplete ? 'bg-green-600' : 'bg-yellow-600'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default CreditBadge;

/**
 * Threshold Progress Bar Component
 * Phase 3: UI Integration
 *
 * Displays progress towards minimum quantity threshold
 */

import { cn } from '@o4o/ui';

interface ProgressBarProps {
  current: number;
  target: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  current,
  target,
  showLabel = true,
  size = 'md',
  className
}: ProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target;

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-sm">
          <span className="text-muted-foreground">
            {current.toLocaleString()} / {target.toLocaleString()}
          </span>
          <span className={cn(
            'font-medium',
            isComplete ? 'text-green-600' : 'text-muted-foreground'
          )}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isComplete ? 'bg-green-500' : 'bg-blue-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

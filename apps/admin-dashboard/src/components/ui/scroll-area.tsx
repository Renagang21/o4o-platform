import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = 'vertical', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-auto',
          {
            'overflow-y-auto overflow-x-hidden': orientation === 'vertical',
            'overflow-x-auto overflow-y-hidden': orientation === 'horizontal',
            'overflow-auto': orientation === 'both',
          },
          // Custom scrollbar styling
          'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
          'hover:scrollbar-thumb-gray-400',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// ScrollBar is not needed with native scrollbar styling
const ScrollBar = () => null;

export { ScrollArea, ScrollBar };
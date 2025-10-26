/**
 * CleanBlockWrapper
 *
 * Minimal block wrapper inspired by WordPress Gutenberg.
 * NO event handlers, NO onClick conflicts, NO focus issues.
 *
 * Responsibilities:
 * - Visual container for block
 * - Selection state styling
 * - data-block-id for queries
 *
 * What it does NOT do:
 * - NO onClick handlers
 * - NO event propagation management
 * - NO auto-focus logic
 */

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CleanBlockWrapperProps {
  id: string;
  type: string;
  isSelected: boolean;
  onSelect?: () => void;
  children: ReactNode;
  className?: string;
}

export const CleanBlockWrapper: React.FC<CleanBlockWrapperProps> = ({
  id,
  type,
  isSelected,
  onSelect,
  children,
  className,
}) => {
  return (
    <div
      data-block-id={id}
      data-block-type={type}
      className={cn(
        'wp-block',
        `wp-block-${type.replace('/', '-')}`,
        'relative',
        'my-7', // Gutenberg default spacing
        isSelected && 'is-selected',
        className
      )}
      onClick={(e) => {
        // Only select if clicking the wrapper itself, not child elements
        // This prevents interfering with Slate's internal click handling
        if (e.target === e.currentTarget && onSelect) {
          onSelect();
        }
      }}
    >
      {children}
    </div>
  );
};

export default CleanBlockWrapper;

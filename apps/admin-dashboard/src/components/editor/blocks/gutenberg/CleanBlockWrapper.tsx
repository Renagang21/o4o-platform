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
  children: ReactNode;
  className?: string;
}

export const CleanBlockWrapper: React.FC<CleanBlockWrapperProps> = ({
  id,
  type,
  isSelected,
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
      // NO onClick, NO onMouseEnter, NO event handlers
    >
      {children}
    </div>
  );
};

export default CleanBlockWrapper;

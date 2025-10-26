/**
 * CleanBlockWrapper
 *
 * Minimal block wrapper inspired by WordPress Gutenberg.
 *
 * Responsibilities:
 * - Visual container for block
 * - Selection state styling
 * - Simple onClick for block selection (same as EnhancedBlockWrapper)
 * - data-block-id for queries
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
        // Selection + auto-focus (like EnhancedBlockWrapper's useBlockFocus)
        if (onSelect) onSelect();

        // Auto-focus the Slate Editable when clicking anywhere in the block
        const editable = (e.currentTarget as HTMLElement).querySelector('[contenteditable="true"]');
        if (editable instanceof HTMLElement) {
          editable.focus();
        }
      }}
    >
      {children}
    </div>
  );
};

export default CleanBlockWrapper;

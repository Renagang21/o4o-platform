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

import React, { ReactNode, useRef, useEffect } from 'react';
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
  const blockRef = useRef<HTMLDivElement>(null);

  // Auto-focus when block becomes selected (like EnhancedBlockWrapper's useBlockFocus)
  useEffect(() => {
    if (isSelected && blockRef.current) {
      // Try multiple selectors: Slate's contenteditable, textarea, or input
      const editable = (
        blockRef.current.querySelector('[contenteditable="true"]') ||
        blockRef.current.querySelector('textarea') ||
        blockRef.current.querySelector('input[type="text"]')
      ) as HTMLElement;

      if (editable) {
        // Use setTimeout to ensure focus happens after React finishes rendering
        setTimeout(() => {
          editable.focus();
        }, 0);
      }
    }
  }, [isSelected]);

  return (
    <div
      ref={blockRef}
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
      onClick={() => {
        // Simple selection - focus will be handled by useEffect
        if (onSelect) onSelect();
      }}
    >
      {children}
    </div>
  );
};

export default CleanBlockWrapper;

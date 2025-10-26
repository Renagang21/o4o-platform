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

import React, { ReactNode, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useBlockFocus } from '@/components/editor/hooks/useBlockFocus';

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

  // Use the proven focus restoration logic from EnhancedBlockWrapper
  // This handles: focus() + selection creation + proper timing (50ms) + isConnected check
  useBlockFocus({ blockRef, isSelected });

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
      {/* DEBUG: Visual indicator for isSelected */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '0',
            background: 'green',
            color: 'white',
            padding: '2px 8px',
            fontSize: '11px',
            borderRadius: '3px',
            zIndex: 9999,
          }}
        >
          SELECTED ✓
        </div>
      )}
      {children}
    </div>
  );
};

export default CleanBlockWrapper;

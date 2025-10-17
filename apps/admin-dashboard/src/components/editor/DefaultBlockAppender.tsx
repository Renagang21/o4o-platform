/**
 * DefaultBlockAppender Component
 *
 * Gutenberg-style default block appender.
 * Shows placeholder "Type / to choose a block" and converts to a paragraph block on typing.
 *
 * Key Behaviors:
 * - No toolbar or block controls (provisional state)
 * - Clicking or typing converts to paragraph block
 * - "/" triggers slash command menu
 * - ENTER/SPACE also activates
 */

import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DefaultBlockAppenderProps {
  /** Callback to insert default paragraph block */
  onInsertBlock: (initialContent?: string) => void;
  /** Callback to show slash command menu */
  onShowSlashMenu?: (position: { top: number; left: number }) => void;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

export const DefaultBlockAppender: React.FC<DefaultBlockAppenderProps> = ({
  onInsertBlock,
  onShowSlashMenu,
  autoFocus = false,
  placeholder = 'Type / to choose a block',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  // Focus on mount if autoFocus is true
  React.useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.focus();
    }
  }, [autoFocus]);

  // Handle click - convert to paragraph block
  const handleClick = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    onInsertBlock();
  }, [onInsertBlock]);

  // Handle keyboard activation (ENTER or SPACE)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isProcessingRef.current) return;

      // ENTER or SPACE - convert to paragraph block
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        isProcessingRef.current = true;
        onInsertBlock();
        return;
      }

      // "/" - show slash menu
      if (e.key === '/' && onShowSlashMenu && containerRef.current) {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        onShowSlashMenu({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
        return;
      }

      // Any other printable character - convert to paragraph with initial content
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        isProcessingRef.current = true;
        onInsertBlock(e.key);
      }
    },
    [onInsertBlock, onShowSlashMenu]
  );

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'default-block-appender',
        'group',
        'min-h-[52px]',
        'px-4 py-3',
        'cursor-text',
        'border border-transparent rounded-md',
        'hover:border-gray-200 hover:bg-gray-50/50',
        'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
        'transition-all duration-200',
        className
      )}
      aria-label="Add block"
      data-default-block-appender="true"
    >
      <p
        className={cn(
          'text-base text-gray-400',
          'pointer-events-none',
          'select-none',
          'm-0 p-0',
          'leading-relaxed'
        )}
        style={{
          fontSize: '16px',
          lineHeight: '1.5',
        }}
      >
        {placeholder}
      </p>
    </div>
  );
};

export default DefaultBlockAppender;

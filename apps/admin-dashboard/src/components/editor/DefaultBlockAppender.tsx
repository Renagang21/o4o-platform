/**
 * DefaultBlockAppender Component
 *
 * Simplified input area that converts to paragraph block on Enter.
 * No slash menu, no block selection - just simple text input.
 *
 * Key Behaviors:
 * - Click to focus and type directly
 * - Enter key converts to paragraph block
 * - Blur with content also converts to paragraph block
 */

import React, { useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface DefaultBlockAppenderProps {
  /** Callback to insert paragraph block with content */
  onInsertBlock: (content: string) => void;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

export const DefaultBlockAppender: React.FC<DefaultBlockAppenderProps> = ({
  onInsertBlock,
  autoFocus = false,
  placeholder = 'Start writing...',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Focus on mount if autoFocus is true
  React.useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || '';
    setIsEmpty(text.trim() === '');
  }, []);

  // Handle Enter key - convert to paragraph block
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const content = editorRef.current?.innerHTML || '';
        if (content.trim()) {
          onInsertBlock(content);
          // Clear the editor
          if (editorRef.current) {
            editorRef.current.innerHTML = '';
            setIsEmpty(true);
          }
        }
      }
    },
    [onInsertBlock]
  );

  // Handle blur - convert to paragraph if has content
  const handleBlur = useCallback(() => {
    const content = editorRef.current?.innerHTML || '';
    if (content.trim()) {
      onInsertBlock(content);
      // Clear the editor
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        setIsEmpty(true);
      }
    }
  }, [onInsertBlock]);

  return (
    <div
      className={cn(
        'default-block-appender',
        'group',
        'min-h-[52px]',
        'px-4 py-3',
        'cursor-text',
        'border border-transparent rounded-md',
        'hover:border-gray-200 hover:bg-gray-50/50',
        'focus-within:outline-none focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500',
        'transition-all duration-200',
        'relative',
        className
      )}
      onClick={() => editorRef.current?.focus()}
    >
      {isEmpty && (
        <div
          className={cn(
            'absolute inset-0 px-4 py-3',
            'text-base text-gray-400',
            'pointer-events-none',
            'select-none',
            'leading-relaxed'
          )}
          style={{
            fontSize: '16px',
            lineHeight: '1.5',
          }}
        >
          {placeholder}
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          'min-h-[1.5em]',
          'outline-none',
          'text-base',
          'leading-relaxed'
        )}
        style={{
          fontSize: '16px',
          lineHeight: '1.5',
        }}
        data-default-block-appender="true"
      />
    </div>
  );
};

export default DefaultBlockAppender;

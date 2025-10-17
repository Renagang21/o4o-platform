/**
 * PlaceholderBlock Component
 * 항상 존재하는 입력 placeholder (블록이 아님)
 * - 새글: 맨 처음에 표시
 * - 기존 글: 맨 끝에 표시
 * - 블록 기능(툴바 등) 없음
 * - "/" 입력 시 슬래시 메뉴 열림 (변환 안 됨)
 * - 일반 텍스트 입력 시 자동으로 paragraph 블록으로 변환
 */

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PlaceholderBlockProps {
  onConvertToParagraph: (initialContent: string) => void;
  onTriggerSlashMenu?: (position: { top: number; left: number }) => void;
  autoFocus?: boolean;
  className?: string;
}

const PlaceholderBlock: React.FC<PlaceholderBlockProps> = ({
  onConvertToParagraph,
  onTriggerSlashMenu,
  autoFocus = false,
  className = '',
}) => {
  const editableRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  // Auto focus on mount if requested
  useEffect(() => {
    if (autoFocus && editableRef.current) {
      editableRef.current.focus();
    }
  }, [autoFocus]);

  // Handle input
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';

    // Ignore if already processing
    if (isProcessingRef.current) {
      return;
    }

    // Check for "/" - trigger slash menu
    if (content.includes('/')) {
      if (onTriggerSlashMenu && editableRef.current && content === '/') {
        const rect = editableRef.current.getBoundingClientRect();
        onTriggerSlashMenu({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX
        });
      }
      // Don't convert yet, let user choose block type
      return;
    }

    // Ignore empty input
    if (!content.trim()) {
      return;
    }

    // Convert to paragraph block if it's actual text (not "/")
    if (content.trim()) {
      isProcessingRef.current = true;
      onConvertToParagraph(content);
    }
  };

  // Handle click to focus
  const handleClick = () => {
    if (editableRef.current) {
      editableRef.current.focus();
    }
  };

  return (
    <div
      className={cn(
        'placeholder-block',
        'min-h-[52px]', // Match paragraph block height
        'px-4 py-3',
        'border border-transparent rounded-md',
        'hover:border-gray-200 hover:bg-gray-50/50',
        'transition-all duration-200',
        'cursor-text',
        className
      )}
      onClick={handleClick}
      data-placeholder-block="true"
    >
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className={cn(
          'outline-none',
          'text-base leading-relaxed',
          'text-gray-900',
          'min-h-[1.5em]',
          // Placeholder styling
          'empty:before:content-[attr(data-placeholder)]',
          'empty:before:text-gray-400',
          'empty:before:pointer-events-none'
        )}
        data-placeholder="입력하거나 / 로 블록 선택"
        style={{
          fontSize: '16px',
          lineHeight: '1.5',
        }}
      />
    </div>
  );
};

export default PlaceholderBlock;

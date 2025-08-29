/**
 * SimplifiedHeadingBlock Component
 * 간소화된 헤딩 블록 - BlockWrapper와 통합
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface SimplifiedHeadingBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    align?: 'left' | 'center' | 'right';
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
}

const SimplifiedHeadingBlock: React.FC<SimplifiedHeadingBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
}) => {
  const [localContent, setLocalContent] = useState(content);
  const editorRef = useRef<HTMLHeadingElement>(null);
  const { level = 2, align = 'left' } = attributes;

  // Sync content
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle content change
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerText || '';
      setLocalContent(newContent);
      onChange(newContent, attributes);
    }
  };

  // Handle level change
  const handleLevelChange = (newLevel: string) => {
    const levelNum = parseInt(newLevel) as 1 | 2 | 3 | 4 | 5 | 6;
    onChange(localContent, { ...attributes, level: levelNum });
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter key - create new paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Save current content
      if (editorRef.current) {
        const currentContent = editorRef.current.innerText || '';
        onChange(currentContent, attributes);
      }
      // Add new paragraph block after
      onAddBlock?.('after', 'core/paragraph');
    }
    
    // Backspace on empty - delete block
    if (e.key === 'Backspace' && localContent === '') {
      e.preventDefault();
      onDelete();
    }
  };

  // Handle paste - plain text only
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Size classes for different heading levels
  const sizeClasses = {
    1: 'text-4xl font-bold',
    2: 'text-3xl font-bold',
    3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-medium',
    6: 'text-base font-medium',
  };

  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <EnhancedBlockWrapper
      id={id}
      type="heading"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
    >
      <div className="flex items-center gap-2">
        {/* Level selector - show when selected */}
        {isSelected && (
          <Select value={level.toString()} onValueChange={handleLevelChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">H1</SelectItem>
              <SelectItem value="2">H2</SelectItem>
              <SelectItem value="3">H3</SelectItem>
              <SelectItem value="4">H4</SelectItem>
              <SelectItem value="5">H5</SelectItem>
              <SelectItem value="6">H6</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {/* Heading content */}
        <HeadingTag
          ref={editorRef as any}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'heading-editor outline-none flex-1',
            'focus:outline-none',
            sizeClasses[level],
            align === 'center' && 'text-center',
            align === 'right' && 'text-right',
            !localContent && 'text-gray-400'
          )}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          dangerouslySetInnerHTML={{ 
            __html: localContent || `<span>Heading ${level}</span>` 
          }}
        />
      </div>
    </EnhancedBlockWrapper>
  );
};

export default SimplifiedHeadingBlock;
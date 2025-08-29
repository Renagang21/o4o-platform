/**
 * EnhancedHeadingBlock Component
 * 헤딩 블록 - 툴바에 레벨 선택기 통합
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';

interface EnhancedHeadingBlockProps {
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
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
    isBold?: boolean;
    isItalic?: boolean;
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
  onChangeType?: (newType: string) => void;
}

const EnhancedHeadingBlock: React.FC<EnhancedHeadingBlockProps> = ({
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
  onChangeType,
}) => {
  const [localContent, setLocalContent] = useState(content);
  const editorRef = useRef<HTMLHeadingElement>(null);
  const { level = 2, align = 'left', isBold = false, isItalic = false } = attributes;

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    onChange(localContent, { ...attributes, align: newAlign });
  };

  // Sync content
  useEffect(() => {
    setLocalContent(content);
    if (editorRef.current && !editorRef.current.textContent) {
      editorRef.current.textContent = content;
    }
  }, [content]);

  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current && localContent) {
      editorRef.current.textContent = localContent;
    }
  }, []);

  // Handle content change
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.textContent || '';
      setLocalContent(newContent);
      onChange(newContent, attributes);
    }
  };

  // Handle level change
  const handleLevelChange = (newLevel: number) => {
    onChange(localContent, { ...attributes, level: newLevel as 1 | 2 | 3 | 4 | 5 | 6 });
  };

  // Handle bold toggle
  const handleToggleBold = () => {
    const newBold = !isBold;
    onChange(localContent, { ...attributes, isBold: newBold });
  };

  // Handle italic toggle
  const handleToggleItalic = () => {
    const newItalic = !isItalic;
    onChange(localContent, { ...attributes, isItalic: newItalic });
  };

  // Handle type change
  const handleChangeType = (newType: string) => {
    if (onChangeType) {
      onChangeType(newType);
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter key - create new paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Save current content
      if (editorRef.current) {
        const currentContent = editorRef.current.textContent || '';
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

  // Custom toolbar content for heading block
  const customToolbarContent = isSelected ? (
    <div className="flex items-center gap-2 mr-2">
      <select
        value={level.toString()}
        onChange={(e) => handleLevelChange(parseInt(e.target.value))}
        className="h-7 px-2 text-sm border border-gray-200 rounded hover:border-gray-300 focus:outline-none focus:border-blue-500"
      >
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
        <option value="4">H4</option>
        <option value="5">H5</option>
        <option value="6">H6</option>
      </select>
    </div>
  ) : null;

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
      customToolbarContent={customToolbarContent}
      onAlignChange={handleAlignChange}
      currentAlign={align}
      onToggleBold={handleToggleBold}
      onToggleItalic={handleToggleItalic}
      onChangeType={handleChangeType}
      currentType={`core/heading-h${level}`}
      isBold={isBold}
      isItalic={isItalic}
    >
      {/* 순수한 헤딩 콘텐츠만 - 컨트롤 없음 */}
      <HeadingTag
        ref={editorRef as any}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'heading-editor outline-none w-full',
          'focus:outline-none',
          sizeClasses[level],
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          !localContent && 'text-gray-400',
          isBold && 'font-bold',
          isItalic && 'italic'
        )}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={`Heading ${level}`}
        style={{
          direction: 'ltr',
          unicodeBidi: 'normal',
          fontSize: attributes?.fontSize ? `${attributes.fontSize}px` : undefined,
          color: attributes?.textColor || undefined,
          backgroundColor: attributes?.backgroundColor || undefined
        }}
      />
    </EnhancedBlockWrapper>
  );
};

export default EnhancedHeadingBlock;
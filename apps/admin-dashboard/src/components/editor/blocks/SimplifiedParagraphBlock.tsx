/**
 * SimplifiedParagraphBlock Component
 * 간소화된 단락 블록 - BlockWrapper와 통합
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';

interface SimplifiedParagraphBlockProps {
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
    align?: 'left' | 'center' | 'right' | 'justify';
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

const SimplifiedParagraphBlock: React.FC<SimplifiedParagraphBlockProps> = ({
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
  const editorRef = useRef<HTMLDivElement>(null);
  const { align = 'left', isBold = false, isItalic = false } = attributes;

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    onChange(localContent, { ...attributes, align: newAlign });
  };

  // Handle bold toggle
  const handleToggleBold = () => {
    const newBold = !isBold;
    onChange(localContent, { ...attributes, isBold: newBold });
    if (editorRef.current) {
      document.execCommand('bold', false);
    }
  };

  // Handle italic toggle
  const handleToggleItalic = () => {
    const newItalic = !isItalic;
    onChange(localContent, { ...attributes, isItalic: newItalic });
    if (editorRef.current) {
      document.execCommand('italic', false);
    }
  };

  // Handle type change (convert to heading or paragraph)
  const handleChangeType = (newType: string) => {
    // This will be handled by the parent component to change block type
    if (onChangeType) {
      onChangeType(newType);
    }
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

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Bold: Ctrl/Cmd + B
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      handleToggleBold();
    }
    
    // Italic: Ctrl/Cmd + I
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      handleToggleItalic();
    }
    
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

  return (
    <EnhancedBlockWrapper
      id={id}
      type="paragraph"
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
      onAlignChange={handleAlignChange}
      currentAlign={align}
    >
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'paragraph-editor outline-none min-h-[1.5em] px-2 py-1',
          'focus:outline-none',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          align === 'justify' && 'text-justify',
          !localContent && 'text-gray-400'
        )}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder="Type / to choose a block"
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

export default SimplifiedParagraphBlock;
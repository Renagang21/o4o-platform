/**
 * SuperHeadingBlock Component
 * 고급 헤딩 블록 - 시각적 레벨 선택기, 앵커 자동 생성, 목차 연동
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { LevelSelector } from './heading/LevelSelector';
import { AnchorGenerator } from './heading/AnchorGenerator';
import { TOCInterface } from './heading/TOCInterface';
import { cn } from '@/lib/utils';
import { Type, Link, List, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuperHeadingBlockProps {
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
    anchor?: string;
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    letterSpacing?: number;
    autoAnchor?: boolean;
    includeInTOC?: boolean;
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
  // 목차 연동을 위한 props
  existingAnchors?: string[];
  allHeadings?: Array<{
    id: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    text: string;
    anchor?: string;
  }>;
  onNavigateToHeading?: (anchor: string) => void;
}

const SuperHeadingBlock: React.FC<SuperHeadingBlockProps> = ({
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
  existingAnchors = [],
  allHeadings = [],
  onNavigateToHeading,
}) => {
  // Parse attributes with defaults
  const {
    level = 2,
    align = 'left',
    anchor = '',
    fontSize,
    textColor,
    backgroundColor,
    fontWeight,
    fontStyle = 'normal',
    textTransform = 'none',
    letterSpacing = 0,
    autoAnchor = true,
    includeInTOC = true,
  } = attributes;

  const [localContent, setLocalContent] = useState(content);
  const [showLevelSettings, setShowLevelSettings] = useState(false);
  const [showAnchorSettings, setShowAnchorSettings] = useState(false);
  const [showTOCSettings, setShowTOCSettings] = useState(false);
  const editorRef = useRef<HTMLHeadingElement>(null);

  // Sync content
  useEffect(() => {
    setLocalContent(content);
    if (editorRef.current && content !== editorRef.current.textContent) {
      editorRef.current.textContent = content;
    }
  }, [content]);

  // Update attributes helper
  const updateAttributes = (updates: Partial<typeof attributes>) => {
    onChange(localContent, { ...attributes, ...updates });
  };

  // Handle content change
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.textContent || '';
      setLocalContent(newContent);
      onChange(newContent, attributes);
    }
  };

  // Handle level change with keyboard shortcuts
  const handleLevelChange = (newLevel: 1 | 2 | 3 | 4 | 5 | 6) => {
    updateAttributes({ level: newLevel });
  };

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    updateAttributes({ align: newAlign as any });
  };

  // Handle anchor change
  const handleAnchorChange = (newAnchor: string) => {
    updateAttributes({ anchor: newAnchor });
  };

  // Handle key events with shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard shortcuts for heading levels (Ctrl/Cmd + 1-6)
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const newLevel = parseInt(e.key) as 1 | 2 | 3 | 4 | 5 | 6;
      handleLevelChange(newLevel);
      return;
    }

    // Enter key - create new paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editorRef.current) {
        const currentContent = editorRef.current.textContent || '';
        onChange(currentContent, attributes);
      }
      onAddBlock?.('after', 'core/paragraph');
    }

    // Backspace on empty - delete block
    if (e.key === 'Backspace' && localContent === '') {
      e.preventDefault();
      onDelete();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Get heading tag
  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  // Get size classes for different heading levels
  const getSizeClasses = () => {
    const sizeClasses = {
      1: 'text-4xl font-bold',
      2: 'text-3xl font-bold',
      3: 'text-2xl font-semibold',
      4: 'text-xl font-semibold',
      5: 'text-lg font-medium',
      6: 'text-base font-medium',
    };
    return sizeClasses[level];
  };

  // Get heading styles
  const getHeadingStyles = (): React.CSSProperties => {
    return {
      fontSize: fontSize ? `${fontSize}px` : undefined,
      color: textColor || undefined,
      backgroundColor: backgroundColor || undefined,
      fontWeight: fontWeight || undefined,
      fontStyle,
      textTransform,
      letterSpacing: letterSpacing ? `${letterSpacing}em` : undefined,
    };
  };

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
      onChangeType={onChangeType}
      currentType={`core/heading-h${level}`}
      onAlignChange={handleAlignChange}
      currentAlign={align}
      customToolbarContent={
        isSelected ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Level Selector */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((levelOption) => (
                <Button
                  key={levelOption}
                  variant={level === levelOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLevelChange(levelOption as any)}
                  className="h-7 w-8 p-0 text-xs font-bold"
                >
                  H{levelOption}
                </Button>
              ))}
            </div>

            <div className="w-px h-4 bg-gray-300" />

            {/* Settings Buttons */}
            <Button
              variant={showLevelSettings ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLevelSettings(!showLevelSettings)}
            >
              <Type className="h-3 w-3 mr-1" />
              Level
            </Button>

            <Button
              variant={showAnchorSettings ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowAnchorSettings(!showAnchorSettings)}
            >
              <Link className="h-3 w-3 mr-1" />
              Anchor
            </Button>

            <Button
              variant={showTOCSettings ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowTOCSettings(!showTOCSettings)}
            >
              <List className="h-3 w-3 mr-1" />
              TOC
            </Button>

            {/* Anchor indicator */}
            {anchor && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                #{anchor}
              </div>
            )}
          </div>
        ) : null
      }
    >
      {/* Heading Content */}
      <HeadingTag
        ref={editorRef as any}
        id={anchor || undefined}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'heading-editor outline-none w-full focus:outline-none',
          getSizeClasses(),
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          !localContent && 'text-gray-400'
        )}
        style={getHeadingStyles()}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={`Heading ${level}`}
      >
        {localContent}
      </HeadingTag>

      {/* Level Settings Panel */}
      {isSelected && showLevelSettings && (
        <div className="mt-4">
          <LevelSelector
            currentLevel={level}
            onLevelChange={handleLevelChange}
            showPreview={true}
          />
        </div>
      )}

      {/* Anchor Settings Panel */}
      {isSelected && showAnchorSettings && (
        <div className="mt-4">
          <AnchorGenerator
            headingText={localContent}
            currentAnchor={anchor}
            onAnchorChange={handleAnchorChange}
            existingAnchors={existingAnchors}
          />
        </div>
      )}

      {/* TOC Settings Panel */}
      {isSelected && showTOCSettings && (
        <div className="mt-4">
          <TOCInterface
            currentHeading={{
              level,
              text: localContent,
              anchor,
            }}
            headings={allHeadings}
            onNavigate={onNavigateToHeading}
            showTOCPreview={true}
            onToggleTOCPreview={() => {
              // TOC preview toggle logic
            }}
          />
        </div>
      )}

      {/* Accessibility Indicator */}
      {isSelected && (
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Level: H{level}</span>
            {anchor && <span>Anchor: #{anchor}</span>}
            {includeInTOC && <span>✓ In TOC</span>}
            <span>Shortcut: Ctrl+{level}</span>
          </div>
        </div>
      )}
    </EnhancedBlockWrapper>
  );
};

export default SuperHeadingBlock;
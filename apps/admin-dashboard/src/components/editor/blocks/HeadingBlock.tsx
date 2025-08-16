/**
 * HeadingBlock Component
 * Inline editable heading block with H1-H6 level switching
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Type,
  Hash,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import BlockWrapper from './BlockWrapper';

interface HeadingBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    align?: 'left' | 'center' | 'right';
    anchor?: string;
    isTableOfContents?: boolean;
    color?: string;
  };
}

const HeadingBlock: React.FC<HeadingBlockProps> = ({
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
  attributes = {}
}) => {
  const [localContent, setLocalContent] = useState(content);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLHeadingElement>(null);

  const {
    level = 2,
    align = 'left',
    anchor = '',
    isTableOfContents = false,
    color = ''
  } = attributes;

  // Sync content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Focus on edit
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
      // Select all text for easy replacement
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  // Handle content change
  const handleContentChange = () => {
    if (!contentRef.current) return;
    const newContent = contentRef.current.innerText;
    setLocalContent(newContent);
    onChange(newContent, attributes);
  };

  // Handle level change
  const handleLevelChange = (newLevel: 1 | 2 | 3 | 4 | 5 | 6) => {
    onChange(localContent, { ...attributes, level: newLevel });
  };

  // Handle alignment change
  const handleAlignmentChange = (newAlign: 'left' | 'center' | 'right') => {
    onChange(localContent, { ...attributes, align: newAlign });
  };

  // Handle anchor change
  const handleAnchorChange = (newAnchor: string) => {
    onChange(localContent, { ...attributes, anchor: newAnchor });
  };

  // Toggle table of contents
  const toggleTableOfContents = () => {
    onChange(localContent, { ...attributes, isTableOfContents: !isTableOfContents });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter to finish editing
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      contentRef.current?.blur();
      onAddBlock?.('after');
    }
    // Escape to cancel editing
    if (e.key === 'Escape') {
      setIsEditing(false);
      contentRef.current?.blur();
    }
    // Tab to change level
    if (e.key === 'Tab' && !e.shiftKey && level < 6) {
      e.preventDefault();
      handleLevelChange((level + 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
    // Shift+Tab to change level
    if (e.key === 'Tab' && e.shiftKey && level > 1) {
      e.preventDefault();
      handleLevelChange((level - 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  };

  // Get heading icon based on level
  const getHeadingIcon = () => {
    switch (level) {
      case 1: return <Heading1 className="h-4 w-4" />;
      case 2: return <Heading2 className="h-4 w-4" />;
      case 3: return <Heading3 className="h-4 w-4" />;
      case 4: return <Heading4 className="h-4 w-4" />;
      case 5: return <Heading5 className="h-4 w-4" />;
      case 6: return <Heading6 className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  // Get heading classes based on level
  const getHeadingClasses = () => {
    const baseClasses = 'outline-none transition-all';
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    };
    const levelClasses = {
      1: 'text-4xl font-bold',
      2: 'text-3xl font-bold',
      3: 'text-2xl font-semibold',
      4: 'text-xl font-semibold',
      5: 'text-lg font-medium',
      6: 'text-base font-medium'
    };
    
    return cn(
      baseClasses,
      alignClasses[align],
      levelClasses[level],
      isEditing && 'ring-2 ring-blue-500 ring-offset-2 rounded px-2',
      !localContent && 'text-gray-400'
    );
  };

  // Create heading element dynamically
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <BlockWrapper
      id={id}
      type="heading"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
    >
      {/* Inline Toolbar - shows when block is selected */}
      {isSelected && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
          {/* Level Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {getHeadingIcon()}
                <span className="text-xs">H{level}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <DropdownMenuItem
                  key={l}
                  onClick={() => handleLevelChange(l as 1 | 2 | 3 | 4 | 5 | 6)}
                  className={level === l ? 'bg-gray-100' : ''}
                >
                  <span className={`font-${l <= 2 ? 'bold' : l <= 4 ? 'semibold' : 'medium'}`}>
                    Heading {l}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-300" />

          {/* Alignment */}
          <div className="flex gap-1">
            <Button
              variant={align === 'left' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleAlignmentChange('left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'center' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleAlignmentChange('center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'right' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleAlignmentChange('right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Advanced Options */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Hash className="h-4 w-4" />
                Advanced
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                {/* HTML Anchor */}
                <div>
                  <Label htmlFor="anchor">HTML Anchor</Label>
                  <Input
                    id="anchor"
                    value={anchor}
                    onChange={(e) => handleAnchorChange(e.target.value)}
                    placeholder="heading-anchor"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for linking directly to this heading
                  </p>
                </div>

                {/* Table of Contents */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="toc">Include in Table of Contents</Label>
                    <p className="text-xs text-gray-500">
                      Show this heading in auto-generated TOC
                    </p>
                  </div>
                  <Switch
                    id="toc"
                    checked={isTableOfContents}
                    onCheckedChange={toggleTableOfContents}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Editable Heading */}
      <HeadingTag
        ref={contentRef as any}
        contentEditable
        suppressContentEditableWarning
        className={getHeadingClasses()}
        style={{ color: color || undefined }}
        id={anchor || undefined}
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        onClick={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        data-placeholder={`제목 ${level} 입력...`}
      >
        {localContent || `제목 ${level} 입력...`}
      </HeadingTag>
    </BlockWrapper>
  );
};

export default HeadingBlock;
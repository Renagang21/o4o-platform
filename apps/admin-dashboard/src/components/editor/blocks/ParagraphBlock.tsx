/**
 * ParagraphBlock Component
 * 
 * 구텐베르크 수준의 단락 블록 - 완전히 새롭게 구현
 * 직접 조작 원칙과 시각적 피드백 강화
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  Bold, 
  Italic, 
  Link2, 
  Strikethrough,
  Code,
  Underline,
  Highlighter,
  Subscript,
  Superscript,
  RemoveFormatting,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { RichText } from '../gutenberg/RichText';
import { BlockControls, ToolbarGroup, ToolbarButton, AlignmentToolbar } from '../gutenberg/BlockControls';
import { DropCapController } from './paragraph/DropCapController';
import { TypographyPanel } from './paragraph/TypographyPanel';
import { HighlightSelector } from './paragraph/HighlightSelector';
import { InlineImageInserter, InlineImageData } from './paragraph/InlineImageInserter';
import './paragraph/paragraph-styles.css';

interface ParagraphBlockProps {
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
    dropCap?: boolean;
    dropCapLines?: number;
    dropCapColor?: string;
    dropCapFontSize?: number;
    dropCapFontWeight?: number;
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
    wordSpacing?: number;
    textColor?: string;
    backgroundColor?: string;
    highlightColor?: string;
    highlightOpacity?: number;
    padding?: number;
    margin?: number;
    borderRadius?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  };
}

const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
  id: _id,  // Prefixed with underscore since not used directly
  content,
  onChange,
  onDelete,
  onDuplicate: _onDuplicate,  // Not used in this implementation
  onMoveUp: _onMoveUp,  // Not used in this implementation
  onMoveDown: _onMoveDown,  // Not used in this implementation
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {}
}) => {
  // State
  const [localContent, setLocalContent] = useState(content);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showDropCapSettings, setShowDropCapSettings] = useState(false);
  const [showTypographySettings, setShowTypographySettings] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Default attributes with fallbacks
  const {
    align = 'left',
    dropCap = false,
    dropCapLines = 3,
    dropCapColor = '#000000',
    dropCapFontSize = 64,
    dropCapFontWeight = 700,
    fontSize = 16,
    lineHeight = 1.6,
    letterSpacing = 0,
    wordSpacing = 0,
    textColor = '#1e293b',
    backgroundColor = '',
    highlightColor = '',
    highlightOpacity = 0.3,
    padding = 0,
    margin = 0,
    borderRadius = 0,
    fontWeight = 400,
    fontStyle = 'normal',
    textTransform = 'none'
  } = attributes;

  // Sync content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Auto-focus when selected
  useEffect(() => {
    if (isSelected && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isSelected]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
    onChange(newContent, attributes);
  }, [onChange, attributes]);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(localContent, { ...attributes, [key]: value });
  }, [onChange, localContent, attributes]);

  // Handle text selection for link insertion
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
    }
  }, []);

  // Apply text formatting
  const applyFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Update content after formatting
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML);
    }
  }, [handleContentChange]);

  // Apply highlight to selected text
  const applyHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString() && highlightColor) {
      const rgba = `rgba(${highlightColor.slice(1).match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, ${highlightOpacity})`;
      applyFormat('hiliteColor', rgba);
    }
  }, [highlightColor, highlightOpacity, applyFormat]);

  // Insert inline image
  const insertInlineImage = useCallback((imageData: InlineImageData) => {
    const selection = window.getSelection();
    if (selection && editorRef.current) {
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      if (range) {
        // Create image element
        const img = document.createElement('img');
        img.src = imageData.src;
        img.alt = imageData.alt;
        img.style.width = `${imageData.width}px`;
        img.style.height = `${imageData.height}px`;
        img.style.verticalAlign = imageData.align;
        img.style.display = imageData.textWrap ? 'inline' : 'inline-block';
        img.style.margin = '0 4px';
        img.className = 'inline-image';

        // Insert at cursor position
        range.insertNode(img);

        // Move cursor after image
        range.setStartAfter(img);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        // Update content
        handleContentChange(editorRef.current.innerHTML);
      }
    }
  }, [handleContentChange]);

  // Reset drop cap to defaults
  const resetDropCap = useCallback(() => {
    onChange(localContent, {
      ...attributes,
      dropCapLines: 3,
      dropCapColor: '#000000',
      dropCapFontSize: 64,
      dropCapFontWeight: 700,
    });
  }, [localContent, attributes, onChange]);

  // Reset typography to defaults
  const resetTypography = useCallback(() => {
    onChange(localContent, {
      ...attributes,
      fontSize: 16,
      lineHeight: 1.6,
      letterSpacing: 0,
      wordSpacing: 0,
      fontWeight: 400,
      fontStyle: 'normal',
      textTransform: 'none',
    });
  }, [localContent, attributes, onChange]);

  // Insert link with better UX
  const insertLink = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
      setShowLinkPopover(true);
    } else {
      // If no text selected, prompt to select text first
      alert('Please select some text first to add a link');
    }
  }, []);

  // Apply link to selected text
  const applyLink = useCallback(() => {
    if (linkUrl && selectedText) {
      applyFormat('createLink', linkUrl);
      setShowLinkPopover(false);
      setLinkUrl('');
      setSelectedText('');
    }
  }, [linkUrl, selectedText, applyFormat]);

  // Handle Enter key for block split
  const handleSplit = useCallback((value: string, isOriginal?: boolean) => {
    if (isOriginal) {
      onChange(value, attributes);
    }
    // Create new paragraph block after this one
    onAddBlock?.('after', 'paragraph');
  }, [onChange, attributes, onAddBlock]);

  // Handle block merge
  const handleMerge = useCallback(() => {
    // Merge with previous block logic would go here
  }, []);

  // Handle block removal when empty
  const handleRemove = useCallback(() => {
    if (!localContent || localContent === '' || localContent === '<br>') {
      onDelete();
    }
  }, [localContent, onDelete]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Format shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
        case 'k':
          e.preventDefault();
          insertLink();
          break;
      }
    }
    
    // Block navigation
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (e.key === '/' && localContent === '') {
        // Trigger block inserter
        e.preventDefault();
        // This would open block selector in real implementation
      }
    }
  }, [applyFormat, insertLink, localContent]);

  // Visual state classes
  const blockClasses = cn(
    'paragraph-test-block relative transition-all duration-200',
    'before:content-[""] before:absolute before:inset-0 before:pointer-events-none',
    'before:border-2 before:rounded before:transition-all',
    !isSelected && !isHovered && 'before:border-transparent',
    isHovered && !isSelected && 'before:border-gray-200 before:border-dashed',
    isSelected && 'before:border-blue-500',
    isSelected && 'before:shadow-sm'
  );

  // Content area classes with enhanced drop cap
  const contentClasses = cn(
    'paragraph-content relative',
    'min-h-[1.8em] outline-none',
    align === 'center' && 'text-center',
    align === 'right' && 'text-right',
    align === 'justify' && 'text-justify',
    isFocused && 'ring-2 ring-blue-500 ring-opacity-20 rounded'
  );

  // Drop cap styles
  const dropCapStyles = dropCap ? {
    '--drop-cap-font-size': `${dropCapFontSize}px`,
    '--drop-cap-color': dropCapColor,
    '--drop-cap-font-weight': dropCapFontWeight,
    '--drop-cap-line-height': `${dropCapLines * 0.8}rem`,
  } as React.CSSProperties : {};

  // Content styles with enhanced typography
  const contentStyles: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight,
    letterSpacing: letterSpacing ? `${letterSpacing}em` : undefined,
    wordSpacing: wordSpacing ? `${wordSpacing}em` : undefined,
    color: textColor || undefined,
    backgroundColor: backgroundColor || undefined,
    padding: padding ? `${padding}px` : undefined,
    margin: margin ? `${margin}px` : undefined,
    borderRadius: borderRadius ? `${borderRadius}px` : undefined,
    fontWeight,
    fontStyle,
    textTransform,
    ...dropCapStyles,
  };

  return (
    <>
      {/* Enhanced Block Controls */}
      {isSelected && (
        <BlockControls>
          {/* Primary Text Formatting */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Bold className="h-4 w-4" />}
              label="Bold (Ctrl+B)"
              onClick={() => applyFormat('bold')}
              isActive={document.queryCommandState('bold')}
            />
            <ToolbarButton
              icon={<Italic className="h-4 w-4" />}
              label="Italic (Ctrl+I)"
              onClick={() => applyFormat('italic')}
              isActive={document.queryCommandState('italic')}
            />
            <ToolbarButton
              icon={<Underline className="h-4 w-4" />}
              label="Underline (Ctrl+U)"
              onClick={() => applyFormat('underline')}
              isActive={document.queryCommandState('underline')}
            />
            <ToolbarButton
              icon={<Strikethrough className="h-4 w-4" />}
              label="Strikethrough"
              onClick={() => applyFormat('strikeThrough')}
              isActive={document.queryCommandState('strikeThrough')}
            />
          </ToolbarGroup>

          {/* Link, Image and Code */}
          <ToolbarGroup>
            <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
              <PopoverTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2"
                  onClick={insertLink}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Add Link</h4>
                  <Input
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkPopover(false)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={applyLink}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <InlineImageInserter onInsert={insertInlineImage} />

            <ToolbarButton
              icon={<Code className="h-4 w-4" />}
              label="Inline Code"
              onClick={() => {
                const selection = window.getSelection();
                if (selection && selection.toString()) {
                  applyFormat('insertHTML', `<code>${selection.toString()}</code>`);
                }
              }}
            />
          </ToolbarGroup>

          {/* Advanced Formatting */}
          <ToolbarGroup>
            <HighlightSelector
              selectedColor={highlightColor}
              opacity={highlightOpacity}
              onColorChange={(color) => updateAttribute('highlightColor', color)}
              onOpacityChange={(opacity) => updateAttribute('highlightOpacity', opacity)}
              onClear={() => updateAttribute('highlightColor', '')}
              onApply={applyHighlight}
            />

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="sm" className="h-9 px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => applyFormat('subscript')}>
                  <Subscript className="h-4 w-4 mr-2" />
                  Subscript
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyFormat('superscript')}>
                  <Superscript className="h-4 w-4 mr-2" />
                  Superscript
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDropCapSettings(!showDropCapSettings)}>
                  <Type className="h-4 w-4 mr-2" />
                  Drop Cap Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTypographySettings(!showTypographySettings)}>
                  <Type className="h-4 w-4 mr-2" />
                  Typography Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => applyFormat('removeFormat')}>
                  <RemoveFormatting className="h-4 w-4 mr-2" />
                  Clear Formatting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ToolbarGroup>

          {/* Text Alignment */}
          <AlignmentToolbar
            value={align}
            onChange={(newAlign) => updateAttribute('align', newAlign)}
          />
        </BlockControls>
      )}

      {/* Inspector Controls removed - now handled by GutenbergSidebar */}

      {/* Block Content with Enhanced Visual Feedback */}
      <div
        ref={blockRef}
        className={blockClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={editorRef}
          className={cn(
            contentClasses,
            dropCap && 'drop-cap-enabled',
            dropCap && `lines-${dropCapLines}`
          )}
          style={contentStyles}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseUp={handleTextSelection}
        >
          <RichText
            tagName="p"
            value={localContent}
            onChange={handleContentChange}
            onSplit={handleSplit}
            onMerge={handleMerge}
            onRemove={handleRemove}
            placeholder="Start writing or type / to choose a block"
            allowedFormats={[
              'core/bold',
              'core/italic',
              'core/link',
              'core/strikethrough',
              'core/code',
              'core/underline',
              'core/subscript',
              'core/superscript'
            ]}
          />
        </div>
        
        {/* Hover hint when empty */}
        {!localContent && isHovered && !isSelected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-gray-400">
              Click to start writing
            </span>
          </div>
        )}
      </div>

      {/* Drop Cap Settings Panel */}
      {isSelected && showDropCapSettings && (
        <div className="mt-4">
          <DropCapController
            isEnabled={dropCap}
            lines={dropCapLines}
            color={dropCapColor}
            fontSize={dropCapFontSize}
            fontWeight={dropCapFontWeight}
            onToggle={(enabled) => updateAttribute('dropCap', enabled)}
            onLinesChange={(lines) => updateAttribute('dropCapLines', lines)}
            onColorChange={(color) => updateAttribute('dropCapColor', color)}
            onFontSizeChange={(size) => updateAttribute('dropCapFontSize', size)}
            onFontWeightChange={(weight) => updateAttribute('dropCapFontWeight', weight)}
            onReset={resetDropCap}
          />
        </div>
      )}

      {/* Typography Settings Panel */}
      {isSelected && showTypographySettings && (
        <div className="mt-4">
          <TypographyPanel
            fontSize={fontSize}
            lineHeight={lineHeight}
            letterSpacing={letterSpacing}
            wordSpacing={wordSpacing}
            textTransform={textTransform}
            fontWeight={fontWeight}
            fontStyle={fontStyle}
            onFontSizeChange={(size) => updateAttribute('fontSize', size)}
            onLineHeightChange={(height) => updateAttribute('lineHeight', height)}
            onLetterSpacingChange={(spacing) => updateAttribute('letterSpacing', spacing)}
            onWordSpacingChange={(spacing) => updateAttribute('wordSpacing', spacing)}
            onTextTransformChange={(transform) => updateAttribute('textTransform', transform)}
            onFontWeightChange={(weight) => updateAttribute('fontWeight', weight)}
            onFontStyleChange={(style) => updateAttribute('fontStyle', style)}
            onReset={resetTypography}
          />
        </div>
      )}
    </>
  );
};

export default ParagraphBlock;
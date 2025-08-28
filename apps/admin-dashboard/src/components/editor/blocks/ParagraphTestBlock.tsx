/**
 * ParagraphTestBlock Component
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
import { 
  InspectorControls, 
  PanelBody, 
  ToggleControl, 
  RangeControl,
  ColorPalette
} from '../gutenberg/InspectorControls';

interface ParagraphTestBlockProps {
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
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
    textColor?: string;
    backgroundColor?: string;
    highlightColor?: string;
    padding?: number;
    margin?: number;
    borderRadius?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  };
}

const ParagraphTestBlock: React.FC<ParagraphTestBlockProps> = ({
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
  const blockRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Default attributes with fallbacks
  const {
    align = 'left',
    dropCap = false,
    fontSize = 16,
    lineHeight = 1.6,
    letterSpacing = 0,
    textColor = '#1e293b',
    backgroundColor = '',
    highlightColor = '',
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

  // Content area classes
  const contentClasses = cn(
    'paragraph-content relative',
    'min-h-[1.8em] outline-none',
    align === 'center' && 'text-center',
    align === 'right' && 'text-right',
    align === 'justify' && 'text-justify',
    dropCap && 'first-letter:float-left first-letter:text-5xl first-letter:font-bold first-letter:mr-2 first-letter:mt-1',
    isFocused && 'ring-2 ring-blue-500 ring-opacity-20 rounded'
  );

  // Content styles
  const contentStyles: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight,
    letterSpacing: letterSpacing ? `${letterSpacing}em` : undefined,
    color: textColor || undefined,
    backgroundColor: backgroundColor || undefined,
    padding: padding ? `${padding}px` : undefined,
    margin: margin ? `${margin}px` : undefined,
    borderRadius: borderRadius ? `${borderRadius}px` : undefined,
    fontWeight,
    fontStyle,
    textTransform,
    // Add highlight effect if specified
    ...(highlightColor && {
      background: `linear-gradient(180deg, transparent 60%, ${highlightColor} 60%)`,
    })
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

          {/* Link and Code */}
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
                <DropdownMenuItem onClick={() => updateAttribute('highlightColor', '#fef08a')}>
                  <Highlighter className="h-4 w-4 mr-2" />
                  Highlight
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

      {/* Enhanced Inspector Controls */}
      {isSelected && (
        <InspectorControls>
          {/* Typography Panel */}
          <PanelBody title="Typography" initialOpen={true}>
            <RangeControl
              label="Font Size"
              value={fontSize}
              onChange={(value) => updateAttribute('fontSize', value)}
              min={12}
              max={48}
              step={1}
            />
            
            <RangeControl
              label="Line Height"
              value={lineHeight}
              onChange={(value) => updateAttribute('lineHeight', value)}
              min={1}
              max={3}
              step={0.1}
            />
            
            <RangeControl
              label="Letter Spacing"
              value={letterSpacing}
              onChange={(value) => updateAttribute('letterSpacing', value)}
              min={-0.1}
              max={0.5}
              step={0.01}
            />
            
            <RangeControl
              label="Font Weight"
              value={fontWeight}
              onChange={(value) => updateAttribute('fontWeight', value)}
              min={100}
              max={900}
              step={100}
            />
            
            <ToggleControl
              label="Drop Cap"
              help="Display first letter as large initial"
              checked={dropCap}
              onChange={(checked) => updateAttribute('dropCap', checked)}
            />
            
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Text Transform
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={textTransform}
                onChange={(e) => updateAttribute('textTransform', e.target.value)}
              >
                <option value="none">None</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </div>
          </PanelBody>

          {/* Color Settings */}
          <PanelBody title="Colors" initialOpen={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Text Color
                </label>
                <ColorPalette
                  value={textColor}
                  onChange={(color) => updateAttribute('textColor', color)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Background Color
                </label>
                <ColorPalette
                  value={backgroundColor}
                  onChange={(color) => updateAttribute('backgroundColor', color)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Highlight Color
                </label>
                <ColorPalette
                  value={highlightColor}
                  onChange={(color) => updateAttribute('highlightColor', color)}
                />
              </div>
            </div>
          </PanelBody>

          {/* Spacing Settings */}
          <PanelBody title="Spacing" initialOpen={false}>
            <RangeControl
              label="Padding"
              value={padding}
              onChange={(value) => updateAttribute('padding', value)}
              min={0}
              max={60}
              step={5}
            />
            
            <RangeControl
              label="Margin"
              value={margin}
              onChange={(value) => updateAttribute('margin', value)}
              min={0}
              max={60}
              step={5}
            />
            
            <RangeControl
              label="Border Radius"
              value={borderRadius}
              onChange={(value) => updateAttribute('borderRadius', value)}
              min={0}
              max={20}
              step={1}
            />
          </PanelBody>
        </InspectorControls>
      )}

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
          className={contentClasses}
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
    </>
  );
};

export default ParagraphTestBlock;
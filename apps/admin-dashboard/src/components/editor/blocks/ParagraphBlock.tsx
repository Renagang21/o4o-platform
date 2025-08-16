/**
 * ParagraphBlock Component
 * Inline editable paragraph block with Gutenberg-style formatting
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Bold, 
  Italic, 
  Link2, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BlockWrapper from './BlockWrapper';

interface ParagraphBlockProps {
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
    align?: 'left' | 'center' | 'right' | 'justify';
    dropCap?: boolean;
    fontSize?: string;
    textColor?: string;
    backgroundColor?: string;
  };
}

const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
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
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    align = 'left',
    dropCap = false,
    fontSize = 'base',
    textColor = '',
    backgroundColor = ''
  } = attributes;

  // Sync content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Show toolbar on text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0 && isSelected) {
        setSelectedText(selection.toString());
        setShowToolbar(true);
        positionToolbar();
      } else {
        setShowToolbar(false);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [isSelected]);

  // Position toolbar above selected text
  const positionToolbar = () => {
    if (!toolbarRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    toolbarRef.current.style.position = 'fixed';
    toolbarRef.current.style.top = `${rect.top - 50}px`;
    toolbarRef.current.style.left = `${rect.left + rect.width / 2 - 150}px`;
  };

  // Apply formatting to selected text
  const applyFormat = (format: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    document.execCommand(format, false, value);
    handleContentChange();
  };

  // Handle content changes
  const handleContentChange = () => {
    if (!contentRef.current) return;
    const newContent = contentRef.current.innerHTML;
    setLocalContent(newContent);
    onChange(newContent, attributes);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      applyFormat('bold');
    }
    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      applyFormat('italic');
    }
    // Ctrl/Cmd + K for link
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowLinkPopover(true);
    }
    // Enter to create new paragraph block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAddBlock?.('after');
    }
    // Shift + Enter for line break
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br>');
      handleContentChange();
    }
    // / to open block inserter
    if (e.key === '/' && contentRef.current?.innerText === '') {
      // Trigger block inserter
      e.preventDefault();
      // This would open the block inserter menu
    }
  };

  // Handle paste - strip unwanted formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleContentChange();
  };

  // Update alignment
  const updateAlignment = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    onChange(localContent, { ...attributes, align: newAlign });
  };

  // Toggle drop cap
  const toggleDropCap = () => {
    onChange(localContent, { ...attributes, dropCap: !dropCap });
  };

  // Update font size
  const updateFontSize = (size: string) => {
    onChange(localContent, { ...attributes, fontSize: size });
  };

  // Add link
  const addLink = () => {
    if (linkUrl && selectedText) {
      applyFormat('createLink', linkUrl);
      setShowLinkPopover(false);
      setLinkUrl('');
    }
  };

  return (
    <BlockWrapper
      id={id}
      type="paragraph"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
    >
      {/* Floating Toolbar */}
      {showToolbar && isSelected && (
        <div
          ref={toolbarRef}
          className="floating-toolbar bg-white rounded-lg shadow-lg border p-1 flex items-center gap-1 z-50"
          style={{ position: 'fixed' }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormat('bold')}
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormat('italic')}
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
            <PopoverTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addLink();
                      }
                    }}
                  />
                </div>
                <Button onClick={addLink} size="sm">
                  Add Link
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormat('strikeThrough')}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => updateAlignment('left')}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => updateAlignment('center')}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => updateAlignment('right')}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => updateAlignment('justify')}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <Popover>
            <PopoverTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-4">
                <div>
                  <Label>Font Size</Label>
                  <Select value={fontSize} onValueChange={updateFontSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="base">Normal</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                      <SelectItem value="xl">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Drop Cap</Label>
                  <Button
                    variant={dropCap ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleDropCap}
                  >
                    {dropCap ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Editable Content */}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'paragraph-block outline-none',
          'min-h-[1.5em] px-2 py-1',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          align === 'justify' && 'text-justify',
          fontSize === 'sm' && 'text-sm',
          fontSize === 'base' && 'text-base',
          fontSize === 'lg' && 'text-lg',
          fontSize === 'xl' && 'text-xl',
          dropCap && 'first-letter:text-6xl first-letter:font-bold first-letter:float-left first-letter:mr-2',
          !localContent && 'text-gray-400'
        )}
        style={{
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined
        }}
        dangerouslySetInnerHTML={{ __html: localContent }}
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => {
          if (!localContent) {
            // Clear placeholder on focus
            if (contentRef.current) {
              contentRef.current.innerHTML = '';
            }
          }
        }}
        onBlur={() => {
          if (!contentRef.current?.innerText.trim()) {
            // Show placeholder
            if (contentRef.current) {
              contentRef.current.innerHTML = '<span class="text-gray-400">문단을 입력하거나 /를 눌러 블록을 선택하세요</span>';
            }
          }
        }}
        data-placeholder="문단을 입력하거나 /를 눌러 블록을 선택하세요"
      />
    </BlockWrapper>
  );
};

export default ParagraphBlock;
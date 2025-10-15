/**
 * EnhancedBlockWrapper Component
 * 향상된 블록 래퍼 - 완벽한 블록 조작 기능
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  GripVertical, 
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Check,
  ChevronDown as ChevronDownIcon,
  Bold,
  Italic,
  Type,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedBlockWrapperProps {
  id: string;
  type: string;
  children: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  onCopy?: () => void;
  onPaste?: () => void;
  isDragging?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  customToolbarContent?: ReactNode;
  customSidebarContent?: ReactNode;
  onAlignChange?: (align: 'left' | 'center' | 'right' | 'justify') => void;
  currentAlign?: 'left' | 'center' | 'right' | 'justify';
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onChangeType?: (newType: string) => void;
  currentType?: string;
  isBold?: boolean;
  isItalic?: boolean;
}

const EnhancedBlockWrapper: React.FC<EnhancedBlockWrapperProps> = ({
  id,
  type,
  children,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  onCopy,
  onPaste,
  isDragging = false,
  canMoveUp = true,
  canMoveDown = true,
  className,
  onDragStart,
  onDragOver: _onDragOver,
  onDrop: _onDrop,
  onDragEnd,
  customToolbarContent,
  onAlignChange,
  currentAlign = 'left',
  onToggleBold,
  onToggleItalic,
  onChangeType,
  currentType,
  isBold = false,
  isItalic = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  // Show toolbar when selected or hovered
  useEffect(() => {
    setShowToolbar(isSelected || isHovered);
  }, [isSelected, isHovered]);

  // Auto-focus block when selected
  useEffect(() => {
    if (isSelected && blockRef.current) {
      const focusableElement = blockRef.current.querySelector(
        '[contenteditable], input, textarea'
      );
      if (focusableElement instanceof HTMLElement) {
        focusableElement.focus();
      }
    }
  }, [isSelected]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - remove block
      if (e.key === 'Delete' && !e.shiftKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        // Only delete if not editing text
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onDelete();
        }
      }

      // Ctrl/Cmd + C - copy block
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        const selection = window.getSelection();
        if (!selection?.toString()) {
          e.preventDefault();
          onCopy?.();
        }
      }

      // Ctrl/Cmd + V - paste block
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onPaste?.();
        }
      }

      // Ctrl/Cmd + D - duplicate block
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        onDuplicate();
      }

      // Alt + Up/Down - move block
      if (e.altKey && !e.shiftKey) {
        if (e.key === 'ArrowUp' && canMoveUp) {
          e.preventDefault();
          onMoveUp();
        } else if (e.key === 'ArrowDown' && canMoveDown) {
          e.preventDefault();
          onMoveDown();
        }
      }

      // Tab/Shift+Tab - navigate between blocks
      if (e.key === 'Tab') {
        // This will be handled by parent component for block navigation
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, onDelete, onCopy, onPaste, onDuplicate, onMoveUp, onMoveDown, canMoveUp, canMoveDown]);

  return (
    <div
      ref={blockRef}
      data-block-id={id}
      data-block-type={type}
      className={cn(
        'block-wrapper group relative transition-all duration-200',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Left side drag handle - removed from here, now in toolbar */}

      {/* Block toolbar - integrated design with better positioning */}
      {showToolbar && isSelected && (
        <div className="absolute left-0 right-0 flex flex-col sm:flex-row items-start sm:items-center justify-between z-50 gap-2 -top-12 mb-2">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-0.5 sm:px-1 py-0.5 sm:py-1 overflow-x-auto max-w-full">
            {/* Drag handle - now in toolbar */}
            <div
              className="cursor-move p-0.5 sm:p-1 hover:bg-gray-100 rounded flex items-center flex-shrink-0"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('blockId', id);
                onDragStart?.();
              }}
              onDragEnd={onDragEnd}
              title="Drag to move block"
            >
              <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            </div>

            <div className="w-px h-4 sm:h-5 bg-gray-200 flex-shrink-0" />
            
            {/* Block Type Selector (Heading levels, Paragraph) */}
            {onChangeType && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 sm:h-7 px-1 sm:px-1.5 gap-0.5 hover:bg-gray-100 flex-shrink-0"
                      title="Block Type"
                    >
                      {currentType === 'o4o/paragraph' && <Type className="h-3 w-3 sm:h-4 sm:w-4" />}
                      {currentType === 'o4o/heading' && <Heading2 className="h-3 w-3 sm:h-4 sm:w-4" />}
                      {(!currentType || currentType === 'o4o/paragraph') && <Type className="h-3 w-3 sm:h-4 sm:w-4" />}
                      <ChevronDownIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem 
                      onClick={() => onChangeType('o4o/paragraph')}
                      className="gap-2 cursor-pointer"
                    >
                      <Type className="h-4 w-4" />
                      <span>Paragraph</span>
                      {currentType === 'o4o/paragraph' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onChangeType('o4o/heading-h1')}
                      className="gap-2 cursor-pointer"
                    >
                      <Heading1 className="h-4 w-4" />
                      <span>Heading 1</span>
                      {currentType === 'o4o/heading-h1' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onChangeType('o4o/heading-h2')}
                      className="gap-2 cursor-pointer"
                    >
                      <Heading2 className="h-4 w-4" />
                      <span>Heading 2</span>
                      {currentType === 'o4o/heading-h2' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onChangeType('o4o/heading-h3')}
                      className="gap-2 cursor-pointer"
                    >
                      <Heading3 className="h-4 w-4" />
                      <span>Heading 3</span>
                      {currentType === 'o4o/heading-h3' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onChangeType('o4o/heading-h4')}
                      className="gap-2 cursor-pointer"
                    >
                      <Heading4 className="h-4 w-4" />
                      <span>Heading 4</span>
                      {currentType === 'o4o/heading-h4' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onChangeType('o4o/heading-h5')}
                      className="gap-2 cursor-pointer"
                    >
                      <Heading5 className="h-4 w-4" />
                      <span>Heading 5</span>
                      {currentType === 'o4o/heading-h5' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onChangeType('o4o/heading-h6')}
                      className="gap-2 cursor-pointer"
                    >
                      <Heading6 className="h-4 w-4" />
                      <span>Heading 6</span>
                      {currentType === 'o4o/heading-h6' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-px h-4 sm:h-5 bg-gray-200 flex-shrink-0" />
              </>
            )}

            {/* Bold and Italic buttons for text blocks */}
            {(onToggleBold || onToggleItalic) && (
              <>
                {onToggleBold && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0",
                      isBold && "bg-gray-200"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBold();
                    }}
                    title="Bold (Ctrl+B)"
                  >
                    <Bold className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
                {onToggleItalic && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0",
                      isItalic && "bg-gray-200"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleItalic();
                    }}
                    title="Italic (Ctrl+I)"
                  >
                    <Italic className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
                <div className="w-px h-4 sm:h-5 bg-gray-200 flex-shrink-0" />
              </>
            )}
            
            {/* Text Alignment Dropdown - only show for text blocks */}
            {onAlignChange && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 sm:h-7 px-1 sm:px-1.5 gap-0.5 hover:bg-gray-100 flex-shrink-0"
                      title="Text Alignment"
                    >
                      {currentAlign === 'center' && <AlignCenter className="h-3 w-3 sm:h-4 sm:w-4" />}
                      {currentAlign === 'right' && <AlignRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                      {currentAlign === 'justify' && <AlignJustify className="h-3 w-3 sm:h-4 sm:w-4" />}
                      {(!currentAlign || currentAlign === 'left') && <AlignLeft className="h-3 w-3 sm:h-4 sm:w-4" />}
                      <ChevronDownIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem 
                      onClick={() => onAlignChange('left')}
                      className="gap-2 cursor-pointer"
                    >
                      <AlignLeft className="h-4 w-4" />
                      <span>왼쪽 정렬</span>
                      {(!currentAlign || currentAlign === 'left') && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onAlignChange('center')}
                      className="gap-2 cursor-pointer"
                    >
                      <AlignCenter className="h-4 w-4" />
                      <span>가운데 정렬</span>
                      {currentAlign === 'center' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onAlignChange('right')}
                      className="gap-2 cursor-pointer"
                    >
                      <AlignRight className="h-4 w-4" />
                      <span>오른쪽 정렬</span>
                      {currentAlign === 'right' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onAlignChange('justify')}
                      className="gap-2 cursor-pointer"
                    >
                      <AlignJustify className="h-4 w-4" />
                      <span>양쪽 정렬</span>
                      {currentAlign === 'justify' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-px h-4 sm:h-5 bg-gray-200 flex-shrink-0" />
              </>
            )}

            {/* Custom toolbar content (e.g., heading level selector) */}
            {customToolbarContent}

            {/* Move buttons - hide on mobile, show in More menu */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={!canMoveUp}
              title="Move block up (Alt+↑)"
            >
              <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={!canMoveDown}
              title="Move block down (Alt+↓)"
            >
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            <div className="hidden sm:block w-px h-4 sm:h-5 bg-gray-200 flex-shrink-0" />

            {/* Duplicate button - hide on mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate block (Ctrl+D)"
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Delete button - always visible */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 sm:h-7 px-1 sm:px-2 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete block (Delete)"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            <div className="w-px h-4 sm:h-5 bg-gray-200 flex-shrink-0" />

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0"
                >
                  <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {/* Mobile-only: Move and Duplicate options */}
                <div className="sm:hidden">
                  <DropdownMenuItem
                    onClick={() => onMoveUp()}
                    disabled={!canMoveUp}
                    className="gap-2"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onMoveDown()}
                    disabled={!canMoveDown}
                    className="gap-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate()} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Duplicate (Ctrl+D)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>

                <DropdownMenuItem onClick={() => onCopy?.()} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy block (Ctrl+C)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPaste?.()} className="gap-2">
                  Paste block (Ctrl+V)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAddBlock?.('before')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add block before
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddBlock?.('after')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add block after
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Block type indicator - hide on mobile */}
          <div className="hidden sm:block bg-gray-800 text-white text-xs px-2 py-1 rounded flex-shrink-0">
            {type.replace('core/', '').charAt(0).toUpperCase() + type.replace('core/', '').slice(1)}
          </div>
        </div>
      )}

      {/* Add block button - top */}
      {isHovered && !isSelected && (
        <button
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all z-40"
          onClick={(e) => {
            e.stopPropagation();
            onAddBlock?.('before');
          }}
          title="Add block before"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}

      {/* Block content with selection state */}
      <div 
        className={cn(
          'block-content relative rounded-sm transition-all duration-200',
          'before:content-[""] before:absolute before:inset-0 before:pointer-events-none',
          'before:border-2 before:rounded-sm before:transition-all',
          !isSelected && !isHovered && 'before:border-transparent',
          isHovered && !isSelected && 'before:border-gray-200 hover:bg-gray-50',
          isSelected && 'before:border-blue-500 before:shadow-md bg-blue-50/30',
          isDragging && 'opacity-50'
        )}
      >
        {children}
      </div>

      {/* Add block button - bottom */}
      {isHovered && !isSelected && (
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all z-40"
          onClick={(e) => {
            e.stopPropagation();
            onAddBlock?.('after');
          }}
          title="Add block after"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default EnhancedBlockWrapper;
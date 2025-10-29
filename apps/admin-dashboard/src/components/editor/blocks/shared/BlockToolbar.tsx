/**
 * BlockToolbar Component
 *
 * Reusable block toolbar with common block operations
 * Extracted from EnhancedBlockWrapper to reduce complexity
 */

import { ReactNode, forwardRef } from 'react';
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
  Link,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BlockToolbarProps {
  /** Block ID for drag and drop */
  id: string;
  /** Block type */
  type: string;
  /** Toolbar position */
  position: 'top' | 'bottom';
  /** Delete handler */
  onDelete: () => void;
  /** Duplicate handler */
  onDuplicate: () => void;
  /** Move up handler */
  onMoveUp: () => void;
  /** Move down handler */
  onMoveDown: () => void;
  /** Add block handler */
  onAddBlock?: (position: 'before' | 'after') => void;
  /** Copy handler */
  onCopy?: () => void;
  /** Paste handler */
  onPaste?: () => void;
  /** Can move up flag */
  canMoveUp?: boolean;
  /** Can move down flag */
  canMoveDown?: boolean;
  /** Drag start handler */
  onDragStart?: () => void;
  /** Drag end handler */
  onDragEnd?: () => void;
  /** Custom toolbar content */
  customToolbarContent?: ReactNode;
  /** Alignment change handler */
  onAlignChange?: (align: 'left' | 'center' | 'right' | 'justify') => void;
  /** Current alignment */
  currentAlign?: 'left' | 'center' | 'right' | 'justify';
  /** Toggle bold handler */
  onToggleBold?: () => void;
  /** Toggle italic handler */
  onToggleItalic?: () => void;
  /** Toggle link handler */
  onToggleLink?: () => void;
  /** Change type handler */
  onChangeType?: (newType: string) => void;
  /** Current type */
  currentType?: string;
  /** Bold state */
  isBold?: boolean;
  /** Italic state */
  isItalic?: boolean;
}

/**
 * Block toolbar with common operations
 *
 * Features:
 * - Drag handle
 * - Block type selector (Paragraph/Heading levels)
 * - Text formatting (Bold/Italic/Link)
 * - Alignment controls
 * - Move up/down buttons
 * - Duplicate/Delete buttons
 * - More menu with additional options
 * - Responsive design (mobile-friendly)
 *
 * @example
 * ```typescript
 * <BlockToolbar
 *   id={id}
 *   type={type}
 *   position={toolbarPosition}
 *   onDelete={onDelete}
 *   onDuplicate={onDuplicate}
 *   onMoveUp={onMoveUp}
 *   onMoveDown={onMoveDown}
 *   onAddBlock={onAddBlock}
 *   canMoveUp={canMoveUp}
 *   canMoveDown={canMoveDown}
 * />
 * ```
 */
export const BlockToolbar = forwardRef<HTMLDivElement, BlockToolbarProps>(
  (
    {
      id,
      type,
      position,
      onDelete,
      onDuplicate,
      onMoveUp,
      onMoveDown,
      onAddBlock,
      onCopy,
      onPaste,
      canMoveUp = true,
      canMoveDown = true,
      onDragStart,
      onDragEnd,
      customToolbarContent,
      onAlignChange,
      currentAlign = 'left',
      onToggleBold,
      onToggleItalic,
      onToggleLink,
      onChangeType,
      currentType,
      isBold = false,
      isItalic = false,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute left-0 right-0 flex flex-col sm:flex-row items-start sm:items-center justify-between z-50 gap-2',
          'transition-all duration-200 ease-out',
          position === 'top' ? '-translate-y-4' : 'translate-y-2'
        )}
        style={{
          [position === 'top' ? 'bottom' : 'top']: '100%',
          marginBottom: position === 'top' ? '16px' : undefined,
          marginTop: position === 'bottom' ? '8px' : undefined,
        }}
      >
        <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-0.5 sm:px-1 py-0.5 sm:py-1 overflow-x-auto max-w-full touch-pan-x">
          {/* Drag handle */}
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

          {/* Block Type Selector */}
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
                    {(!currentType || currentType === 'o4o/paragraph') && (
                      <Type className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
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

          {/* Text formatting buttons */}
          {(onToggleBold || onToggleItalic || onToggleLink) && (
            <>
              {onToggleBold && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0',
                    isBold && 'bg-gray-200'
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
                    'h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0',
                    isItalic && 'bg-gray-200'
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
              {onToggleLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 px-1 sm:px-2 hover:bg-gray-100 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLink();
                  }}
                  title="Link (Ctrl+K)"
                >
                  <Link className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
              <div className="w-px h-4 sm:h-5 bg-gray-200 flex-shrink-0" />
            </>
          )}

          {/* Alignment dropdown */}
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
                    {(!currentAlign || currentAlign === 'left') && (
                      <AlignLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
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

          {/* Custom toolbar content */}
          {customToolbarContent}

          {/* Move buttons */}
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

          {/* Duplicate button */}
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

          {/* Delete button */}
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

          {/* More menu */}
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
              {/* Mobile-only options */}
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

        {/* Block type indicator */}
        <div className="hidden sm:block bg-gray-800 text-white text-xs px-2 py-1 rounded flex-shrink-0">
          {type.replace('core/', '').charAt(0).toUpperCase() + type.replace('core/', '').slice(1)}
        </div>
      </div>
    );
  }
);

BlockToolbar.displayName = 'BlockToolbar';

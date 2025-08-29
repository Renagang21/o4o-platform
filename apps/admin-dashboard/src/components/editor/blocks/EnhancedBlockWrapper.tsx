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
  MoreVertical
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
  customToolbarContent
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
      {/* Left side drag handle */}
      <div
        className={cn(
          'absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 transition-opacity',
          (isHovered || isSelected) && 'opacity-100'
        )}
      >
        <div
          className="cursor-move p-1 hover:bg-gray-100 rounded"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('blockId', id);
            onDragStart?.();
          }}
          onDragEnd={onDragEnd}
          title="Drag to move block"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Block toolbar - integrated design */}
      {showToolbar && isSelected && (
        <div className="absolute -top-9 left-0 right-0 flex items-center justify-between z-50">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-1 py-1">
            {/* Custom toolbar content (e.g., heading level selector) */}
            {customToolbarContent}
            
            {/* Move buttons */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={!canMoveUp}
              title="Move block up (Alt+↑)"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={!canMoveDown}
              title="Move block down (Alt+↓)"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            <div className="w-px h-5 bg-gray-200" />

            {/* Duplicate button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate block (Ctrl+D)"
            >
              <Copy className="h-4 w-4" />
            </Button>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-red-100 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete block (Delete)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-gray-200" />

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 hover:bg-gray-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onCopy?.()}>
                  Copy block (Ctrl+C)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPaste?.()}>
                  Paste block (Ctrl+V)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAddBlock?.('before')}>
                  Add block before
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddBlock?.('after')}>
                  Add block after
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Block type indicator */}
          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
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
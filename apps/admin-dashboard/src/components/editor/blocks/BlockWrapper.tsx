/**
 * BlockWrapper Component
 * Provides common functionality for all Gutenberg blocks
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  GripVertical, 
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockWrapperProps {
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
  isDragging?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({
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
  isDragging = false,
  canMoveUp = true,
  canMoveDown = true,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  // Auto-focus block when selected
  useEffect(() => {
    if (isSelected && blockRef.current) {
      const focusableElement = blockRef.current.querySelector(
        '[contenteditable], input, textarea, button'
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
      // Block-level shortcuts
      if (e.altKey && e.shiftKey) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            onMoveUp();
            break;
          case 'ArrowDown':
            e.preventDefault();
            onMoveDown();
            break;
          case 'd':
            e.preventDefault();
            onDuplicate();
            break;
        }
      }

      // Delete block
      if (e.key === 'Delete' && e.shiftKey) {
        e.preventDefault();
        onDelete();
      }

      // Add new block
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        onAddBlock?.('after');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, onMoveUp, onMoveDown, onDuplicate, onDelete, onAddBlock]);

  return (
    <div
      ref={blockRef}
      data-block-id={id}
      data-block-type={type}
      className={cn(
        'block-wrapper group relative transition-all duration-200',
        isSelected && 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50 rounded-sm',
        isHovered && !isSelected && 'ring-1 ring-gray-300 rounded-sm',
        isDragging && 'opacity-50',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Block toolbar - show when selected */}
      {isSelected && (
        <div className="absolute -top-10 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded-md shadow-md p-1 z-50">
          {/* Move buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            title="Move up (Alt+Shift+↑)"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            title="Move down (Alt+Shift+↓)"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Duplicate button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate block (Alt+Shift+D)"
          >
            <Copy className="h-3 w-3" />
          </Button>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete block (Shift+Delete)"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          
          <div className="w-px h-5 bg-gray-300 mx-1" />
          
          {/* Drag handle */}
          <div
            className="cursor-move p-1 hover:bg-gray-100 rounded"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('blockId', id);
            }}
            title="Drag to move block"
          >
            <GripVertical className="h-3 w-3" />
          </div>
        </div>
      )}

      {/* Add block quick inserter - show on hover between blocks */}
      {isHovered && !isSelected && (
        <button
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity z-40"
          onClick={(e) => {
            e.stopPropagation();
            onAddBlock?.('before');
          }}
          title="Add block before"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}

      {/* Block content */}
      <div className="block-content">
        {children}
      </div>

      {/* Bottom add block button */}
      {isHovered && !isSelected && (
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity z-40"
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

export default BlockWrapper;
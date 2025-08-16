/**
 * BlockWrapper Component
 * Provides common functionality for all Gutenberg blocks
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  GripVertical, 
  Plus, 
  MoreVertical,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [showAddButton, setShowAddButton] = useState(false);
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
        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
        isHovered && !isSelected && 'ring-1 ring-gray-300',
        isDragging && 'opacity-50',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowAddButton(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Left side controls - only show when hovered or selected */}
      {(isHovered || isSelected) && (
        <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Drag handle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 cursor-move"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('blockId', id);
            }}
          >
            <GripVertical className="h-4 w-4" />
          </Button>

          {/* Add block button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddButton(!showAddButton);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={!canMoveUp}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Move Up
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={!canMoveDown}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Move Down
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Add block position selector */}
      {showAddButton && (
        <div className="absolute -left-48 top-10 bg-white rounded-lg shadow-lg border p-2 z-50">
          <div className="text-xs text-gray-500 mb-2">Add block:</div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddBlock?.('before');
                setShowAddButton(false);
              }}
            >
              Before
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddBlock?.('after');
                setShowAddButton(false);
              }}
            >
              After
            </Button>
          </div>
        </div>
      )}

      {/* Block content */}
      <div className="block-content">
        {children}
      </div>

      {/* Bottom add block line */}
      {isHovered && (
        <div 
          className="absolute -bottom-3 left-0 right-0 h-6 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAddBlock?.('after');
          }}
        >
          <div className="flex items-center gap-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
            <Plus className="h-3 w-3" />
            Add block
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockWrapper;
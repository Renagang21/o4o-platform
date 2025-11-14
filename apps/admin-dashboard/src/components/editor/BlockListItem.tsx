/**
 * BlockListItem Component
 *
 * Individual block item in the List View sidebar.
 * Provides quick actions for block manipulation:
 * - Select and navigate to block
 * - Move up/down
 * - Duplicate
 * - Delete
 * - Drag-and-drop reordering
 *
 * Inspired by WordPress Gutenberg List View
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  GripVertical,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BlockListItemProps {
  blockId: string;
  blockType: string;
  blockIndex: number;
  blockPreview: string;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

// Block type to icon mapping
const getBlockIcon = (blockType: string): React.ReactNode => {
  const type = blockType.replace('o4o/', '').toLowerCase();

  switch (type) {
    case 'paragraph':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4h14v2H3V4zm0 4h14v2H3V8zm0 4h10v2H3v-2z" />
        </svg>
      );
    case 'heading':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4h2v6h4V4h2v12h-2v-6H5v6H3V4zm12 0h2l-3 12h-2l3-12z" />
        </svg>
      );
    case 'image':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3h14v14H3V3zm2 2v10h10V5H5zm2 2l3 4 2-2 3 4H7l2-3-2-3z" />
        </svg>
      );
    case 'list':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 6h12v2H4V6zm0 4h12v2H4v-2zm0 4h12v2H4v-2zM2 6a1 1 0 112 0 1 1 0 01-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0z" />
        </svg>
      );
    case 'quote':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 7h5v5H5V9H3V7zm9 0h5v5h-3V9h-2V7z" />
        </svg>
      );
    case 'code':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 7l-3 3 3 3v2L2 10l4-5v2zm8 0v-2l4 5-4 5v-2l3-3-3-3z" />
        </svg>
      );
    case 'columns':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3h6v14H3V3zm8 0h6v14h-6V3z" />
        </svg>
      );
    case 'cover':
    case 'hero':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3h14v8H3V3zm0 10h14v4H3v-4z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4h12v12H4V4zm2 2v8h8V6H6z" />
        </svg>
      );
  }
};

export const BlockListItem: React.FC<BlockListItemProps> = ({
  blockId,
  blockType,
  blockIndex,
  blockPreview,
  isSelected,
  canMoveUp,
  canMoveDown,
  isDragging = false,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const cleanBlockType = blockType.replace('o4o/', '');

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative rounded-md transition-all',
        isSelected && 'bg-blue-50 border border-blue-200',
        !isSelected && 'hover:bg-gray-100 border border-transparent',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        {/* Drag Handle */}
        <div
          className={cn(
            'flex-shrink-0 cursor-grab active:cursor-grabbing transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Block Number */}
        <span className="text-xs font-mono text-gray-400 flex-shrink-0 w-6 text-right">
          {blockIndex + 1}
        </span>

        {/* Block Icon and Content */}
        <button
          onClick={onSelect}
          className="flex-1 flex items-start gap-2 text-left min-w-0"
        >
          {/* Block Type Icon */}
          <div className={cn(
            'flex-shrink-0 mt-0.5',
            isSelected ? 'text-blue-600' : 'text-gray-500'
          )}>
            {getBlockIcon(blockType)}
          </div>

          {/* Block Info */}
          <div className="flex-1 min-w-0">
            <div className={cn(
              'text-xs font-semibold capitalize',
              isSelected ? 'text-blue-700' : 'text-gray-700'
            )}>
              {cleanBlockType}
            </div>
            {blockPreview && (
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {blockPreview}
              </div>
            )}
          </div>
        </button>

        {/* Action Buttons (shown on hover or when selected) */}
        {(isHovered || isSelected) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Move Up */}
            {canMoveUp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                title="Move up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}

            {/* Move Down */}
            {canMoveDown && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                title="Move down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

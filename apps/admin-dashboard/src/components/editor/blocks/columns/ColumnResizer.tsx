/**
 * ColumnResizer Component
 * 컬럼 사이 드래그 핸들
 */

import React from 'react';
import { useColumnResize } from './useColumnResize';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface ColumnResizerProps {
  leftIndex: number;
  rightIndex: number;
  columnWidths: number[];
  onResize: (newWidths: number[]) => void;
  isVisible?: boolean;
}

export const ColumnResizer: React.FC<ColumnResizerProps> = ({
  leftIndex,
  rightIndex,
  columnWidths,
  onResize,
  isVisible = true,
}) => {
  const { isDragging, handleMouseDown } = useColumnResize({
    leftIndex,
    rightIndex,
    columnWidths,
    onResize,
    minWidth: 10,
  });

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'column-resizer',
        'absolute top-0 bottom-0 w-4 -ml-2 z-10',
        'flex items-center justify-center',
        'cursor-col-resize',
        'group',
        isDragging && 'is-dragging'
      )}
      onMouseDown={handleMouseDown}
      style={{
        left: `${columnWidths.slice(0, leftIndex + 1).reduce((sum, w) => sum + w, 0)}%`,
      }}
    >
      {/* Drag handle visual indicator */}
      <div
        className={cn(
          'handle',
          'w-1 h-12 rounded-full',
          'bg-blue-400 opacity-0',
          'group-hover:opacity-100',
          'transition-opacity duration-200',
          isDragging && 'opacity-100 bg-blue-600'
        )}
      >
        <GripVertical className="w-4 h-4 text-white -ml-1.5" />
      </div>

      {/* Wider hit area for easier dragging */}
      <div className="absolute inset-0 w-4" />
    </div>
  );
};

export default ColumnResizer;

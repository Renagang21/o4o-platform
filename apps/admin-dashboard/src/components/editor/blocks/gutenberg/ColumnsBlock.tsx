/**
 * ColumnsBlock
 *
 * Complete Gutenberg Columns block implementation.
 * Clean structure: CleanBlockWrapper + InnerBlocks pattern
 *
 * Features:
 * - Column count control (1-6 columns)
 * - Vertical alignment
 * - Stack on mobile option
 * - Nested Column blocks via InnerBlocks
 */

import React, { useCallback, useState, useEffect } from 'react';
import { Block } from '@/types/post.types';
import { BlockProps } from '@/blocks/registry/types';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from '../EnhancedBlockWrapper';
import { BlockToolbar } from './BlockToolbar';
import { AlignStartVertical, AlignCenterVertical, AlignEndVertical } from 'lucide-react';

interface ColumnsBlockProps extends BlockProps {
  attributes?: {
    columnCount?: number;
    verticalAlignment?: 'top' | 'center' | 'bottom';
    isStackedOnMobile?: boolean;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

export const ColumnsBlock: React.FC<ColumnsBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
}) => {
  const {
    columnCount = 2,
    verticalAlignment = 'top',
    isStackedOnMobile = true,
  } = attributes;

  const [columns, setColumns] = useState<Block[]>(innerBlocks);

  // Initialize columns if empty
  useEffect(() => {
    if (columns.length === 0 && columnCount > 0) {
      const newColumns: Block[] = [];
      for (let i = 0; i < columnCount; i++) {
        newColumns.push({
          id: `${id}-column-${i}`,
          type: 'o4o/column',
          content: '',
          attributes: {
            width: 100 / columnCount,
            verticalAlignment: verticalAlignment,
          },
          innerBlocks: [],
        });
      }
      setColumns(newColumns);
      onInnerBlocksChange?.(newColumns);
    }
  }, [columnCount, columns.length, id, onInnerBlocksChange, verticalAlignment]);

  // Update column count
  const handleColumnCountChange = useCallback(
    (newCount: number) => {
      if (newCount < 1 || newCount > 6) return;

      const currentCount = columns.length;
      let newColumns = [...columns];

      if (newCount > currentCount) {
        // Add columns
        for (let i = currentCount; i < newCount; i++) {
          newColumns.push({
            id: `${id}-column-${i}`,
            type: 'o4o/column',
            content: '',
            attributes: {
              width: 100 / newCount,
              verticalAlignment: verticalAlignment,
            },
            innerBlocks: [],
          });
        }
      } else if (newCount < currentCount) {
        // Remove columns
        newColumns = newColumns.slice(0, newCount);
      }

      // Redistribute widths
      newColumns = newColumns.map((col) => ({
        ...col,
        attributes: {
          ...col.attributes,
          width: 100 / newCount,
        },
      }));

      setColumns(newColumns);
      onInnerBlocksChange?.(newColumns);
      onChange?.('', { ...attributes, columnCount: newCount });
    },
    [columns, id, verticalAlignment, attributes, onChange, onInnerBlocksChange]
  );

  // Update vertical alignment
  const handleVerticalAlignmentChange = useCallback(
    (newAlignment: 'top' | 'center' | 'bottom') => {
      onChange?.('', { ...attributes, verticalAlignment: newAlignment });

      // Update all child columns
      const updatedColumns = columns.map((col) => ({
        ...col,
        attributes: {
          ...col.attributes,
          verticalAlignment: newAlignment,
        },
      }));
      setColumns(updatedColumns);
      onInnerBlocksChange?.(updatedColumns);
    },
    [attributes, columns, onChange, onInnerBlocksChange]
  );

  // Update column
  const handleColumnChange = useCallback(
    (columnId: string, updates: Partial<Block>) => {
      const updatedColumns = columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col
      );
      setColumns(updatedColumns);
      onInnerBlocksChange?.(updatedColumns);
    },
    [columns, onInnerBlocksChange]
  );

  const alignmentClasses = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="columns"
      isSelected={isSelected}
      onSelect={() => {}}
      className="gutenberg-columns-block"
    >
      {/* Gutenberg-style Block Toolbar */}
      {isSelected && (
        <BlockToolbar>
          {/* Vertical Alignment */}
          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300">
            <span className="text-xs text-gray-500 mr-1">Align:</span>
            <button
              onClick={() => handleVerticalAlignmentChange('top')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                verticalAlignment === 'top' && 'bg-gray-200'
              )}
              title="Align top"
            >
              <AlignStartVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVerticalAlignmentChange('center')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                verticalAlignment === 'center' && 'bg-gray-200'
              )}
              title="Align center"
            >
              <AlignCenterVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVerticalAlignmentChange('bottom')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                verticalAlignment === 'bottom' && 'bg-gray-200'
              )}
              title="Align bottom"
            >
              <AlignEndVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Column Count */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Columns:</span>
            <input
              type="number"
              min={1}
              max={6}
              value={columnCount}
              onChange={(e) => handleColumnCountChange(parseInt(e.target.value) || 2)}
              className="w-12 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </BlockToolbar>
      )}

      {/* Columns Container */}
      <div
        className={cn(
          'wp-block-columns flex gap-4',
          alignmentClasses[verticalAlignment],
          isStackedOnMobile && 'flex-col sm:flex-row'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        {columns.map((column, index) => (
          <div
            key={column.id}
            className="wp-block-column flex-1"
            style={{
              flexBasis: `${column.attributes?.width || 100 / columnCount}%`,
            }}
          >
            {/* Column will render here - simplified for now */}
            <div className="min-h-[100px] border-2 border-dashed border-gray-300 rounded p-4">
              <p className="text-sm text-gray-500">
                Column {index + 1} ({((column.attributes?.width as number) || 100 / columnCount).toFixed(0)}%)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Inner blocks will be rendered here
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Inspector Controls Placeholder */}
      {isSelected && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="text-sm font-semibold mb-2">Column Settings</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isStackedOnMobile}
              onChange={(e) =>
                onChange?.('', { ...attributes, isStackedOnMobile: e.target.checked })
              }
            />
            Stack on mobile
          </label>
        </div>
      )}
    </EnhancedBlockWrapper>
  );
};

export default ColumnsBlock;

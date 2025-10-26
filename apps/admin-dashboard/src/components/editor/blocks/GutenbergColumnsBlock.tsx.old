/**
 * GutenbergColumnsBlock Component
 * WordPress Gutenberg Columns 블록 완전 모방
 *
 * Features:
 * - Variation picker (6 presets)
 * - Drag handles to resize columns
 * - Block controls (vertical alignment)
 * - Inspector controls (column count, stack on mobile)
 * - Max 6 columns with warning
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Block } from '@/types/post.types';
import { BlockProps } from '@/blocks/registry/types';
import { cn } from '@/lib/utils';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { ColumnsVariationPicker } from './columns/ColumnsVariationPicker';
import { ColumnResizer } from './columns/ColumnResizer';
import { ColumnVariation, getDefaultVariation } from '@/blocks/variations/columns-variations';
import GutenbergColumnBlock from './GutenbergColumnBlock';

interface GutenbergColumnsBlockProps extends BlockProps {
  attributes?: {
    columnCount?: number;
    verticalAlignment?: 'top' | 'center' | 'bottom';
    isStackedOnMobile?: boolean;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const GutenbergColumnsBlock: React.FC<GutenbergColumnsBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    columnCount = 2,
    verticalAlignment = 'top',
    isStackedOnMobile = true,
  } = attributes;

  const [showVariationPicker, setShowVariationPicker] = useState(false);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const hasInitializedRef = useRef(false);

  // Initialize columns from innerBlocks or show variation picker
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (innerBlocks.length === 0) {
      // Show variation picker for new blocks
      setShowVariationPicker(true);
    } else {
      // Extract widths from existing innerBlocks
      const widths = innerBlocks.map(block => block.attributes?.width || 100 / innerBlocks.length);
      setColumnWidths(widths);
      hasInitializedRef.current = true;
    }
  }, [innerBlocks.length]);

  // Handle variation selection
  const handleVariationSelect = useCallback((variation: ColumnVariation) => {
    const newColumns: Block[] = variation.innerBlocks.map(([type, attrs], index) => ({
      id: `column-${Date.now()}-${index}`,
      clientId: `client-column-${Date.now()}-${index}`,
      type,
      content: {},
      attributes: attrs,
      innerBlocks: [],
    }));

    if (onInnerBlocksChange) {
      onInnerBlocksChange(newColumns);
    }

    if (onChange) {
      onChange(null, {
        ...attributes,
        columnCount: variation.attributes.columnCount,
      });
    }

    const widths = newColumns.map(col => col.attributes?.width || 50);
    setColumnWidths(widths);
    setShowVariationPicker(false);
    hasInitializedRef.current = true;
  }, [attributes, onChange, onInnerBlocksChange]);

  // Skip variation picker and use default (50/50)
  const handleSkipVariation = useCallback(() => {
    const defaultVariation = getDefaultVariation();
    handleVariationSelect(defaultVariation);
  }, [handleVariationSelect]);

  // Update column count
  const updateColumnCount = useCallback((newCount: number) => {
    if (newCount < 1 || newCount > 6) return;
    if (newCount === innerBlocks.length) return;

    let newColumns: Block[];

    if (newCount > innerBlocks.length) {
      // Adding columns
      const equalWidth = 100 / newCount;
      const updatedColumns = innerBlocks.map(col => ({
        ...col,
        attributes: { ...col.attributes, width: equalWidth },
      }));

      const columnsToAdd = newCount - innerBlocks.length;
      const newCols: Block[] = Array.from({ length: columnsToAdd }, (_, i) => ({
        id: `column-${Date.now()}-${i}`,
        clientId: `client-column-${Date.now()}-${i}`,
        type: 'o4o/column',
        content: {},
        attributes: { width: equalWidth },
        innerBlocks: [],
      }));

      newColumns = [...updatedColumns, ...newCols];
    } else {
      // Removing columns
      newColumns = innerBlocks.slice(0, newCount);
      const equalWidth = 100 / newCount;
      newColumns = newColumns.map(col => ({
        ...col,
        attributes: { ...col.attributes, width: equalWidth },
      }));
    }

    if (onInnerBlocksChange) {
      onInnerBlocksChange(newColumns);
    }

    if (onChange) {
      onChange(null, { ...attributes, columnCount: newCount });
    }

    setColumnWidths(newColumns.map(col => col.attributes?.width || 100 / newCount));
  }, [innerBlocks, attributes, onChange, onInnerBlocksChange]);

  // Handle column resize
  const handleColumnResize = useCallback((newWidths: number[]) => {
    setColumnWidths(newWidths);

    const updatedColumns = innerBlocks.map((col, index) => ({
      ...col,
      attributes: {
        ...col.attributes,
        width: newWidths[index],
      },
    }));

    if (onInnerBlocksChange) {
      onInnerBlocksChange(updatedColumns);
    }
  }, [innerBlocks, onInnerBlocksChange]);

  // Update vertical alignment
  const updateVerticalAlignment = useCallback((alignment: 'top' | 'center' | 'bottom') => {
    if (onChange) {
      onChange(null, { ...attributes, verticalAlignment: alignment });
    }
  }, [attributes, onChange]);

  // Toggle stack on mobile
  const toggleStackOnMobile = useCallback(() => {
    if (onChange) {
      onChange(null, { ...attributes, isStackedOnMobile: !isStackedOnMobile });
    }
  }, [attributes, isStackedOnMobile, onChange]);

  // Get alignment class
  const getAlignmentClass = () => {
    switch (verticalAlignment) {
      case 'center': return 'items-center';
      case 'bottom': return 'items-end';
      default: return 'items-start';
    }
  };

  // Show variation picker
  if (showVariationPicker) {
    return (
      <div className="wp-block-columns-placeholder">
        <ColumnsVariationPicker
          onSelect={handleVariationSelect}
          onSkip={handleSkipVariation}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'wp-block-columns',
        'relative',
        isSelected && 'is-selected'
      )}
      onClick={() => onSelect?.()}
    >
      {/* Block Toolbar */}
      {isSelected && (
        <div className="columns-toolbar absolute -top-12 left-0 flex items-center gap-2 bg-white border border-gray-300 rounded shadow-md p-2 z-20">
          {/* Vertical Alignment */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateVerticalAlignment('top')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100',
                verticalAlignment === 'top' && 'bg-blue-100 text-blue-600'
              )}
              title="Align Top"
            >
              <AlignStartVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateVerticalAlignment('center')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100',
                verticalAlignment === 'center' && 'bg-blue-100 text-blue-600'
              )}
              title="Align Center"
            >
              <AlignCenterVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateVerticalAlignment('bottom')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100',
                verticalAlignment === 'bottom' && 'bg-blue-100 text-blue-600'
              )}
              title="Align Bottom"
            >
              <AlignEndVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Column Count Control */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Columns:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateColumnCount(columnCount - 1)}
                disabled={columnCount <= 1}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                −
              </button>
              <span className="text-sm font-medium w-6 text-center">{columnCount}</span>
              <button
                onClick={() => updateColumnCount(columnCount + 1)}
                disabled={columnCount >= 6}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                +
              </button>
            </div>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Stack on Mobile Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isStackedOnMobile}
              onChange={toggleStackOnMobile}
              className="w-4 h-4"
            />
            <span className="text-xs text-gray-700">Stack on mobile</span>
          </label>
        </div>
      )}

      {/* Warning for > 6 columns */}
      {columnCount > 6 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Warning:</strong> This column block contains more than the recommended amount of columns (6). Consider reducing the number for better usability.
          </div>
        </div>
      )}

      {/* Columns Container */}
      <div
        className={cn(
          'columns-inner flex relative',
          getAlignmentClass(),
          isStackedOnMobile && 'sm:flex-col md:flex-row'
        )}
        style={{
          gap: '2em',
        }}
      >
        {innerBlocks.map((column, index) => (
          <React.Fragment key={column.clientId || column.id}>
            {/* Column Block */}
            <GutenbergColumnBlock
              {...column}
              isSelected={isSelected}
              onSelect={onSelect}
              onInnerBlocksChange={(newInnerBlocks) => {
                const updatedColumns = innerBlocks.map(col =>
                  col.id === column.id
                    ? { ...col, innerBlocks: newInnerBlocks }
                    : col
                );
                if (onInnerBlocksChange) {
                  onInnerBlocksChange(updatedColumns);
                }
              }}
            />

            {/* Column Resizer (between columns) */}
            {index < innerBlocks.length - 1 && (
              <ColumnResizer
                leftIndex={index}
                rightIndex={index + 1}
                columnWidths={columnWidths}
                onResize={handleColumnResize}
                isVisible={isSelected}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default GutenbergColumnsBlock;

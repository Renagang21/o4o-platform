/**
 * NewColumnsBlock
 *
 * Simplified Columns block with proper innerBlocks rendering
 *
 * Features:
 * - Renders Column blocks using DynamicRenderer
 * - All settings moved to Sidebar (not Toolbar)
 * - Clean, minimal UI
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Block } from '@/types/post.types';
import { BlockProps } from '@/blocks/registry/types';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from '../EnhancedBlockWrapper';
import { DynamicRenderer } from '@/blocks/registry/DynamicRenderer';

interface NewColumnsBlockProps extends BlockProps {
  attributes?: {
    columnCount?: number;
    verticalAlignment?: 'top' | 'center' | 'bottom';
    isStackedOnMobile?: boolean;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

export const NewColumnsBlock: React.FC<NewColumnsBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onCopy,
  onAddBlock,
}) => {
  const {
    columnCount = 2,
    verticalAlignment = 'top',
    isStackedOnMobile = true,
  } = attributes;

  // Use ref to avoid recreating callbacks when innerBlocks changes
  // Similar pattern to NewColumnBlock optimization
  const innerBlocksRef = useRef(innerBlocks);
  innerBlocksRef.current = innerBlocks;

  // Unified column management: create initial columns or adjust when columnCount changes
  useEffect(() => {
    if (!onInnerBlocksChange || columnCount <= 0) return;

    const currentCount = innerBlocks.length;

    // Case 1: Empty - create initial columns
    if (currentCount === 0) {
      const newColumns: Block[] = [];
      for (let i = 0; i < columnCount; i++) {
        newColumns.push({
          id: `${id}-column-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'o4o/column',
          content: '',
          attributes: {
            width: 100 / columnCount,
            verticalAlignment: verticalAlignment,
          },
          innerBlocks: [],
        });
      }
      onInnerBlocksChange(newColumns);
      return;
    }

    // Case 2: Column count mismatch - adjust columns
    if (currentCount !== columnCount) {
      let adjustedColumns = [...innerBlocks];

      if (currentCount < columnCount) {
        // Add new columns
        for (let i = currentCount; i < columnCount; i++) {
          adjustedColumns.push({
            id: `${id}-column-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'o4o/column',
            content: '',
            attributes: {
              width: 100 / columnCount,
              verticalAlignment: verticalAlignment,
            },
            innerBlocks: [],
          });
        }
      } else {
        // Remove extra columns (from the end)
        adjustedColumns = adjustedColumns.slice(0, columnCount);
      }

      // Redistribute widths for all columns
      adjustedColumns = adjustedColumns.map(col => ({
        ...col,
        attributes: {
          ...col.attributes,
          width: 100 / columnCount,
        },
      }));

      onInnerBlocksChange(adjustedColumns);
    }
  }, [columnCount, innerBlocks.length, id, verticalAlignment, onInnerBlocksChange]);

  // Handle inner block change (optimized with ref)
  const handleInnerBlockChange = useCallback(
    (blockId: string, content: unknown, blockAttributes?: unknown) => {
      if (!onInnerBlocksChange) return;

      const updatedBlocks = innerBlocksRef.current.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: typeof content === 'string' ? content : block.content,
              attributes: { ...(block.attributes as Record<string, unknown>), ...(blockAttributes as Record<string, unknown>) },
            }
          : block
      );

      onInnerBlocksChange(updatedBlocks);
    },
    [onInnerBlocksChange]
  );

  // Handle inner block delete (optimized with ref)
  const handleInnerBlockDelete = useCallback(
    (blockId: string) => {
      if (!onInnerBlocksChange) return;
      onInnerBlocksChange(innerBlocksRef.current.filter((block) => block.id !== blockId));
    },
    [onInnerBlocksChange]
  );

  // Handle inner block's inner blocks change (Column -> nested blocks) (optimized with ref)
  const handleColumnInnerBlocksChange = useCallback(
    (columnId: string, newInnerBlocks: Block[]) => {
      if (!onInnerBlocksChange) return;

      const updatedBlocks = innerBlocksRef.current.map((block) =>
        block.id === columnId
          ? { ...block, innerBlocks: newInnerBlocks }
          : block
      );

      onInnerBlocksChange(updatedBlocks);
    },
    [onInnerBlocksChange]
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
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onCopy={onCopy}
      onAddBlock={onAddBlock}
      className="new-columns-block"
    >
      {/* Columns Container */}
      <div
        className={cn(
          'wp-block-columns flex gap-4',
          alignmentClasses[verticalAlignment],
          isStackedOnMobile && 'flex-col sm:flex-row'
        )}
      >
        {innerBlocks.length === 0 ? (
          // Empty state - show placeholder
          <div className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
            <p className="text-sm text-gray-600">
              No columns yet. Use the sidebar to add columns.
            </p>
          </div>
        ) : (
          // Render each Column block
          innerBlocks.map((column) => (
            <div
              key={column.id}
              className="wp-block-column flex-1"
              style={{
                flexBasis: `${column.attributes?.width || 100 / columnCount}%`,
              }}
            >
              <DynamicRenderer
                block={column}
                onChange={(content, columnAttributes) => {
                  handleInnerBlockChange(column.id, content, columnAttributes);
                }}
                onDelete={() => handleInnerBlockDelete(column.id)}
                onInnerBlocksChange={(newInnerBlocks) => {
                  handleColumnInnerBlocksChange(column.id, newInnerBlocks);
                }}
                isSelected={false} // Column itself is not selectable in this version
              />
            </div>
          ))
        )}
      </div>

    </EnhancedBlockWrapper>
  );
};

export default NewColumnsBlock;

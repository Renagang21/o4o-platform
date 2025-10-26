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

import React, { useCallback, useEffect } from 'react';
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

  // Auto-create initial columns if empty
  useEffect(() => {
    if (innerBlocks.length === 0 && onInnerBlocksChange && columnCount > 0) {
      const newColumns: Block[] = [];
      for (let i = 0; i < columnCount; i++) {
        newColumns.push({
          id: `${id}-column-${i}-${Date.now()}`,
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
    }
  }, [innerBlocks.length, columnCount, verticalAlignment, id, onInnerBlocksChange]);

  // Handle inner block change
  const handleInnerBlockChange = useCallback(
    (blockId: string, content: unknown, blockAttributes?: unknown) => {
      if (!onInnerBlocksChange) return;

      const updatedBlocks = innerBlocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: typeof content === 'string' ? content : block.content,
              attributes: { ...block.attributes, ...blockAttributes },
            }
          : block
      );

      onInnerBlocksChange(updatedBlocks);
    },
    [innerBlocks, onInnerBlocksChange]
  );

  // Handle inner block delete
  const handleInnerBlockDelete = useCallback(
    (blockId: string) => {
      if (!onInnerBlocksChange) return;
      onInnerBlocksChange(innerBlocks.filter((block) => block.id !== blockId));
    },
    [innerBlocks, onInnerBlocksChange]
  );

  // Handle inner block's inner blocks change (Column -> nested blocks)
  const handleColumnInnerBlocksChange = useCallback(
    (columnId: string, newInnerBlocks: Block[]) => {
      if (!onInnerBlocksChange) return;

      const updatedBlocks = innerBlocks.map((block) =>
        block.id === columnId
          ? { ...block, innerBlocks: newInnerBlocks }
          : block
      );

      onInnerBlocksChange(updatedBlocks);
    },
    [innerBlocks, onInnerBlocksChange]
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

      {/* Debug info (remove later) */}
      {isSelected && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Columns Block:</strong> {innerBlocks.length} columns
        </div>
      )}
    </EnhancedBlockWrapper>
  );
};

export default NewColumnsBlock;

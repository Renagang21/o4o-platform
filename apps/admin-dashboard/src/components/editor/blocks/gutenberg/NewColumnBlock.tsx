/**
 * NewColumnBlock
 *
 * Simplified Column block that properly renders innerBlocks
 *
 * Features:
 * - Renders nested blocks using DynamicRenderer
 * - Empty state with + button
 * - All settings moved to Sidebar
 */

import React, { useCallback, useState } from 'react';
import { Block } from '@/types/post.types';
import { BlockProps } from '@/blocks/registry/types';
import { cn } from '@/lib/utils';
import { DynamicRenderer } from '@/blocks/registry/DynamicRenderer';

interface NewColumnBlockProps extends BlockProps {
  attributes?: {
    width?: number; // Percentage
    verticalAlignment?: 'top' | 'center' | 'bottom';
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

export const NewColumnBlock: React.FC<NewColumnBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  onAddBlock,
}) => {
  const {
    width = 50,
    verticalAlignment = 'top',
  } = attributes;

  const [selectedNestedBlockId, setSelectedNestedBlockId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle nested block change
  const handleNestedBlockChange = useCallback(
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

  // Handle nested block delete
  const handleNestedBlockDelete = useCallback(
    (blockId: string) => {
      if (!onInnerBlocksChange) return;
      onInnerBlocksChange(innerBlocks.filter((block) => block.id !== blockId));
    },
    [innerBlocks, onInnerBlocksChange]
  );

  // Handle nested block duplicate
  const handleNestedBlockDuplicate = useCallback(
    (blockId: string) => {
      if (!onInnerBlocksChange) return;

      const blockIndex = innerBlocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const blockToDuplicate = innerBlocks[blockIndex];
      const duplicatedBlock: Block = {
        ...blockToDuplicate,
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const newBlocks = [...innerBlocks];
      newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
      onInnerBlocksChange(newBlocks);
    },
    [innerBlocks, onInnerBlocksChange]
  );

  // Handle drop - when a block is dragged into this column
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!onInnerBlocksChange) return;

    // Get the dragged block data
    const blockData = e.dataTransfer.getData('application/json');
    if (!blockData) return;

    try {
      const droppedBlock = JSON.parse(blockData) as Block;
      // Add to innerBlocks
      onInnerBlocksChange([...innerBlocks, droppedBlock]);
    } catch (error) {
      console.error('Failed to parse dropped block:', error);
    }
  }, [innerBlocks, onInnerBlocksChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const alignmentClasses = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  return (
    <div
      className={cn(
        'new-column-block',
        'min-h-[100px] p-2 border border-gray-200 rounded',
        isSelected && 'border-blue-500 bg-blue-50/30',
        isDragOver && 'border-blue-500 bg-blue-50 border-2'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Column Content */}
      <div
        className={cn(
          'column-content flex flex-col',
          alignmentClasses[verticalAlignment]
        )}
      >
        {innerBlocks.length === 0 ? (
          // Empty state - simple drop zone
          <div className="empty-column p-8 text-center border-2 border-dashed border-gray-300 rounded">
            <p className="text-sm text-gray-500">
              {isDragOver ? '↓ Drop block here' : 'Drag blocks here from the + menu'}
            </p>
          </div>
        ) : (
          // Render nested blocks
          <div className="inner-blocks-container space-y-2">
            {innerBlocks.map((block, index) => (
              <div key={block.id} className="inner-block">
                <DynamicRenderer
                  block={block}
                  onChange={(content, blockAttributes) => {
                    handleNestedBlockChange(block.id, content, blockAttributes);
                  }}
                  onDelete={() => handleNestedBlockDelete(block.id)}
                  onDuplicate={() => handleNestedBlockDuplicate(block.id)}
                  onAddBlock={(position) => {
                    // Add block before/after current block
                    if (!onInnerBlocksChange) return;

                    const newBlock: Block = {
                      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      type: 'o4o/paragraph',
                      content: '',
                      attributes: {},
                    };

                    const newBlocks = [...innerBlocks];
                    const insertIndex = position === 'before' ? index : index + 1;
                    newBlocks.splice(insertIndex, 0, newBlock);
                    onInnerBlocksChange(newBlocks);
                  }}
                  isSelected={selectedNestedBlockId === block.id}
                  onSelect={() => setSelectedNestedBlockId(block.id)}
                />
              </div>
            ))}

          </div>
        )}
      </div>

    </div>
  );
};

export default NewColumnBlock;

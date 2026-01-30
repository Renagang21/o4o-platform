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

import React, { useCallback, useState, useRef } from 'react';
import { Block } from '@/types/post.types';
import { BlockProps } from '@/blocks/registry/types';
import { cn } from '@/lib/utils';
import { DynamicRenderer } from '@/blocks/registry/DynamicRenderer';
import { Plus } from 'lucide-react';

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
  const [isHovered, setIsHovered] = useState(false);

  // Use ref to avoid recreating callbacks when innerBlocks changes
  // Similar pattern to ParagraphBlock and HeadingBlock fixes
  const innerBlocksRef = useRef(innerBlocks);
  innerBlocksRef.current = innerBlocks;

  // Handle nested block change
  const handleNestedBlockChange = useCallback(
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

  // Handle nested block delete
  const handleNestedBlockDelete = useCallback(
    (blockId: string) => {
      if (!onInnerBlocksChange) return;
      onInnerBlocksChange(innerBlocksRef.current.filter((block) => block.id !== blockId));
    },
    [onInnerBlocksChange]
  );

  // Handle nested block duplicate
  const handleNestedBlockDuplicate = useCallback(
    (blockId: string) => {
      if (!onInnerBlocksChange) return;

      const blockIndex = innerBlocksRef.current.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const blockToDuplicate = innerBlocksRef.current[blockIndex];
      const duplicatedBlock: Block = {
        ...blockToDuplicate,
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const newBlocks = [...innerBlocksRef.current];
      newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
      onInnerBlocksChange(newBlocks);
    },
    [onInnerBlocksChange]
  );

  // Handle nested block add (extracted from inline handler)
  const handleNestedBlockAdd = useCallback(
    (blockId: string, position: 'before' | 'after') => {
      if (!onInnerBlocksChange) return;

      const blockIndex = innerBlocksRef.current.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const newBlock: Block = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'o4o/paragraph',
        content: '',
        attributes: {},
      };

      const newBlocks = [...innerBlocksRef.current];
      const insertIndex = position === 'before' ? blockIndex : blockIndex + 1;
      newBlocks.splice(insertIndex, 0, newBlock);
      onInnerBlocksChange(newBlocks);
    },
    [onInnerBlocksChange]
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
      onInnerBlocksChange([...innerBlocksRef.current, droppedBlock]);
    } catch (error) {
      console.error('Failed to parse dropped block:', error);
    }
  }, [onInnerBlocksChange]);

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

  // Handle add block at the end
  const handleAddBlockAtEnd = useCallback(() => {
    if (!onInnerBlocksChange) return;

    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'o4o/paragraph',
      content: '',
      attributes: {},
    };

    onInnerBlocksChange([...innerBlocksRef.current, newBlock]);
    setSelectedNestedBlockId(newBlock.id);
  }, [onInnerBlocksChange]);

  const alignmentClasses = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  return (
    <div
      className={cn(
        'new-column-block relative',
        'min-h-[100px] p-2 border border-gray-200 rounded',
        isSelected && 'border-blue-500 bg-blue-50/30',
        isDragOver && 'border-blue-500 bg-blue-50 border-2'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column Content */}
      <div
        className={cn(
          'column-content flex flex-col',
          alignmentClasses[verticalAlignment]
        )}
      >
        {innerBlocks.length === 0 ? (
          // Empty state - click to add block
          <button
            onClick={handleAddBlockAtEnd}
            className={cn(
              'empty-column p-8 text-center border-2 border-dashed rounded transition-all',
              'hover:border-blue-400 hover:bg-blue-50 cursor-pointer',
              isDragOver ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="w-6 h-6 text-gray-400" />
              <p className="text-sm text-gray-500">
                {isDragOver ? '↓ Drop block here' : 'Click to add a block'}
              </p>
            </div>
          </button>
        ) : (
          // Render nested blocks
          <div className="inner-blocks-container space-y-2">
            {innerBlocks.map((block) => (
              <div key={block.id} className="inner-block">
                <DynamicRenderer
                  block={block}
                  onChange={(content, blockAttributes) => {
                    handleNestedBlockChange(block.id, content, blockAttributes);
                  }}
                  onDelete={() => handleNestedBlockDelete(block.id)}
                  onDuplicate={() => handleNestedBlockDuplicate(block.id)}
                  onAddBlock={(position) => handleNestedBlockAdd(block.id, position)}
                  isSelected={selectedNestedBlockId === block.id}
                  onSelect={() => setSelectedNestedBlockId(block.id)}
                />
              </div>
            ))}

            {/* Add block button at the end */}
            {isHovered && (
              <button
                onClick={handleAddBlockAtEnd}
                className={cn(
                  'w-full py-3 mt-2 border-2 border-dashed border-gray-300 rounded',
                  'hover:border-blue-400 hover:bg-blue-50 transition-all',
                  'flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600'
                )}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add block</span>
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default NewColumnBlock;

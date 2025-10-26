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
import { Plus, X } from 'lucide-react';

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

  const [showBlockPicker, setShowBlockPicker] = useState(false);

  // Available block types
  const blockTypes = [
    { type: 'o4o/paragraph', label: 'Paragraph', icon: '¶' },
    { type: 'o4o/heading', label: 'Heading', icon: 'H' },
    { type: 'o4o/list', label: 'List', icon: '≡' },
    { type: 'o4o/quote', label: 'Quote', icon: '"' },
    { type: 'o4o/image', label: 'Image', icon: '🖼' },
    { type: 'o4o/button', label: 'Button', icon: '⊡' },
    { type: 'o4o/code', label: 'Code', icon: '</>' },
  ];

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

  // Handle adding block inside column
  const handleAddBlockInside = useCallback((blockType: string) => {
    if (!onInnerBlocksChange) return;

    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockType,
      content: '',
      attributes: {},
    };

    onInnerBlocksChange([...innerBlocks, newBlock]);
    setShowBlockPicker(false);
  }, [innerBlocks, onInnerBlocksChange]);

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
        isSelected && 'border-blue-500 bg-blue-50/30'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {/* Column Content */}
      <div
        className={cn(
          'column-content flex flex-col',
          alignmentClasses[verticalAlignment]
        )}
      >
        {innerBlocks.length === 0 ? (
          // Empty state
          <div className="empty-column p-8 text-center border-2 border-dashed border-gray-300 rounded relative">
            <p className="text-sm text-gray-500 mb-3">
              Empty column
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBlockPicker(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add block
            </button>

            {/* Block Picker Modal */}
            {showBlockPicker && (
              <div className="absolute top-0 left-0 right-0 bg-white border border-gray-300 rounded shadow-lg p-4 z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Choose block type</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBlockPicker(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {blockTypes.map((blockType) => (
                    <button
                      key={blockType.type}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddBlockInside(blockType.type);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-left border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <span className="text-lg">{blockType.icon}</span>
                      <span>{blockType.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                  isSelected={false} // Individual blocks inside column
                />
              </div>
            ))}

            {/* Add block button at the end */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBlockPicker(true);
                }}
                className="w-full p-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add block
              </button>

              {/* Block Picker Modal */}
              {showBlockPicker && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded shadow-lg p-4 z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Choose block type</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBlockPicker(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {blockTypes.map((blockType) => (
                      <button
                        key={blockType.type}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddBlockInside(blockType.type);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-left border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <span className="text-lg">{blockType.icon}</span>
                        <span>{blockType.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug info (remove later) */}
      {isSelected && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Column:</strong> {width.toFixed(0)}% wide, {innerBlocks.length} blocks
        </div>
      )}
    </div>
  );
};

export default NewColumnBlock;

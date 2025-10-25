/**
 * InnerBlocks Component
 * Renders nested blocks within a container block (Columns, Group, Cover, etc.)
 * Supports recursive rendering, drag-and-drop, and block management
 */

import React, { useCallback } from 'react';
import { Block } from '@/types/post.types';
import { BlockWrapper } from './BlockWrapper';
import { DynamicRenderer } from '@/blocks/registry/DynamicRenderer';
import { BlockInserterButton } from './BlockInserterButton';
import { Plus } from 'lucide-react';

interface InnerBlocksProps {
  parentBlockId: string;
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  allowedBlocks?: string[]; // Restrict which block types can be added
  template?: Block[]; // Default blocks to insert
  templateLock?: boolean | 'all' | 'insert'; // Lock template: false, 'all', 'insert'
  orientation?: 'horizontal' | 'vertical'; // Layout orientation
  renderAppender?: boolean; // Show + button at the end
  placeholder?: string; // Placeholder text when empty
  className?: string;
  maxDepth?: number; // Maximum nesting depth
  currentDepth?: number; // Current depth level
}

export const InnerBlocks: React.FC<InnerBlocksProps> = ({
  parentBlockId,
  blocks,
  onBlocksChange,
  selectedBlockId,
  onSelectBlock,
  allowedBlocks,
  template,
  templateLock = false,
  orientation = 'vertical',
  renderAppender = true,
  placeholder = 'Add blocks here...',
  className = '',
  maxDepth = 5,
  currentDepth = 1,
}) => {
  // Check depth limit
  const isMaxDepthReached = currentDepth >= maxDepth;

  // Handle block update
  const handleBlockUpdate = useCallback((blockId: string, updates: { content?: any; attributes?: any }) => {
    const newBlocks = blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          ...(updates.content && { content: updates.content }),
          ...(updates.attributes && { attributes: { ...block.attributes, ...updates.attributes } }),
        };
      }
      // Handle nested updates recursively
      if (block.innerBlocks && block.innerBlocks.length > 0) {
        return {
          ...block,
          innerBlocks: updateNestedBlock(block.innerBlocks, blockId, updates),
        };
      }
      return block;
    });
    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange]);

  // Recursive helper to update nested blocks
  const updateNestedBlock = (blocks: Block[], blockId: string, updates: { content?: any; attributes?: any }): Block[] => {
    return blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          ...(updates.content && { content: updates.content }),
          ...(updates.attributes && { attributes: { ...block.attributes, ...updates.attributes } }),
        };
      }
      if (block.innerBlocks && block.innerBlocks.length > 0) {
        return {
          ...block,
          innerBlocks: updateNestedBlock(block.innerBlocks, blockId, updates),
        };
      }
      return block;
    });
  };

  // Handle block deletion
  const handleBlockDelete = useCallback((blockId: string) => {
    if (templateLock === 'all') return; // Cannot delete if template is fully locked
    const newBlocks = blocks.filter(block => block.id !== blockId);
    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange, templateLock]);

  // Handle block duplication
  const handleBlockDuplicate = useCallback((blockId: string) => {
    if (templateLock === 'all' || templateLock === 'insert') return; // Cannot duplicate if locked
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const blockToDuplicate = blocks[blockIndex];
    const duplicatedBlock: Block = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
      clientId: `client-${Date.now()}`,
    };

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange, templateLock]);

  // Handle block move up
  const handleMoveUp = useCallback((blockId: string) => {
    if (templateLock === 'all') return; // Cannot move if template is fully locked
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex <= 0) return;

    const newBlocks = [...blocks];
    const [block] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(blockIndex - 1, 0, block);
    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange, templateLock]);

  // Handle block move down
  const handleMoveDown = useCallback((blockId: string) => {
    if (templateLock === 'all') return; // Cannot move if template is fully locked
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1 || blockIndex >= blocks.length - 1) return;

    const newBlocks = [...blocks];
    const [block] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(blockIndex + 1, 0, block);
    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange, templateLock]);

  // Handle adding a new block
  const handleAddBlock = useCallback(() => {
    if (templateLock === 'all' || templateLock === 'insert') return; // Cannot add if locked

    const newBlock: Block = {
      id: `block-${Date.now()}`,
      clientId: `client-${Date.now()}`,
      type: 'o4o/paragraph',
      content: { text: '' },
      attributes: {},
    };

    onBlocksChange([...blocks, newBlock]);
  }, [blocks, onBlocksChange, templateLock]);

  // Handle drag handlers
  const handleDragStart = useCallback((blockId: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    e.dataTransfer.setData('application/block-id', blockId);
    e.dataTransfer.setData('parent-block-id', parentBlockId);
  }, [parentBlockId]);

  const handleDragOver = useCallback((blockId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((targetBlockId: string, draggedBlockId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (templateLock === 'all') return;

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
    newBlocks.splice(insertIndex, 0, draggedBlock);

    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange, templateLock]);

  const handleDragEnd = useCallback((blockId: string, e: React.DragEvent) => {
    // Cleanup drag state if needed
  }, []);

  // Empty state
  if (blocks.length === 0) {
    return (
      <div className={`inner-blocks-empty ${className}`}>
        <div className="inner-blocks-empty__placeholder">
          <Plus size={24} className="text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">{placeholder}</p>
          {renderAppender && !templateLock && (
            <button
              type="button"
              className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleAddBlock}
            >
              Add Block
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inner-blocks inner-blocks--${orientation} ${className}`}
      data-parent-block-id={parentBlockId}
      data-depth={currentDepth}
    >
      {blocks.map((block, index) => (
        <BlockWrapper
          key={block.clientId || block.id}
          blockId={block.id}
          blockType={block.type}
          isSelected={selectedBlockId === block.id}
          onSelect={onSelectBlock}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDuplicate={handleBlockDuplicate}
          onDelete={handleBlockDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          canMoveUp={index > 0 && templateLock !== 'all'}
          canMoveDown={index < blocks.length - 1 && templateLock !== 'all'}
        >
          <DynamicRenderer
            block={block}
            id={block.id}
            content={typeof block.content === 'string' ? block.content : block.content?.text || ''}
            attributes={block.attributes || {}}
            innerBlocks={block.innerBlocks || []}
            onChange={(content, attributes) => handleBlockUpdate(block.id, { content, attributes })}
            onDelete={() => handleBlockDelete(block.id)}
            onDuplicate={() => handleBlockDuplicate(block.id)}
            onMoveUp={() => handleMoveUp(block.id)}
            onMoveDown={() => handleMoveDown(block.id)}
            onInnerBlocksChange={(newInnerBlocks) => {
              const newBlocks = blocks.map(b =>
                b.id === block.id ? { ...b, innerBlocks: newInnerBlocks } : b
              );
              onBlocksChange(newBlocks);
            }}
            isSelected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock?.(block.id)}
            canMoveUp={index > 0}
            canMoveDown={index < blocks.length - 1}
          />
        </BlockWrapper>
      ))}

      {/* Appender button */}
      {renderAppender && !templateLock && !isMaxDepthReached && (
        <BlockInserterButton
          onInsert={handleAddBlock}
          position="end"
        />
      )}
    </div>
  );
};

export default InnerBlocks;

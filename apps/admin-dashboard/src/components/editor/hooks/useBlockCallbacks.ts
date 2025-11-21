/**
 * useBlockCallbacks Hook
 * Extracted from GutenbergBlockEditor.tsx
 *
 * Manages memoized callback factory pattern for block operations
 * Provides optimized callbacks per block ID with automatic cleanup
 */

import { useCallback, useRef, useEffect } from 'react';
import { Block } from '@/types/post.types';
import { NewBlockRequest } from '@/services/ai/types';

interface UseBlockCallbacksProps {
  blocks: Block[];
  handleBlockUpdate: (blockId: string, content: any, attributes?: any) => void;
  handleBlockDelete: (blockId: string) => void;
  handleDuplicate: (blockId: string) => void;
  handleMoveUp: (blockId: string) => void;
  handleMoveDown: (blockId: string) => void;
  handleAddBlock: (blockId: string, position: 'before' | 'after', type?: string) => void;
  handleBlockTypeChange: (blockId: string, newType: string) => void;
  handleBlockReplace: (blockId: string, newBlockType: string, newAttributes: Record<string, any>) => void;
  handleBlockCopy: (blockId: string) => Promise<void>;
  handleBlockPaste: (afterBlockId?: string) => Promise<void>;
  handleDragStart: (blockId: string, e: React.DragEvent) => void;
  handleDragOver: (blockId: string, e: React.DragEvent) => void;
  handleDrop: (blockId: string, draggedId: string, e: React.DragEvent) => void;
  handleDragEnd: (blockId: string, e: React.DragEvent) => void;
  handleGenerateBlock: (spec: NewBlockRequest) => Promise<void>;
  setSelectedBlockId: (id: string | null) => void;
  updateBlocks: (blocks: Block[]) => void;
  blocksRef: React.RefObject<Block[]>;
}

export function useBlockCallbacks({
  blocks,
  handleBlockUpdate,
  handleBlockDelete,
  handleDuplicate,
  handleMoveUp,
  handleMoveDown,
  handleAddBlock,
  handleBlockTypeChange,
  handleBlockReplace,
  handleBlockCopy,
  handleBlockPaste,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleGenerateBlock,
  setSelectedBlockId,
  updateBlocks,
  blocksRef,
}: UseBlockCallbacksProps) {

  // Callback Factory Pattern
  const createOnChange = useCallback((blockId: string) =>
    (content: any, attributes?: any) => handleBlockUpdate(blockId, content, attributes),
    [handleBlockUpdate]
  );

  const createOnDelete = useCallback((blockId: string) =>
    () => handleBlockDelete(blockId),
    [handleBlockDelete]
  );

  const createOnDuplicate = useCallback((blockId: string) =>
    () => handleDuplicate(blockId),
    [handleDuplicate]
  );

  const createOnMoveUp = useCallback((blockId: string) =>
    () => handleMoveUp(blockId),
    [handleMoveUp]
  );

  const createOnMoveDown = useCallback((blockId: string) =>
    () => handleMoveDown(blockId),
    [handleMoveDown]
  );

  const createOnAddBlock = useCallback((blockId: string) =>
    (position: 'before' | 'after', type?: string) => handleAddBlock(blockId, position, type),
    [handleAddBlock]
  );

  const createOnSelect = useCallback((blockId: string) =>
    () => setSelectedBlockId(blockId),
    [setSelectedBlockId]
  );

  const createOnDragStart = useCallback((blockId: string) =>
    (e: React.DragEvent) => handleDragStart(blockId, e),
    [handleDragStart]
  );

  const createOnDragOver = useCallback((blockId: string) =>
    (e: React.DragEvent) => handleDragOver(blockId, e),
    [handleDragOver]
  );

  const createOnDrop = useCallback((blockId: string) =>
    (e: React.DragEvent) => {
      const draggedId = e.dataTransfer.getData('application/block-id') || e.dataTransfer.getData('text/plain');
      handleDrop(blockId, draggedId, e);
    },
    [handleDrop]
  );

  const createOnDragEnd = useCallback((blockId: string) =>
    (e: React.DragEvent) => handleDragEnd(blockId, e),
    [handleDragEnd]
  );

  const createOnCopy = useCallback((blockId: string) =>
    () => handleBlockCopy(blockId),
    [handleBlockCopy]
  );

  const createOnPaste = useCallback((blockId: string) =>
    () => handleBlockPaste(blockId),
    [handleBlockPaste]
  );

  const createOnChangeType = useCallback((blockId: string) =>
    (newType: string) => handleBlockTypeChange(blockId, newType),
    [handleBlockTypeChange]
  );

  const createOnReplaceWithBlock = useCallback((blockId: string) =>
    (newBlockType: string, newAttributes: Record<string, any>) => handleBlockReplace(blockId, newBlockType, newAttributes),
    [handleBlockReplace]
  );

  const createOnUpdate = useCallback((blockId: string) =>
    (updates: any) => {
      const newBlocks = blocksRef.current!.map(b =>
        b.id === blockId ? { ...b, ...updates } : b
      );
      updateBlocks(newBlocks);
    },
    [blocksRef, updateBlocks]
  );

  const createOnInnerBlocksChange = useCallback((blockId: string) =>
    (newInnerBlocks: Block[]) => {
      const newBlocks = blocksRef.current!.map(b =>
        b.id === blockId ? { ...b, innerBlocks: newInnerBlocks } : b
      );
      updateBlocks(newBlocks);
    },
    [blocksRef, updateBlocks]
  );

  // Memoize callback map per block ID
  const callbacksMapRef = useRef<Map<string, any>>(new Map());

  const getBlockCallbacks = useCallback((blockId: string) => {
    if (!callbacksMapRef.current.has(blockId)) {
      callbacksMapRef.current.set(blockId, {
        onChange: createOnChange(blockId),
        onDelete: createOnDelete(blockId),
        onDuplicate: createOnDuplicate(blockId),
        onMoveUp: createOnMoveUp(blockId),
        onMoveDown: createOnMoveDown(blockId),
        onAddBlock: createOnAddBlock(blockId),
        onSelect: createOnSelect(blockId),
        onDragStart: createOnDragStart(blockId),
        onDragOver: createOnDragOver(blockId),
        onDrop: createOnDrop(blockId),
        onDragEnd: createOnDragEnd(blockId),
        onCopy: createOnCopy(blockId),
        onPaste: createOnPaste(blockId),
        onChangeType: createOnChangeType(blockId),
        onUpdate: createOnUpdate(blockId),
        onInnerBlocksChange: createOnInnerBlocksChange(blockId),
        onReplaceWithBlock: createOnReplaceWithBlock(blockId),
        onGenerateBlock: handleGenerateBlock,
      });
    }
    return callbacksMapRef.current.get(blockId);
  }, [
    createOnChange,
    createOnDelete,
    createOnDuplicate,
    createOnMoveUp,
    createOnMoveDown,
    createOnAddBlock,
    createOnSelect,
    createOnDragStart,
    createOnDragOver,
    createOnDrop,
    createOnDragEnd,
    createOnCopy,
    createOnPaste,
    createOnChangeType,
    createOnUpdate,
    createOnInnerBlocksChange,
    createOnReplaceWithBlock,
    handleGenerateBlock,
  ]);

  // Clean up stale callbacks
  useEffect(() => {
    const currentBlockIds = new Set(blocks.map(b => b.id));
    const cachedBlockIds = Array.from(callbacksMapRef.current.keys());

    cachedBlockIds.forEach(id => {
      if (!currentBlockIds.has(id)) {
        callbacksMapRef.current.delete(id);
      }
    });
  }, [blocks]);

  return {
    getBlockCallbacks,
  };
}

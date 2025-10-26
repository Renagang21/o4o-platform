/**
 * useBlockManagement Hook
 *
 * Manages all block CRUD operations (Create, Read, Update, Delete)
 * Extracted from GutenbergBlockEditor to reduce complexity
 */

import { useCallback, useRef } from 'react';
import { Block } from '@/types/post.types';
import { copyBlockToClipboard, pasteBlockFromClipboard } from '../utils/clipboard-utils';

interface UseBlockManagementProps {
  updateBlocks: (blocks: Block[], skipOnChange?: boolean) => void;
  setSelectedBlockId: (id: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
}

export function useBlockManagement({
  updateBlocks,
  setSelectedBlockId,
  setIsDirty,
}: UseBlockManagementProps) {
  // Keep a stable ref to blocks for callback closures
  const blocksRef = useRef<Block[]>([]);

  // Helper to get current blocks
  const getBlocks = useCallback(() => blocksRef.current, []);

  // Update blocksRef when blocks change (called from parent)
  const setBlocksRef = useCallback((blocks: Block[]) => {
    blocksRef.current = blocks;
  }, []);

  // Handle block update
  const handleBlockUpdate = useCallback(
    (blockId: string, content: any, attributes?: any) => {
      const newBlocks = getBlocks().map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: typeof content === 'string' ? { text: content } : content,
              attributes: attributes || block.attributes,
            }
          : block
      );
      updateBlocks(newBlocks);
    },
    [getBlocks, updateBlocks]
  );

  // Handle block deletion
  const handleBlockDelete = useCallback(
    (blockId: string) => {
      const newBlocks = getBlocks().filter((block) => block.id !== blockId);
      updateBlocks(newBlocks);
      setSelectedBlockId(null);
    },
    [getBlocks, updateBlocks, setSelectedBlockId]
  );

  // Handle block copy
  const handleBlockCopy = useCallback(
    async (blockId: string, setCopiedBlock: (block: Block | null) => void) => {
      const block = getBlocks().find((b) => b.id === blockId);
      if (!block) return;

      await copyBlockToClipboard(block, setCopiedBlock);
    },
    [getBlocks]
  );

  // Handle block paste
  const handleBlockPaste = useCallback(
    async (copiedBlock: Block | null, afterBlockId?: string) => {
      const newBlock = await pasteBlockFromClipboard(copiedBlock);

      if (newBlock) {
        if (afterBlockId) {
          const index = getBlocks().findIndex((b) => b.id === afterBlockId);
          const newBlocks = [...getBlocks()];
          newBlocks.splice(index + 1, 0, newBlock);
          updateBlocks(newBlocks);
        } else {
          updateBlocks([...getBlocks(), newBlock]);
        }

        setSelectedBlockId(newBlock.id);
        setIsDirty(true);
      }
    },
    [getBlocks, updateBlocks, setSelectedBlockId, setIsDirty]
  );

  // Handle block insertion
  const handleInsertBlock = useCallback(
    (blockType: string, setIsBlockInserterOpen: (open: boolean) => void) => {
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: blockType.includes('heading') ? { text: '', level: 2 } : { text: '' },
        attributes: {},
      };

      const insertIndex = getBlocks().length;
      const newBlocks = [...getBlocks()];
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
      setIsBlockInserterOpen(false);

      // Focus on new block after DOM update
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
        if (newBlockElement) {
          const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableElement) {
            editableElement.focus();
          }
        }
      }, 100);
    },
    [getBlocks, updateBlocks, setSelectedBlockId]
  );

  // Handle add block at position
  const handleAddBlock = useCallback(
    (blockId: string, position: 'before' | 'after', blockType = 'o4o/paragraph', initialContent?: any) => {
      const index = getBlocks().findIndex((b) => b.id === blockId);
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: initialContent || { text: '' },
        attributes: {},
      };

      const newBlocks = [...getBlocks()];
      const insertIndex = position === 'after' ? index + 1 : index;
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);

      // Auto-scroll and focus on new block after DOM update
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
        if (newBlockElement) {
          newBlockElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          // Focus on the contentEditable element (Slate editor) inside the new block
          const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableElement) {
            editableElement.focus();
          }
        }
      }, 100);
    },
    [getBlocks, updateBlocks, setSelectedBlockId]
  );

  // Handle block duplication
  const handleDuplicate = useCallback(
    (blockId: string) => {
      const blockIndex = getBlocks().findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const blockToDuplicate = getBlocks()[blockIndex];
      const duplicatedBlock: Block = {
        ...blockToDuplicate,
        id: `block-${Date.now()}`,
      };

      const newBlocks = [...getBlocks()];
      newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(duplicatedBlock.id);

      // Focus on duplicated block after DOM update
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${duplicatedBlock.id}"]`);
        if (newBlockElement) {
          const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableElement) {
            editableElement.focus();
          }
        }
      }, 100);
    },
    [getBlocks, updateBlocks, setSelectedBlockId]
  );

  // Handle block move up
  const handleMoveUp = useCallback(
    (blockId: string) => {
      const blockIndex = getBlocks().findIndex((b) => b.id === blockId);
      if (blockIndex <= 0) return;

      const newBlocks = [...getBlocks()];
      const [block] = newBlocks.splice(blockIndex, 1);
      newBlocks.splice(blockIndex - 1, 0, block);
      updateBlocks(newBlocks);

      // Re-trigger selection to restore focus after DOM update
      setSelectedBlockId(null);
      setTimeout(() => {
        setSelectedBlockId(blockId);
      }, 0);
    },
    [getBlocks, updateBlocks, setSelectedBlockId]
  );

  // Handle block move down
  const handleMoveDown = useCallback(
    (blockId: string) => {
      const blockIndex = getBlocks().findIndex((b) => b.id === blockId);
      if (blockIndex === -1 || blockIndex >= getBlocks().length - 1) return;

      const newBlocks = [...getBlocks()];
      const [block] = newBlocks.splice(blockIndex, 1);
      newBlocks.splice(blockIndex + 1, 0, block);
      updateBlocks(newBlocks);

      // Re-trigger selection to restore focus after DOM update
      setSelectedBlockId(null);
      setTimeout(() => {
        setSelectedBlockId(blockId);
      }, 0);
    },
    [getBlocks, updateBlocks, setSelectedBlockId]
  );

  // Handle block type change
  const handleBlockTypeChange = useCallback(
    (blockId: string, newType: string) => {
      const newBlocks = getBlocks().map((block) => {
        if (block.id === blockId) {
          // Convert heading types
          if (newType.startsWith('o4o/heading-')) {
            const level = parseInt(newType.replace('o4o/heading-h', ''));
            return {
              ...block,
              type: 'o4o/heading',
              content: { text: typeof block.content === 'string' ? block.content : block.content?.text || '', level },
              attributes: block.attributes || {},
            };
          }
          // Convert to paragraph
          if (newType === 'o4o/paragraph') {
            return {
              ...block,
              type: 'o4o/paragraph',
              content: { text: typeof block.content === 'string' ? block.content : block.content?.text || '' },
              attributes: block.attributes || {},
            };
          }
        }
        return block;
      });
      updateBlocks(newBlocks);
    },
    [getBlocks, updateBlocks]
  );

  return {
    blocksRef,
    setBlocksRef,
    handleBlockUpdate,
    handleBlockDelete,
    handleBlockCopy,
    handleBlockPaste,
    handleInsertBlock,
    handleAddBlock,
    handleDuplicate,
    handleMoveUp,
    handleMoveDown,
    handleBlockTypeChange,
  };
}

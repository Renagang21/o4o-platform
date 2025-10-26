/**
 * Block Operation Shortcuts
 * Delete, Backspace, Duplicate, Copy, Paste
 */

import { Block } from '@/types/post.types';
import { shouldInterceptKey, isBlockEmpty } from './utils';

export interface BlockOperationOptions {
  blocks: Block[];
  selectedBlockId: string | null;
  handleBlockDelete: (blockId: string) => void;
  handleDuplicate: (blockId: string) => void;
  handleBlockCopy: (blockId: string) => void;
  handleBlockPaste: (afterBlockId?: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function createBlockOperationShortcuts(options: BlockOperationOptions) {
  const {
    blocks,
    selectedBlockId,
    handleBlockDelete,
    handleDuplicate,
    handleBlockCopy,
    handleBlockPaste,
    showToast,
  } = options;

  return (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;

    // Delete key: Block deletion (only when not in editable context)
    if (e.key === 'Delete' && selectedBlockId && !e.shiftKey && shouldInterceptKey(target)) {
      e.preventDefault();
      handleBlockDelete(selectedBlockId);
      return true;
    }

    // Backspace: Delete empty block
    if (e.key === 'Backspace' && selectedBlockId) {
      const block = blocks.find((b) => b.id === selectedBlockId);
      const isEmpty = isBlockEmpty(block);

      if (isEmpty && shouldInterceptKey(target)) {
        e.preventDefault();

        // Focus on previous block after deletion
        const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
        if (currentIndex > 0) {
          const prevBlock = blocks[currentIndex - 1];
          setTimeout(() => {
            const prevBlockElement = document.querySelector(`[data-block-id="${prevBlock.id}"]`);
            if (prevBlockElement) {
              const editableElement = prevBlockElement.querySelector(
                '[contenteditable="true"]'
              ) as HTMLElement;
              if (editableElement) {
                editableElement.focus();
                // Move cursor to end
                try {
                  const selection = window.getSelection();
                  const range = document.createRange();
                  range.selectNodeContents(editableElement);
                  range.collapse(false);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                } catch (err) {
                  console.error('Failed to set cursor position:', err);
                }
              }
            }
          }, 50);
        }

        handleBlockDelete(selectedBlockId);
        return true;
      }
    }

    // Cmd+D: Duplicate block
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedBlockId) {
      e.preventDefault();
      handleDuplicate(selectedBlockId);
      showToast('Block duplicated', 'success');
      return true;
    }

    // Cmd+C: Copy block (only when not in contentEditable)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedBlockId && shouldInterceptKey(target)) {
      e.preventDefault();
      handleBlockCopy(selectedBlockId);
      return true;
    }

    // Cmd+V: Paste block (only when not in contentEditable)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && shouldInterceptKey(target)) {
      e.preventDefault();
      handleBlockPaste(selectedBlockId || undefined);
      return true;
    }

    return false;
  };
}

/**
 * Keyboard Shortcuts (Refactored)
 *
 * Replaces the 284-line handleKeyDown function with modular, testable handlers
 */

export * from './utils';
export * from './saveShortcuts';
export * from './blockNavigationShortcuts';
export * from './blockOperationShortcuts';
export * from './formattingShortcuts';

import { useEffect } from 'react';
import { Block } from '@/types/post.types';
import {
  createSaveShortcuts,
  type SaveShortcutsOptions,
} from './saveShortcuts';
import {
  createBlockNavigationShortcuts,
  type BlockNavigationOptions,
} from './blockNavigationShortcuts';
import {
  createBlockOperationShortcuts,
  type BlockOperationOptions,
} from './blockOperationShortcuts';
import {
  createFormattingShortcuts,
  type FormattingOptions,
} from './formattingShortcuts';

export interface KeyboardShortcutsOptions
  extends SaveShortcutsOptions,
    Omit<BlockNavigationOptions, 'blocks' | 'selectedBlockId'>,
    Omit<BlockOperationOptions, 'blocks' | 'selectedBlockId'>,
    FormattingOptions {
  blocks: Block[];
  selectedBlockId: string | null;
  handleBlockTypeChange: (blockId: string, newType: string) => void;
}

/**
 * Combines all keyboard shortcuts into a single handler
 * Handlers are executed in order until one returns true
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    handleSave,
    handleUndo,
    handleRedo,
    blocks,
    selectedBlockId,
    setSelectedBlockId,
    isBlockInserterOpen,
    setIsBlockInserterOpen,
    handleBlockDelete,
    handleDuplicate,
    handleBlockCopy,
    handleBlockPaste,
    showToast,
    handleBlockTypeChange,
  } = options;

  useEffect(() => {
    // Create individual shortcut handlers
    const saveHandler = createSaveShortcuts({
      handleSave,
      handleUndo,
      handleRedo,
    });

    const navigationHandler = createBlockNavigationShortcuts({
      blocks,
      selectedBlockId,
      setSelectedBlockId,
      isBlockInserterOpen,
      setIsBlockInserterOpen,
    });

    const operationHandler = createBlockOperationShortcuts({
      blocks,
      selectedBlockId,
      handleBlockDelete,
      handleDuplicate,
      handleBlockCopy,
      handleBlockPaste,
      showToast,
    });

    const formattingHandler = createFormattingShortcuts({
      showToast,
    });

    // Combined handler - executes in priority order
    const handleKeyDown = (e: KeyboardEvent) => {
      // Priority 1: Save/Undo/Redo (always highest priority)
      if (saveHandler(e)) return;

      // Priority 2: Block operations (delete, duplicate, copy, paste)
      if (operationHandler(e)) return;

      // Priority 3: Block navigation (tab, arrows, slash)
      if (navigationHandler(e)) return;

      // Priority 4: Text formatting (only in contentEditable)
      if (formattingHandler(e)) return;

      // Block type transformations (Cmd+Alt+Number)
      const target = e.target as HTMLElement;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.altKey &&
        selectedBlockId &&
        /^[0-6]$/.test(e.key)
      ) {
        e.preventDefault();
        if (e.key === '0') {
          handleBlockTypeChange(selectedBlockId, 'o4o/paragraph');
        } else {
          handleBlockTypeChange(selectedBlockId, `o4o/heading-h${e.key}`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSave,
    handleUndo,
    handleRedo,
    blocks,
    selectedBlockId,
    setSelectedBlockId,
    isBlockInserterOpen,
    setIsBlockInserterOpen,
    handleBlockDelete,
    handleDuplicate,
    handleBlockCopy,
    handleBlockPaste,
    showToast,
    handleBlockTypeChange,
  ]);
}

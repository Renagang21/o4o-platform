/**
 * useBlockKeyboard Hook
 *
 * Manages keyboard shortcuts for block operations
 * Extracted from EnhancedBlockWrapper to reduce complexity
 */

import { useEffect } from 'react';

export interface UseBlockKeyboardOptions {
  /** Whether block is selected */
  isSelected: boolean;
  /** Delete block handler */
  onDelete: () => void;
  /** Copy block handler */
  onCopy?: () => void;
  /** Paste block handler */
  onPaste?: () => void;
  /** Duplicate block handler */
  onDuplicate: () => void;
  /** Move block up handler */
  onMoveUp: () => void;
  /** Move block down handler */
  onMoveDown: () => void;
  /** Add block handler */
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  /** Can move up flag */
  canMoveUp?: boolean;
  /** Can move down flag */
  canMoveDown?: boolean;
}

/**
 * Block keyboard shortcuts hook
 *
 * Shortcuts:
 * - Delete: Remove block (when not editing text)
 * - Ctrl/Cmd+C: Copy block (when no text selected)
 * - Ctrl/Cmd+V: Paste block (when not in text field)
 * - Ctrl/Cmd+D: Duplicate block
 * - Alt+Up/Down: Move block up/down
 * - Enter: Create new block after (for blocks without custom Enter handling)
 *
 * @param options - Keyboard handler configuration
 *
 * @example
 * ```typescript
 * useBlockKeyboard({
 *   isSelected,
 *   onDelete,
 *   onCopy,
 *   onPaste,
 *   onDuplicate,
 *   onMoveUp,
 *   onMoveDown,
 *   onAddBlock,
 *   canMoveUp,
 *   canMoveDown,
 * });
 * ```
 */
export function useBlockKeyboard({
  isSelected,
  onDelete,
  onCopy,
  onPaste,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  canMoveUp = true,
  canMoveDown = true,
}: UseBlockKeyboardOptions): void {
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isContentEditableTarget = target.isContentEditable || target.closest('[contenteditable]');

      // Text formatting shortcuts (Ctrl+B/I/K) - delegate to RichText for contentEditable elements
      if (isContentEditableTarget && (e.ctrlKey || e.metaKey)) {
        if (['b', 'i', 'k'].includes(e.key)) {
          // Let RichText handle these shortcuts
          return;
        }
      }

      // Delete key - remove block
      if (e.key === 'Delete' && !e.shiftKey && !e.ctrlKey) {
        // Only delete if not editing text
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onDelete();
        }
      }

      // Ctrl/Cmd + C - copy block
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        const selection = window.getSelection();
        // Only intercept if no text is selected (to avoid interfering with text copy)
        if (!selection?.toString()) {
          e.preventDefault();
          onCopy?.();
        }
      }

      // Ctrl/Cmd + V - paste block
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
        // Only intercept if not in contentEditable element
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onPaste?.();
        }
      }

      // Ctrl/Cmd + D - duplicate block
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        onDuplicate();
      }

      // Alt + Up/Down - move block
      if (e.altKey && !e.shiftKey) {
        if (e.key === 'ArrowUp' && canMoveUp) {
          e.preventDefault();
          onMoveUp();
        } else if (e.key === 'ArrowDown' && canMoveDown) {
          e.preventDefault();
          onMoveDown();
        }
      }

      // Tab/Shift+Tab - navigate between blocks (handled by parent)
      // We don't prevent default here to allow parent to handle navigation

      // Enter key - create new block after (default behavior for blocks without custom Enter handling)
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        // Check if block has its own Enter handler (e.g., Slate blocks)
        // Slate blocks and other blocks with custom Enter handling should set data-handles-enter="true"
        const hasCustomHandler = target.closest('[data-handles-enter="true"]');

        if (!hasCustomHandler && onAddBlock) {
          // Default behavior: create new paragraph block after
          e.preventDefault();
          onAddBlock('after', 'o4o/paragraph');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, onDelete, onCopy, onPaste, onDuplicate, onMoveUp, onMoveDown, onAddBlock, canMoveUp, canMoveDown]);
}

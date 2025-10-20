/**
 * Common Backspace Key Handler for Block Components
 *
 * Provides standardized Backspace key behavior across text-based blocks:
 * - Delete empty blocks
 * - Prevent deletion for special blocks (e.g., BlockAppender)
 * - Handle cursor position at start of block
 *
 * Usage:
 * ```typescript
 * const handleBackspace = useCallback(
 *   createBlockBackspaceHandler({
 *     editor,
 *     onDelete,
 *   }),
 *   [editor, onDelete]
 * );
 *
 * // In keyDown handler:
 * handleBackspace(event);
 * ```
 */

import { Editor, Range } from 'slate';

export interface BlockBackspaceHandlerOptions {
  /** Slate editor instance */
  editor: Editor;
  /** Block deletion handler (optional - omit for blocks that shouldn't be deleted) */
  onDelete?: () => void;
  /** If true, only prevent default without deleting (for special blocks like BlockAppender) */
  preventDefaultOnly?: boolean;
}

/**
 * Creates a standardized Backspace key handler for blocks
 *
 * @param options - Configuration options
 * @returns KeyDown event handler function
 */
export function createBlockBackspaceHandler(options: BlockBackspaceHandlerOptions) {
  const { editor, onDelete, preventDefaultOnly = false } = options;

  return (event: React.KeyboardEvent) => {
    // Only handle Backspace key
    if (event.key !== 'Backspace') {
      return;
    }

    // Get text content from entire editor
    const text = Editor.string(editor, []);
    const isEmpty = !text || text.trim() === '';

    // If block is empty, delete it (or prevent default for special blocks)
    if (isEmpty) {
      event.preventDefault();
      if (!preventDefaultOnly && onDelete) {
        onDelete();
      }
      return;
    }

    // If at start of non-empty block with whitespace-only content
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      if (start.offset === 0 && text.trim() === '') {
        event.preventDefault();
        if (!preventDefaultOnly && onDelete) {
          onDelete();
        }
      }
    }
  };
}

/**
 * React hook version of createBlockBackspaceHandler
 *
 * @param options - Configuration options
 * @returns KeyDown event handler function
 */
export function useBlockBackspaceHandler(options: BlockBackspaceHandlerOptions) {
  return createBlockBackspaceHandler(options);
}

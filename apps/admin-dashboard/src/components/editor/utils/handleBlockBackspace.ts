/**
 * Common Backspace Key Handler for Content Blocks
 *
 * Provides standardized Backspace key behavior for content blocks
 * (ParagraphBlock, HeadingBlock, etc.):
 * - Delete empty blocks
 * - Handle cursor position at start of block
 *
 * Note: UI control blocks (like BlockAppenderBlock) should NOT use this handler
 * as they have different semantics and should not be deleted.
 *
 * Usage:
 * ```typescript
 * const handleBackspace = useMemo(
 *   () => createBlockBackspaceHandler({
 *     editor,
 *     onDelete,
 *   }),
 *   [editor, onDelete]
 * );
 *
 * // In keyDown handler:
 * if (event.key === 'Backspace') {
 *   handleBackspace(event);
 *   return;
 * }
 * ```
 */

import { Editor, Range } from 'slate';

export interface BlockBackspaceHandlerOptions {
  /** Slate editor instance */
  editor: Editor;
  /** Block deletion handler */
  onDelete: () => void;
}

/**
 * Creates a standardized Backspace key handler for content blocks
 *
 * @param options - Configuration options
 * @returns KeyDown event handler function
 */
export function createBlockBackspaceHandler(options: BlockBackspaceHandlerOptions) {
  const { editor, onDelete } = options;

  return (event: React.KeyboardEvent) => {
    // Only handle Backspace key
    if (event.key !== 'Backspace') {
      return;
    }

    // Get text content from entire editor
    const text = Editor.string(editor, []);
    const isEmpty = !text || text.trim() === '';

    // If block is empty, delete it
    if (isEmpty) {
      event.preventDefault();
      onDelete();
      return;
    }

    // If at start of non-empty block with whitespace-only content
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      if (start.offset === 0 && text.trim() === '') {
        event.preventDefault();
        onDelete();
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

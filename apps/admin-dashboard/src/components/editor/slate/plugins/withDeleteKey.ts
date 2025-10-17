/**
 * withDeleteKey Plugin
 *
 * Handles Backspace key behavior for paragraph blocks:
 * - At start of paragraph: merge with previous paragraph
 * - Empty paragraph: delete and move to previous
 * - Preserve formatting during merge
 *
 * Based on Slate.js plugin pattern for deleteBackward
 */

import { Editor, Transforms, Range, Point, Element as SlateElement } from 'slate';

/**
 * withDeleteKey Plugin
 *
 * Extends the editor with delete/backspace behaviors
 */
export const withDeleteKey = (editor: Editor): Editor => {
  const { deleteBackward } = editor;

  /**
   * Override deleteBackward to handle Backspace key
   *
   * When Backspace is pressed at the start of a block:
   * 1. Check if cursor is at start of block (offset 0)
   * 2. If previous block exists, merge with it
   * 3. Preserve text formatting during merge
   */
  editor.deleteBackward = (unit) => {
    const { selection } = editor;

    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);

      // Check if we're at the start of a block
      const isAtStart = Editor.isStart(editor, start, start.path.slice(0, -1));

      if (isAtStart) {
        const [currentBlock] = Editor.above(editor, {
          match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && Editor.isBlock(editor, n),
        }) || [];

        if (currentBlock) {
          // Try to get the previous block
          const previousPath = Editor.before(editor, start.path, { unit: 'block' });

          if (previousPath) {
            // Merge the current block with the previous one
            Transforms.mergeNodes(editor);
            return;
          }
        }
      }
    }

    // Default behavior
    deleteBackward(unit);
  };

  return editor;
};

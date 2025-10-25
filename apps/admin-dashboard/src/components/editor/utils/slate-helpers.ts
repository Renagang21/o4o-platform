/**
 * Slate Helper Functions
 *
 * Common helper functions for Slate text formatting
 * Eliminates duplication across HeadingBlock, ParagraphBlock, ListBlock
 */

import { Editor } from 'slate';
import { CustomText } from '@/components/editor/slate/types/slate-types';

/**
 * Checks if a text format mark is currently active
 *
 * @param editor - Slate editor instance
 * @param format - Format key to check (bold, italic, underline, etc.)
 * @returns true if the mark is active at current selection
 *
 * @example
 * ```typescript
 * const isBold = isMarkActive(editor, 'bold');
 * if (isBold) {
 *   // Show bold button as pressed
 * }
 * ```
 */
export const isMarkActive = (editor: Editor, format: keyof CustomText): boolean => {
  const marks = Editor.marks(editor) as CustomText | null;
  return marks ? marks[format] === true : false;
};

/**
 * Toggles a text format mark on/off
 *
 * @param editor - Slate editor instance
 * @param format - Format key to toggle (bold, italic, underline, etc.)
 *
 * @example
 * ```typescript
 * // Toggle bold formatting
 * toggleMark(editor, 'bold');
 *
 * // Toggle italic formatting
 * toggleMark(editor, 'italic');
 * ```
 */
export const toggleMark = (editor: Editor, format: keyof CustomText): void => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

/**
 * Applies multiple marks at once
 *
 * @param editor - Slate editor instance
 * @param marks - Object with mark keys and their values
 *
 * @example
 * ```typescript
 * // Make text bold and italic
 * applyMarks(editor, { bold: true, italic: true });
 * ```
 */
export const applyMarks = (editor: Editor, marks: Partial<CustomText>): void => {
  Object.entries(marks).forEach(([key, value]) => {
    if (value) {
      Editor.addMark(editor, key, value);
    } else {
      Editor.removeMark(editor, key);
    }
  });
};

/**
 * Removes all formatting marks from current selection
 *
 * @param editor - Slate editor instance
 *
 * @example
 * ```typescript
 * // Clear all formatting (bold, italic, underline, etc.)
 * clearAllMarks(editor);
 * ```
 */
export const clearAllMarks = (editor: Editor): void => {
  const marks = Editor.marks(editor) as CustomText | null;
  if (marks) {
    Object.keys(marks).forEach((key) => {
      Editor.removeMark(editor, key);
    });
  }
};

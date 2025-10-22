/**
 * Mark utility functions for Slate editor
 * Separated from SlateEditor to avoid circular imports
 */

import { Editor } from 'slate';
import type { CustomText } from '../types/slate-types';

/**
 * Check if a mark is active in the current selection
 */
export const isMarkActive = (editor: Editor, format: keyof CustomText): boolean => {
  const marks = Editor.marks(editor) as CustomText | null;
  return marks ? marks[format] === true : false;
};

/**
 * Toggle a mark on the current selection
 */
export const toggleMark = (editor: Editor, format: keyof CustomText): void => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

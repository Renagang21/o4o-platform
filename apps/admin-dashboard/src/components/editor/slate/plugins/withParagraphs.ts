/**
 * withParagraphs Plugin
 *
 * Handles Enter key behavior for paragraph blocks:
 * - Split current paragraph at cursor position
 * - Create new paragraph below
 * - Move cursor to new paragraph
 *
 * Based on Slate.js plugin pattern:
 * https://docs.slatejs.org/concepts/06-commands
 */

import { Editor, Transforms, Element as SlateElement } from 'slate';
import type { ParagraphElement } from '../types/slate-types';

/**
 * withParagraphs Plugin
 *
 * Extends the editor with paragraph-specific behaviors
 */
export const withParagraphs = (editor: Editor): Editor => {
  const { insertBreak } = editor;

  /**
   * Override insertBreak to handle Enter key
   *
   * When Enter is pressed:
   * 1. Split the current paragraph at cursor position
   * 2. Create a new paragraph with the text after cursor
   * 3. Move cursor to the new paragraph
   */
  editor.insertBreak = () => {
    const { selection } = editor;

    if (!selection) {
      insertBreak();
      return;
    }

    // Get the current block
    const [match] = Editor.nodes(editor, {
      match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'paragraph',
      mode: 'lowest',
    });

    if (match) {
      const [paragraph] = match as [ParagraphElement, number[]];

      // Split the paragraph at current selection
      Transforms.splitNodes(editor, {
        always: true,
      });

      // Ensure the new node is a paragraph (inherit alignment if any)
      const newParagraph: ParagraphElement = {
        type: 'paragraph',
        ...(paragraph.align && { align: paragraph.align }),
        children: [{ text: '' }],
      };

      // Set the properties of the new node
      Transforms.setNodes(editor, newParagraph as any, {
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
    } else {
      // Default behavior for non-paragraph blocks
      insertBreak();
    }
  };

  return editor;
};

/**
 * Slate Editor Factory
 *
 * Common editor creation logic for text-based blocks
 * Eliminates duplication across HeadingBlock, ParagraphBlock, ListBlock
 */

import { createEditor, Editor } from 'slate';
import { withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { withLinks } from '@/components/editor/slate/plugins/withLinks';
import { withDeleteKey } from '@/components/editor/slate/plugins/withDeleteKey';

export interface EditorOptions {
  /** Enable link plugin (default: true) */
  withLinks?: boolean;
  /** Enable history plugin for undo/redo (default: true) */
  withHistory?: boolean;
  /** Enable delete key plugin (default: true) */
  withDeleteKey?: boolean;
}

/**
 * Creates a pre-configured Slate editor with standard plugins
 *
 * @param options - Editor plugin configuration
 * @returns Configured Slate editor instance
 *
 * @example
 * ```typescript
 * // Standard editor (used in HeadingBlock, ParagraphBlock)
 * const editor = useMemo(() => createTextEditor(), []);
 *
 * // Custom configuration
 * const editor = useMemo(() => createTextEditor({
 *   withLinks: false,
 *   withDeleteKey: false
 * }), []);
 * ```
 */
export const createTextEditor = (options: EditorOptions = {}): Editor => {
  const {
    withLinks: enableLinks = true,
    withHistory: enableHistory = true,
    withDeleteKey: enableDeleteKey = true,
  } = options;

  let editor: Editor = createEditor();

  // withReact is always required for React integration
  editor = withReact(editor);

  // Apply optional plugins in order
  if (enableHistory) {
    editor = withHistory(editor);
  }

  if (enableDeleteKey) {
    editor = withDeleteKey(editor);
  }

  if (enableLinks) {
    editor = withLinks(editor);
  }

  return editor;
};

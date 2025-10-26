/**
 * useSlateKeyboard Hook
 *
 * Common keyboard shortcut handling for Slate-based blocks
 * Eliminates duplication across HeadingBlock, ParagraphBlock, ListBlock
 */

import { useCallback } from 'react';
import { Editor } from 'slate';
import { toggleMark } from '../utils/slate-helpers';

export interface SlateKeyboardOptions {
  /** Slate editor instance */
  editor: Editor;
  /** Enter key handler (from createBlockEnterHandler) */
  handleEnterKey: (event: React.KeyboardEvent) => void;
  /** Backspace key handler (from createBlockBackspaceHandler) */
  handleBackspaceKey: (event: React.KeyboardEvent) => void;
  /** Optional link editor toggle (Cmd+K) */
  onToggleLink?: () => void;
}

/**
 * Creates keyboard event handler with common formatting shortcuts
 *
 * Provides:
 * - Cmd+B: Bold
 * - Cmd+I: Italic
 * - Cmd+U: Underline
 * - Cmd+K: Link editor (if onToggleLink provided)
 * - Enter: Block splitting/creation
 * - Backspace: Block deletion
 *
 * @param options - Keyboard handler configuration
 * @returns KeyDown event handler function
 *
 * @example
 * ```typescript
 * const handleKeyDown = useSlateKeyboard({
 *   editor,
 *   handleEnterKey,
 *   handleBackspaceKey,
 *   onToggleLink: toggleLinkEditor,
 * });
 *
 * <Editable
 *   onKeyDown={handleKeyDown}
 *   // ... other props
 * />
 * ```
 */
export function useSlateKeyboard({
  editor,
  handleEnterKey,
  handleBackspaceKey,
  onToggleLink,
}: SlateKeyboardOptions) {
  return useCallback(
    (event: React.KeyboardEvent) => {
      console.log('[useSlateKeyboard] Event received:', {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        defaultPrevented: event.defaultPrevented,
      });

      const isModKey = event.ctrlKey || event.metaKey;

      // Format shortcuts (Cmd/Ctrl + key)
      if (isModKey) {
        switch (event.key) {
          case 'b': {
            event.preventDefault();
            toggleMark(editor, 'bold');
            return;
          }
          case 'i': {
            event.preventDefault();
            toggleMark(editor, 'italic');
            return;
          }
          case 'u': {
            event.preventDefault();
            toggleMark(editor, 'underline');
            return;
          }
          case 'k': {
            if (onToggleLink) {
              event.preventDefault();
              onToggleLink();
              return;
            }
            break;
          }
        }
      }

      // Enter key handling - use provided handler
      if (event.key === 'Enter') {
        handleEnterKey(event);
        return;
      }

      // Backspace key handling - use provided handler
      if (event.key === 'Backspace') {
        handleBackspaceKey(event);
        return;
      }
    },
    [editor, handleEnterKey, handleBackspaceKey, onToggleLink]
  );
}

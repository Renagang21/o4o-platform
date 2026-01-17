/**
 * useBlockFocus Hook
 *
 * Manages automatic focus when block is selected
 * Extracted from EnhancedBlockWrapper to reduce complexity
 *
 * Supports both regular DOM elements (textarea, input) and Slate.js editors
 */

import { useEffect, RefObject } from 'react';
import { ReactEditor } from 'slate-react';
import { Transforms, Editor as SlateEditor, BaseEditor } from 'slate';

// Extended editor type that includes ReactEditor capabilities
type SlateReactEditor = BaseEditor & ReactEditor;

export interface UseBlockFocusOptions {
  /** Block element reference */
  blockRef: RefObject<HTMLElement>;
  /** Whether block is selected */
  isSelected: boolean;
  /** Optional Slate editor instance (for Slate-based blocks) */
  slateEditor?: SlateReactEditor;
}

/**
 * Auto-focus hook for blocks
 *
 * Features:
 * - Automatically focuses focusable elements when block is selected
 * - Creates cursor selection for contentEditable elements
 * - Preserves existing user selection when possible
 * - Handles timing issues with DOM rendering
 *
 * @param options - Hook configuration
 *
 * @example
 * ```typescript
 * const blockRef = useRef<HTMLDivElement>(null);
 * useBlockFocus({ blockRef, isSelected });
 * ```
 */
export function useBlockFocus({
  blockRef,
  isSelected,
  slateEditor,
}: UseBlockFocusOptions): void {
  useEffect(() => {
    if (!isSelected || !blockRef.current) return;

    const timeoutId = setTimeout(() => {
      if (!blockRef.current) return;

      // Slate editor branch: Use ReactEditor.focus() API
      if (slateEditor) {
        try {
          // Check if editor already has focus
          const alreadyFocused = ReactEditor.isFocused(slateEditor);

          if (!alreadyFocused) {
            ReactEditor.focus(slateEditor);
          }

          // Only move selection when the editor has no selection yet
          if (!slateEditor.selection) {
            // Cast to any to avoid strict type checking on editor internals
            Transforms.select(slateEditor as any, SlateEditor.end(slateEditor as any, []));
          }
        } catch (error) {
          console.debug('Slate focus error (non-critical):', error);
        }
        return;
      }

      // Regular DOM elements (textarea, input) branch
      const focusableElement = blockRef.current.querySelector(
        '[contenteditable], input, textarea'
      );

      if (!(focusableElement instanceof HTMLElement)) return;

      // Only focus if not already focused
      if (document.activeElement !== focusableElement) {
        focusableElement.focus();
      }

      // For contentEditable (non-Slate), create selection if necessary
      if (focusableElement.contentEditable === 'true') {
        const selection = window.getSelection();
        if (!selection) return;

        const needsSelection =
          selection.rangeCount === 0 ||
          !focusableElement.contains(selection.anchorNode) ||
          (selection.rangeCount > 0 &&
            selection.anchorNode === focusableElement &&
            focusableElement.childNodes.length === 0);

        if (needsSelection) {
          try {
            const range = document.createRange();
            range.selectNodeContents(focusableElement);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (error) {
            console.debug('Selection creation error (non-critical):', error);
          }
        }
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isSelected, blockRef, slateEditor]);
}

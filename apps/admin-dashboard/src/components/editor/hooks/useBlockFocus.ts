/**
 * useBlockFocus Hook
 *
 * Manages automatic focus when block is selected
 * Extracted from EnhancedBlockWrapper to reduce complexity
 */

import { useEffect, RefObject } from 'react';

export interface UseBlockFocusOptions {
  /** Block element reference */
  blockRef: RefObject<HTMLElement>;
  /** Whether block is selected */
  isSelected: boolean;
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
}: UseBlockFocusOptions): void {
  useEffect(() => {
    if (!isSelected || !blockRef.current) return;

    const focusableElement = blockRef.current.querySelector(
      '[contenteditable], input, textarea'
    );

    if (!(focusableElement instanceof HTMLElement)) return;

    // CRITICAL: Focus and create selection for cursor visibility
    // Wait for RichText UNCONTROLLED initialization and DOM rendering
    const timeoutId = setTimeout(() => {
      // Double-check element still exists after delay
      if (!focusableElement.isConnected) return;

      // Only focus if not already focused - prevents disrupting existing cursor
      if (document.activeElement !== focusableElement) {
        focusableElement.focus();
      }

      // For contentEditable, create selection ONLY if truly necessary
      if (focusableElement.contentEditable === 'true') {
        const selection = window.getSelection();
        if (!selection) return;

        // Check if we need to create a selection
        const needsSelection =
          selection.rangeCount === 0 || // No selection at all
          !focusableElement.contains(selection.anchorNode) || // Selection outside this element
          (selection.rangeCount > 0 &&
            selection.anchorNode === focusableElement &&
            focusableElement.childNodes.length === 0); // Empty block

        // Only create selection if user hasn't set one
        if (needsSelection) {
          try {
            // Create a collapsed range at the end for new blocks
            const range = document.createRange();
            range.selectNodeContents(focusableElement);
            range.collapse(false); // false = end of content
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (error) {
            // Ignore errors - cursor will appear on first keystroke
            console.debug('Selection creation error (non-critical):', error);
          }
        }
        // else: preserve existing selection (user clicked within text or dragged to select)
      }
    }, 50); // 50ms delay for new blocks to fully render

    return () => clearTimeout(timeoutId);
  }, [isSelected, blockRef]);
}

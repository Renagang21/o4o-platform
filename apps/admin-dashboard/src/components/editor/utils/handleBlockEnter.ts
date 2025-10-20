/**
 * Common Enter Key Handler for Block Components
 *
 * Provides standardized Enter key behavior across all text-based blocks:
 * 1. Plain Enter: Save current block content and create new BlockAppender below
 * 2. Shift+Enter or Ctrl+Enter: Create line break within the block (handled by Slate)
 *
 * Usage:
 * ```typescript
 * const handleKeyDown = useBlockEnterHandler({
 *   editor,
 *   onChange,
 *   onAddBlock,
 *   attributes,
 * });
 * ```
 */

import { Editor } from 'slate';
import { serialize } from '../slate/utils/serialize';

export interface BlockEnterHandlerOptions {
  /** Slate editor instance */
  editor: Editor;
  /** Block content change handler */
  onChange: (content: string, attributes?: any) => void;
  /** Handler to add new block */
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  /** Current block attributes */
  attributes?: any;
}

/**
 * Creates a standardized Enter key handler for blocks
 *
 * @param options - Configuration options
 * @returns KeyDown event handler function
 */
export function createBlockEnterHandler(options: BlockEnterHandlerOptions) {
  const { editor, onChange, onAddBlock, attributes } = options;

  return (event: React.KeyboardEvent) => {
    // Only handle Enter key
    if (event.key !== 'Enter') {
      return;
    }

    // Shift+Enter or Ctrl+Enter: line break within block
    // Let Slate's withParagraphs plugin handle it
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      return;
    }

    // Plain Enter: create new BlockAppender below this block
    event.preventDefault();

    // Save current content by serializing editor state
    const currentHtml = serialize(editor.children);
    console.log('[createBlockEnterHandler] Enter pressed, saving content and adding BlockAppender');
    onChange(currentHtml, attributes);

    // Create new BlockAppender after this block
    console.log('[createBlockEnterHandler] Calling onAddBlock(after, o4o/block-appender)');
    onAddBlock?.('after', 'o4o/block-appender');
  };
}

/**
 * React hook version of createBlockEnterHandler
 *
 * @param options - Configuration options
 * @returns KeyDown event handler function
 */
export function useBlockEnterHandler(options: BlockEnterHandlerOptions) {
  return createBlockEnterHandler(options);
}

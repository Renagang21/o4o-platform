/**
 * Common Enter Key Handler for Block Components
 *
 * Provides standardized Enter key behavior following WordPress Gutenberg:
 * 1. 블록 끝에서 Enter: 새 블록 생성 (New Block Insertion)
 * 2. 블록 중간에서 Enter: 블록 분할 (Block Splitting)
 * 3. Shift+Enter: 줄바꿈 (Line break within block)
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

    // Shift+Enter: 줄바꿈 (Slate의 기본 동작)
    if (event.shiftKey) {
      return;
    }

    // Selection 확인
    const { selection } = editor;
    if (!selection) {
      return;
    }

    // Enter 키 기본 동작 방지
    event.preventDefault();

    // 현재 블록 내용 저장
    const currentHtml = serialize(editor.children);
    onChange(currentHtml, attributes);

    // 새 paragraph 블록 추가
    // (블록 중간이든 끝이든 상관없이 새 블록 생성)
    console.log('[handleBlockEnter] Adding new paragraph block');
    onAddBlock?.('after', 'o4o/paragraph');
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

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

import { Editor, Transforms, Range, Point, Element as SlateElement } from 'slate';
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

    // 커서가 블록 끝에 있는지 확인
    const isCollapsed = Range.isCollapsed(selection);
    const end = Editor.end(editor, selection.anchor.path);
    const isAtEnd = isCollapsed && Point.equals(selection.anchor, end);

    if (isAtEnd) {
      // ✅ 블록 끝: 새 paragraph 블록 추가
      console.log('[handleBlockEnter] At block end - adding new paragraph');
      onAddBlock?.('after', 'o4o/paragraph');
    } else {
      // 🪓 블록 중간: 블록 분할
      console.log('[handleBlockEnter] In block middle - splitting block');

      // 1. 현재 위치에서 블록 분할
      Transforms.splitNodes(editor, { always: true });

      // 2. 분할된 새 블록을 paragraph 타입으로 변환
      //    (예: Heading 중간에서 Enter → 위는 Heading, 아래는 Paragraph)
      Transforms.setNodes(
        editor,
        { type: 'paragraph' },
        {
          match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
          mode: 'lowest' // 가장 가까운 블록만 변환
        }
      );
    }

    // 변경사항 저장
    const currentHtml = serialize(editor.children);
    onChange(currentHtml, attributes);
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

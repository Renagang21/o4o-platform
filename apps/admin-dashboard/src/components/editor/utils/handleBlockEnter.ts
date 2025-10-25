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

import { Editor, Transforms, Range, Point, Node } from 'slate';
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

    // 블록 끝 위치 확인
    const end = Editor.end(editor, []);
    const isAtEnd = Point.equals(selection.anchor, end);

    if (isAtEnd) {
      // 커서가 블록 끝에 있음 → 현재 내용 저장하고 빈 블록 추가
      const currentHtml = serialize(editor.children);
      onChange(currentHtml, attributes);
      onAddBlock?.('after', 'o4o/paragraph');
    } else {
      // 커서가 블록 중간에 있음 → 블록 분할

      // 커서 이후 범위 정의
      const afterRange = {
        anchor: selection.anchor,
        focus: end
      };

      // 커서 이후 fragment 추출 (formatting 유지)
      const afterFragment = Node.fragment(editor, afterRange);

      // 커서 이후 내용 삭제
      Transforms.delete(editor, { at: afterRange });

      // 현재 블록(커서 이전 부분) 저장
      const beforeHtml = serialize(editor.children);
      onChange(beforeHtml, attributes);

      // 커서 이후 fragment를 HTML로 변환
      const afterHtml = serialize(afterFragment);

      // 커서 이후 내용으로 새 블록 생성
      onAddBlock?.('after', 'o4o/paragraph', { text: afterHtml });
    }
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

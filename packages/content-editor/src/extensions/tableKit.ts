/**
 * Table 확장 + 표시 CSS — WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1
 *
 * TipTap 표준 Table 확장 4종(Table/TableRow/TableHeader/TableCell)을 O4O 표준 구성으로 묶는다.
 * 별도 Table 구현을 만들지 않는다.
 *
 * TABLE_STYLES 는 편집기(RichTextEditor)와 ContentRenderer(소비 측 렌더)에 **동일 적용**한다
 * (IMAGE_DISPLAY_STYLES 와 같은 원칙). 편집기에서 생성한 표는 class="editor-table" 로 직렬화되어
 * 저장·재로드·소비 표면에서 동일하게 렌더된다.
 */
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

export const TABLE_EXTENSIONS = [
  Table.configure({
    resizable: true,
    // 편집기 생성 표에 표준 클래스 부여 → 편집기/렌더러 CSS 공유 + round-trip 보존
    HTMLAttributes: { class: 'editor-table' },
  }),
  TableRow,
  TableHeader,
  TableCell,
];

/**
 * 표 표시 CSS — 편집기와 ContentRenderer 양쪽에 동일 주입.
 * 테두리 · 헤더 배경 · 셀 패딩 + 모바일 가로 스크롤(.tableWrapper).
 */
export const TABLE_STYLES = `
table.editor-table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1em 0; overflow: hidden; }
table.editor-table td, table.editor-table th { border: 1px solid #d1d5db; padding: 6px 10px; vertical-align: top; box-sizing: border-box; position: relative; min-width: 1em; }
table.editor-table th { background: #f9fafb; font-weight: 600; text-align: left; }
table.editor-table p { margin: 0; }
/* 편집기 셀 선택/열 리사이즈 데코 (ProseMirror table) */
.content-editor .ProseMirror table.editor-table .selectedCell:after { content: ""; position: absolute; inset: 0; background: rgba(79,70,229,0.1); pointer-events: none; z-index: 2; }
.content-editor .ProseMirror table.editor-table .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: -2px; width: 3px; background: #4f46e5; pointer-events: none; }
.content-editor .ProseMirror .tableWrapper { overflow-x: auto; }
.content-editor .ProseMirror.resize-cursor { cursor: col-resize; }
`;

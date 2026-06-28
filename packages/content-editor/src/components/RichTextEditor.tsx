/**
 * RichTextEditor Component
 * TipTap 기반 리치 텍스트 에디터
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { ContentRenderer } from './ContentRenderer';
import { sanitizeRichHtml, isBlankHtml } from '../sanitize';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
// WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1 Phase 2: 고정 레이아웃 노드 + built-in 템플릿
import { ProductDetailLayout } from '../extensions/productDetailLayout';
import { BUILTIN_TEMPLATES, isBuiltinTemplateId } from '../builtinTemplates';

import { Toolbar } from './Toolbar';
import { TemplateModal } from './TemplateModal';
import { SaveTemplateModal } from './SaveTemplateModal';
import type { ContentEditorProps } from '../types';
import { handleClipboardPaste } from '../utils/handleImagePaste';

// WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1: 템플릿 드롭다운 항목 스타일
const menuItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 500,
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: '#334155',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export function RichTextEditor({
  value = '',
  onChange,
  onSave,
  placeholder = '내용을 입력하세요...',
  editable = true,
  autoSaveInterval = 0,
  minHeight = '400px',
  className = '',
  preset = 'full',
  showTemplateActions = false,
  templateCategory,
  templates = [],
  onLoadTemplates,
  onSaveAsTemplate,
  canCreatePublicTemplate = false,
  templatesLoading = false,
  templatesSaving = false,
  onUseTemplate,
  onImageUpload,
  existingImages,
  onMediaLibraryPick,
  aiRequestHeaders,
  showCommunitySave,
  showStoreSave,
}: ContentEditorProps) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  // WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1: 탭 행 우측 "템플릿 ▾" 메뉴
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [pasteUploading, setPasteUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'html' | 'preview'>('edit');
  // WO-O4O-COMMON-EDITOR-HTML-TAB-SAVE-RAW-PRESERVE-V1:
  //   htmlSource(HTML 탭/미리보기 원문)를 외부 value 로 초기화 → 재오픈 시 raw HTML 보존 노출.
  const [htmlSource, setHtmlSource] = useState(() => (isBlankHtml(value) ? '' : value));
  // 사용자가 WYSIWYG(편집) 탭에서 실제로 편집했는지 추적. true 면 getHTML()(TipTap 직렬화)이 authoritative,
  //   false 면 HTML 원문(htmlSource)이 authoritative → 임의 inline style(배경/박스 등) 보존.
  const wysiwygDirtyRef = useRef(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'editor-youtube',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextStyle,
      Color,
      // 고정 레이아웃(860px) 컨테이너 — 마커 div 만 parse, 내부 편집 가능
      ProductDetailLayout,
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      // onUpdate 는 setContent(…, false) 에서는 발생하지 않으므로(switchTab/value-sync 는 emit=false 사용)
      //   여기 진입 = 사용자의 실제 WYSIWYG 편집(타이핑/툴바/붙여넣기). WYSIWYG 를 authoritative 로 표시.
      wysiwygDirtyRef.current = true;
      if (onChange) {
        onChange({
          html: editor.getHTML(),
          json: editor.getJSON(),
        });
      }
    },
    editorProps: {
      handlePaste: (_view, event) => {
        if (!onImageUpload) return false;
        // 이미지 클립보드 항목이 있을 때만 가로챔 (WO-STORE-IMAGE-PASTE-SUPPORT-V1)
        const hasImage = Array.from(event.clipboardData?.items ?? []).some(
          (item) => item.type.startsWith('image/'),
        );
        if (!hasImage) return false;

        setPasteUploading(true);
        handleClipboardPaste(
          event,
          onImageUpload,
          (url) => {
            editor?.chain().focus().setImage({ src: url }).run();
          },
        ).finally(() => setPasteUploading(false));

        return true; // TipTap 기본 paste 억제
      },
    },
  });

  // 외부 value 변경 시 에디터 업데이트
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // 현재 activeTab 을 ref 로 미러 — 아래 동기화 effect 가 탭 전환마다 재실행되지 않도록(클로저 stale 방지).
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // WO-O4O-COMMON-EDITOR-HTML-TAB-SAVE-RAW-PRESERVE-V1:
  //   htmlSource(원문)를 외부 value 와 동기화한다. 단, WYSIWYG 편집 중(getHTML authoritative)이거나
  //   HTML 탭 입력 중에는 clobber 하지 않는다. 재오픈/외부 로딩 시 raw value 가 HTML 탭·미리보기에 보존되도록 함.
  //   deps 는 [value] 만 — 탭 전환 시점에 (부모 value 가 onChange 를 아직 반영하기 전인) stale value 로
  //   htmlSource 를 덮어쓰는 회귀를 막는다. activeTab 은 ref 로 현재값 참조.
  useEffect(() => {
    if (wysiwygDirtyRef.current) return;
    if (activeTabRef.current === 'html') return;
    const v = isBlankHtml(value) ? '' : value;
    setHtmlSource((prev) => (prev === v ? prev : v));
  }, [value]);

  // WO-O4O-COMMON-EDITOR-HTML-TAB-SAVE-RAW-PRESERVE-V1:
  //   autosave/Ctrl+S 등 콜백 클로저에서 최신 htmlSource 를 읽기 위한 ref 미러.
  const htmlSourceRef = useRef(htmlSource);
  useEffect(() => {
    htmlSourceRef.current = htmlSource;
  }, [htmlSource]);

  // 저장 authoritative html 해석: WYSIWYG 편집을 했으면 getHTML()(직렬화), 아니면 HTML 원문(보존).
  const resolveSaveHtml = useCallback(
    () =>
      wysiwygDirtyRef.current
        ? editor?.getHTML() || ''
        : htmlSourceRef.current || editor?.getHTML() || '',
    [editor],
  );

  // 자동 저장
  useEffect(() => {
    if (!autoSaveInterval || !onSave || !editor) return;

    const interval = setInterval(() => {
      onSave({
        html: resolveSaveHtml(),
        json: editor.getJSON(),
      });
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSaveInterval, onSave, editor, resolveSaveHtml]);

  // 탭 전환 — HTML draft ↔ editor state 동기화
  // WO-O4O-STANDARD-EDITOR-HTML-DIRECT-INPUT-PREVIEW-SAVE-FIX-V1 §4.1/§4.4
  function switchTab(tab: 'edit' | 'html' | 'preview') {
    if (tab === activeTab) return;
    if (activeTab === 'html') {
      // HTML 탭을 떠날 때: draft 를 sanitize 후 editor 에 commit 하되 **emit=false**(편집 탭 준비용 동기화만).
      //   WO-O4O-COMMON-EDITOR-HTML-TAB-SAVE-RAW-PRESERVE-V1:
      //   기존엔 emit=true 로 getHTML()(TipTap 직렬화) 결과가 부모 저장값이 되어 inline style(배경/박스 등)이
      //   유실됐다. 이제 부모 저장값은 raw htmlSource(원문)로 직접 onChange 하여 디자인을 보존한다.
      //   sanitize 는 위험 태그/malformed wrapper 정리용으로 editor 동기화에만 사용(저장값은 원문).
      const clean = sanitizeRichHtml(htmlSource);
      editor?.commands.setContent(isBlankHtml(clean) ? '' : clean, false);
      wysiwygDirtyRef.current = false; // HTML 원문이 authoritative
      onChange?.({ html: isBlankHtml(htmlSource) ? '' : htmlSource, json: editor?.getJSON() });
    } else if (activeTab === 'edit') {
      // 편집 탭을 떠날 때: 사용자가 실제 WYSIWYG 편집을 한 경우에만 editor → draft 스냅샷.
      //   편집하지 않았으면 htmlSource(원문)를 유지 → HTML 작성 콘텐츠의 디자인 보존(재오픈 포함).
      if (wysiwygDirtyRef.current) {
        const html = editor?.getHTML() || '';
        setHtmlSource(isBlankHtml(html) ? '' : html);
      }
    }
    setActiveTab(tab);
  }

  // 키보드 단축키로 저장
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave && editor) {
          onSave({
            html: resolveSaveHtml(),
            json: editor.getJSON(),
          });
        }
      }
    },
    [onSave, editor, resolveSaveHtml]
  );

  return (
    <div
      className={`content-editor ${className}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        position: 'relative',
        background: 'white',
      }}
      onKeyDown={handleKeyDown}
    >
      {pasteUploading && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            zIndex: 10,
            fontSize: 12,
            color: '#6b7280',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 4,
            padding: '2px 8px',
            pointerEvents: 'none',
          }}
        >
          이미지 업로드 중…
        </div>
      )}

      {/* 탭 바 — full preset + 편집 가능 모드에서만 표시. 좌: 탭 / 우: 템플릿 메뉴 */}
      {editable && preset !== 'compact' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div style={{ display: 'flex' }}>
            {(['edit', 'html', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                style={{
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? '#4f46e5' : '#6b7280',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                {tab === 'edit' ? '편집' : tab === 'html' ? 'HTML' : '미리보기'}
              </button>
            ))}
          </div>

          {/* 템플릿 메뉴 (문서 전체 적용 기능 → 탭 행 우측) */}
          {showTemplateActions && (
            <div style={{ position: 'relative', paddingRight: 6 }}>
              <button
                type="button"
                onClick={() => setTemplateMenuOpen((o) => !o)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 12px', fontSize: 12, fontWeight: 500,
                  border: '1px solid #e2e8f0', borderRadius: 6,
                  background: 'white', color: '#475569', cursor: 'pointer',
                }}
              >
                템플릿 <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {templateMenuOpen && (
                <>
                  {/* click-outside backdrop */}
                  <div
                    onClick={() => setTemplateMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                  />
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + 4px)', right: 6, zIndex: 51,
                      minWidth: 200, background: 'white', border: '1px solid #e5e7eb',
                      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setTemplateMenuOpen(false); onLoadTemplates?.(); setTemplateModalOpen(true); }}
                      style={menuItemStyle}
                    >
                      템플릿 불러오기
                    </button>
                    {onSaveAsTemplate && (
                      <button
                        type="button"
                        onClick={() => { setTemplateMenuOpen(false); setSaveModalOpen(true); }}
                        style={menuItemStyle}
                      >
                        현재 내용을 템플릿으로 저장
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 툴바 — 편집 탭에서만 표시 */}
      {editable && activeTab === 'edit' && (
        <Toolbar editor={editor} preset={preset} onImageUpload={onImageUpload} existingImages={existingImages} onMediaLibraryPick={onMediaLibraryPick} aiRequestHeaders={aiRequestHeaders} showCommunitySave={showCommunitySave} showStoreSave={showStoreSave} />
      )}

      {/* 편집 탭 — 항상 마운트, 다른 탭에서는 숨김 (에디터 상태 유지) */}
      <div style={{ display: activeTab === 'edit' ? undefined : 'none', overflow: 'hidden', borderRadius: '0 0 8px 8px' }}>
        <EditorContent
          editor={editor}
          style={{
            minHeight,
            padding: '16px',
          }}
        />
      </div>

      {/* HTML 탭 */}
      {activeTab === 'html' && (
        <div style={{ padding: '12px' }}>
          <textarea
            value={htmlSource}
            onChange={(e) => {
              // §4.1/§4.5: HTML draft 를 입력 즉시 부모 본문 값으로 반영.
              //   저장 버튼은 에디터 외부(소비처)에 있어 탭 전환 없이 저장될 수 있으므로,
              //   keystroke 마다 onChange 로 전파해야 미리보기·저장이 draft 기준으로 동작한다.
              //   빈 placeholder(`<p></p>` 등)는 빈 본문('')으로 정규화하여 "내용 없음" 검사가 정상 동작.
              const next = e.target.value;
              setHtmlSource(next);
              // WO-O4O-COMMON-EDITOR-HTML-TAB-SAVE-RAW-PRESERVE-V1: HTML 원문 입력 → 원문이 authoritative
              wysiwygDirtyRef.current = false;
              onChange?.({ html: isBlankHtml(next) ? '' : next });
            }}
            style={{
              width: '100%',
              minHeight,
              fontFamily: "'Fira Code', Consolas, monospace",
              fontSize: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 4,
              padding: '12px',
              resize: 'vertical',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              outline: 'none',
              color: '#1e293b',
              background: '#f8fafc',
            }}
            placeholder="HTML 코드를 직접 입력하거나 외부 HTML을 붙여넣으세요..."
            spellCheck={false}
          />
          <p style={{ marginTop: 6, fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
            편집 탭으로 전환하면 HTML이 자동 적용됩니다 · script, 위험 태그는 자동 제거됩니다
          </p>
        </div>
      )}

      {/* 미리보기 탭 */}
      {activeTab === 'preview' && (
        <div style={{ padding: '16px', minHeight }}>
          {htmlSource ? (
            <ContentRenderer variant="guide" html={htmlSource} />
          ) : (
            <p style={{ color: '#9ca3af', fontSize: 13 }}>미리볼 내용이 없습니다.</p>
          )}
        </div>
      )}
      {/* 템플릿 불러오기/저장 버튼은 탭 행 우측 "템플릿 ▾" 메뉴로 이동됨
          (WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1). 하단 버튼 바 제거. */}
      {showTemplateActions && (
        <>
          <TemplateModal
            open={templateModalOpen}
            onClose={() => setTemplateModalOpen(false)}
            onSelect={(html, templateId) => {
              if (editor) {
                const isEmpty = editor.isEmpty || editor.getHTML() === '<p></p>';
                if (!isEmpty) {
                  const ok = window.confirm('현재 작성 중인 내용이 사라집니다. 템플릿을 적용하시겠습니까?');
                  if (!ok) return;
                }
                editor.commands.setContent(html);
                const appliedHtml = editor.getHTML();
                // HTML 탭/미리보기 원문도 동기화 → 적용 직후 탭 왕복에서 레이아웃 보존
                setHtmlSource(appliedHtml);
                wysiwygDirtyRef.current = false;
                onChange?.({ html: appliedHtml, json: editor.getJSON() });
                // built-in 템플릿은 백엔드 row 가 없으므로 사용 기록 생략
                if (!isBuiltinTemplateId(templateId)) onUseTemplate?.(templateId);
              }
            }}
            templates={[...BUILTIN_TEMPLATES, ...templates]}
            loading={templatesLoading}
            defaultCategory={templateCategory}
          />
          <SaveTemplateModal
            open={saveModalOpen}
            onClose={() => setSaveModalOpen(false)}
            onSave={(name, category, isPublic) => {
              onSaveAsTemplate?.(name, category, isPublic);
              setSaveModalOpen(false);
            }}
            saving={templatesSaving}
            canCreatePublic={canCreatePublicTemplate}
            defaultCategory={templateCategory}
          />
        </>
      )}
      <style>{editorStyles}</style>
    </div>
  );
}

const editorStyles = `
  .content-editor .ProseMirror {
    outline: none;
    min-height: inherit;
  }

  .content-editor .ProseMirror p {
    margin: 0 0 0.75em 0;
    line-height: 1.6;
  }

  .content-editor .ProseMirror h1 {
    font-size: 2em;
    font-weight: 700;
    margin: 1em 0 0.5em 0;
    line-height: 1.3;
  }

  .content-editor .ProseMirror h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
    line-height: 1.3;
  }

  .content-editor .ProseMirror h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
    line-height: 1.3;
  }

  .content-editor .ProseMirror ul,
  .content-editor .ProseMirror ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  .content-editor .ProseMirror li {
    margin: 0.25em 0;
  }

  .content-editor .ProseMirror blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1em;
    margin: 1em 0;
    color: #6b7280;
    font-style: italic;
  }

  .content-editor .ProseMirror pre {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.9em;
    margin: 1em 0;
  }

  .content-editor .ProseMirror code {
    background: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.9em;
  }

  .content-editor .ProseMirror pre code {
    background: none;
    padding: 0;
  }

  .content-editor .ProseMirror hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 1.5em 0;
  }

  .content-editor .ProseMirror a,
  .content-editor .ProseMirror .editor-link {
    color: #2563eb;
    text-decoration: underline;
    cursor: pointer;
  }

  .content-editor .ProseMirror .editor-image {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em auto;
    display: block;
  }

  .content-editor .ProseMirror .editor-youtube {
    width: 100%;
    max-width: 640px;
    aspect-ratio: 16 / 9;
    margin: 1em 0;
    border-radius: 8px;
    overflow: hidden;
  }

  .content-editor .ProseMirror .editor-youtube iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .content-editor .ProseMirror mark {
    background-color: #fef08a;
    padding: 0.1em 0.2em;
    border-radius: 2px;
  }

  .content-editor .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
  }

  .content-editor .ProseMirror:focus p.is-editor-empty:first-child::before {
    color: #d1d5db;
  }

  /* Selection styles */
  .content-editor .ProseMirror ::selection {
    background: #dbeafe;
  }

  /* Image selection */
  .content-editor .ProseMirror img.ProseMirror-selectednode {
    outline: 3px solid #2563eb;
    border-radius: 8px;
  }
`;

export default RichTextEditor;

/**
 * RichTextEditor Component
 * TipTap 기반 리치 텍스트 에디터
 */

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { ContentRenderer } from './ContentRenderer';
import { sanitizeRichHtml } from '../sanitize';
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

import { Toolbar } from './Toolbar';
import { TemplateModal } from './TemplateModal';
import { SaveTemplateModal } from './SaveTemplateModal';
import type { ContentEditorProps } from '../types';
import { handleClipboardPaste } from '../utils/handleImagePaste';

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
  const [pasteUploading, setPasteUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'html' | 'preview'>('edit');
  const [htmlSource, setHtmlSource] = useState('');
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
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
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

  // 자동 저장
  useEffect(() => {
    if (!autoSaveInterval || !onSave || !editor) return;

    const interval = setInterval(() => {
      onSave({
        html: editor.getHTML(),
        json: editor.getJSON(),
      });
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSaveInterval, onSave, editor]);

  // 탭 전환 — HTML 탭→편집 탭 시 sanitize 후 editor에 반영
  function switchTab(tab: 'edit' | 'html' | 'preview') {
    if (activeTab === 'html' && tab === 'edit') {
      const clean = sanitizeRichHtml(htmlSource);
      editor?.commands.setContent(clean);
      // onUpdate가 onChange를 호출하므로 별도 호출 불필요
    } else if (tab !== 'edit') {
      setHtmlSource(editor?.getHTML() || '');
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
            html: editor.getHTML(),
            json: editor.getJSON(),
          });
        }
      }
    },
    [onSave, editor]
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

      {/* 탭 바 — full preset + 편집 가능 모드에서만 표시 */}
      {editable && preset !== 'compact' && (
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
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
      )}

      {/* 툴바 — 편집 탭에서만 표시 */}
      {editable && activeTab === 'edit' && (
        <Toolbar editor={editor} preset={preset} onImageUpload={onImageUpload} existingImages={existingImages} onMediaLibraryPick={onMediaLibraryPick} aiRequestHeaders={aiRequestHeaders} showCommunitySave={showCommunitySave} showStoreSave={showStoreSave} />
      )}

      {/* 편집 탭 — 항상 마운트, 다른 탭에서는 숨김 (에디터 상태 유지) */}
      <div style={{ display: activeTab === 'edit' ? undefined : 'none', overflow: 'hidden', borderRadius: showTemplateActions ? '0' : '0 0 8px 8px' }}>
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
            onChange={(e) => setHtmlSource(e.target.value)}
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
      {showTemplateActions && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            borderTop: '1px solid #e5e7eb',
            background: '#f8fafc',
            borderRadius: '0 0 8px 8px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onLoadTemplates?.();
              setTemplateModalOpen(true);
            }}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              background: 'white',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            템플릿 불러오기
          </button>
          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                background: 'white',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              템플릿으로 저장
            </button>
          )}
        </div>
      )}
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
                onChange?.({ html: editor.getHTML(), json: editor.getJSON() });
                onUseTemplate?.(templateId);
              }
            }}
            templates={templates}
            loading={templatesLoading}
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

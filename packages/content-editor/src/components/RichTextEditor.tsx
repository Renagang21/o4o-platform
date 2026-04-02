/**
 * RichTextEditor Component
 * TipTap 기반 리치 텍스트 에디터
 */

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
}: ContentEditorProps) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
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
      {editable && <Toolbar editor={editor} preset={preset} onImageUpload={onImageUpload} existingImages={existingImages} onMediaLibraryPick={onMediaLibraryPick} />}
      <div style={{ overflow: 'hidden', borderRadius: showTemplateActions ? '0' : '0 0 8px 8px' }}>
        <EditorContent
          editor={editor}
          style={{
            minHeight,
            padding: '16px',
          }}
        />
      </div>
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
    margin: 1em 0;
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

/**
 * 숏코드 시스템이 통합된 TipTap 에디터
 */

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

import ShortcodeExtension from './extensions/ShortcodeExtension';
import ShortcodeInserter from './ShortcodeInserter';
import { registerShortcodes } from '../shortcodes';
import { ShortcodeRenderer } from '../../lib/shortcode/renderer';

interface ShortcodeTiptapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  apiClient?: any;
  className?: string;
  editable?: boolean;
  showShortcodeButton?: boolean;
}

const ShortcodeTiptapEditor: React.FC<ShortcodeTiptapEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  apiClient,
  className = '',
  editable = true,
  showShortcodeButton = true
}) => {
  const [isShortcodeInserterOpen, setIsShortcodeInserterOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 숏코드 등록
  useEffect(() => {
    registerShortcodes();
    setIsReady(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      ShortcodeExtension,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
    // Pass API client to shortcode renderer
    shortcodeApiClient: apiClient,
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!isReady || !editor) {
    return (
      <div className="editor-loading flex items-center justify-center h-32 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const MenuBar = () => {
    if (!editor) return null;

    return (
      <div className="editor-menubar flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        {/* Text Formatting */}
        <div className="menubar-group flex items-center gap-1 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`menubar-button p-2 rounded hover:bg-gray-200 ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Bold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`menubar-button p-2 rounded hover:bg-gray-200 ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Italic"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 4l-8 16M8 20l8-16" />
            </svg>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`menubar-button p-2 rounded hover:bg-gray-200 ${
              editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Underline"
          >
            U
          </button>
        </div>

        {/* Headings */}
        <div className="menubar-group flex items-center gap-1 mr-2">
          <select
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: level as any }).run();
              }
            }}
            value={
              editor.isActive('heading', { level: 1 }) ? 1 :
              editor.isActive('heading', { level: 2 }) ? 2 :
              editor.isActive('heading', { level: 3 }) ? 3 :
              editor.isActive('heading', { level: 4 }) ? 4 :
              editor.isActive('heading', { level: 5 }) ? 5 :
              editor.isActive('heading', { level: 6 }) ? 6 : 0
            }
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={0}>Paragraph</option>
            <option value={1}>Heading 1</option>
            <option value={2}>Heading 2</option>
            <option value={3}>Heading 3</option>
            <option value={4}>Heading 4</option>
            <option value={5}>Heading 5</option>
            <option value={6}>Heading 6</option>
          </select>
        </div>

        {/* Lists */}
        <div className="menubar-group flex items-center gap-1 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`menubar-button p-2 rounded hover:bg-gray-200 ${
              editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`menubar-button p-2 rounded hover:bg-gray-200 ${
              editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Ordered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h12M9 12h12M9 19h12M5 5v.01M5 12v.01M5 19v.01" />
            </svg>
          </button>
        </div>

        {/* Link */}
        <div className="menubar-group flex items-center gap-1 mr-2">
          <button
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={`menubar-button p-2 rounded hover:bg-gray-200 ${
              editor.isActive('link') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Add Link"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>

        {/* Shortcode Button */}
        {showShortcodeButton && (
          <div className="menubar-group flex items-center gap-1 mr-2">
            <button
              onClick={() => setIsShortcodeInserterOpen(true)}
              className="menubar-button p-2 rounded hover:bg-gray-200 bg-blue-50 text-blue-600 font-medium"
              title="Insert Shortcode (Ctrl+Shift+S)"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Shortcode
            </button>
          </div>
        )}

        {/* Undo/Redo */}
        <div className="menubar-group flex items-center gap-1 ml-auto">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="menubar-button p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="menubar-button p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`shortcode-tiptap-editor border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      <MenuBar />
      
      <EditorContent 
        editor={editor}
        className="editor-content"
      />

      {/* Shortcode Inserter Modal */}
      <ShortcodeInserter
        editor={editor}
        isOpen={isShortcodeInserterOpen}
        onClose={() => setIsShortcodeInserterOpen(false)}
      />

      {/* Editor Styles */}
      <style jsx>{`
        .editor-content .ProseMirror {
          min-height: 200px;
          padding: 1rem;
          outline: none;
        }
        
        .editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        
        .shortcode-wrapper {
          margin: 0.5rem 0;
        }
        
        .shortcode-editor-overlay {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 10;
        }
      `}</style>
    </div>
  );
};

export default ShortcodeTiptapEditor;
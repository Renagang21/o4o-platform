import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';

interface SimpleTiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  showMenuBar?: boolean;
}

export function SimpleTiptapEditor({
  content,
  onChange,
  placeholder = "시작하세요...",
  className = "",
  editable = true,
  showMenuBar = false
}: SimpleTiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        에디터를 로드하고 있습니다...
      </div>
    );
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      {showMenuBar && (
        <div className="border-b border-gray-200 p-2 flex gap-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('bulletList') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            List
          </button>
        </div>
      )}
      
      <EditorContent
        editor={editor}
        className="prose prose-lg max-w-none focus:outline-none"
        style={{ minHeight: '400px' }}
      />
      
      {content === '' && (
        <div className="absolute top-16 left-6 text-gray-400 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
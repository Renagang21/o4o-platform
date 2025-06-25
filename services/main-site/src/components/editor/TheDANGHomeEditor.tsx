import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';

// Custom extension for editable sections
const EditableSection = StarterKit.extend({
  name: 'editableSection',
  
  addAttributes() {
    return {
      'data-tiptap-editable': {
        default: null,
      },
      'data-tiptap-section': {
        default: null,
      },
      'data-tiptap-component': {
        default: null,
      },
      'data-tiptap-field': {
        default: null,
      },
    };
  },
});

interface TheDANGHomeEditorProps {
  initialContent?: string;
  onUpdate?: (content: string) => void;
  editable?: boolean;
}

const TheDANGHomeEditor: React.FC<TheDANGHomeEditorProps> = ({
  initialContent = '',
  onUpdate,
  editable = true
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      EditableSection,
    ],
    content: initialContent,
    editable: editable && isEditing,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
    },
  });

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (editor) {
      editor.setEditable(!isEditing);
    }
  };

  const MenuBar = () => {
    if (!editor) return null;

    return (
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-2 sticky top-0 bg-white z-10">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 3 }) ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('paragraph') ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Paragraph
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <button
          onClick={() => {
            const url = window.prompt('URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('link') ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Link
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Image URL');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className="px-3 py-1 rounded text-sm bg-gray-100"
        >
          Image
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <select
          onChange={(e) => {
            const color = e.target.value;
            if (color) {
              editor.chain().focus().setColor(color).run();
            }
          }}
          className="px-2 py-1 rounded text-sm bg-gray-100 border"
        >
          <option value="">Text Color</option>
          <option value="#5787c5">Primary Blue</option>
          <option value="#4a73a8">Dark Blue</option>
          <option value="#1a1a1a">Dark Text</option>
          <option value="#666666">Gray Text</option>
          <option value="#999999">Light Gray</option>
        </select>
      </div>
    );
  };

  return (
    <div className="w-full">
      {editable && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                TheDANG Style Homepage Editor
              </h3>
              <p className="text-sm text-blue-700">
                {isEditing 
                  ? 'Editing mode: Click on sections to edit content' 
                  : 'Preview mode: Toggle editing to modify content'
                }
              </p>
            </div>
            <button
              onClick={toggleEditing}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                isEditing
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isEditing ? 'Save & Preview' : 'Edit Content'}
            </button>
          </div>
        </div>
      )}

      {isEditing && <MenuBar />}
      
      <div className={`thedang-theme ${isEditing ? 'editor-mode' : ''}`}>
        <EditorContent 
          editor={editor} 
          className={isEditing ? 'prose max-w-none' : ''}
        />
      </div>

      <style jsx>{`
        .editor-mode [data-tiptap-editable] {
          position: relative;
          border: 2px dashed #5787c5;
          border-radius: 4px;
          margin: 8px 0;
          min-height: 40px;
        }

        .editor-mode [data-tiptap-editable]:hover {
          background-color: rgba(87, 135, 197, 0.05);
        }

        .editor-mode [data-tiptap-editable]::before {
          content: attr(data-tiptap-editable);
          position: absolute;
          top: -20px;
          left: 0;
          background: #5787c5;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .editor-mode [data-tiptap-section] {
          outline: 1px dashed #22c55e;
          outline-offset: 4px;
        }

        .editor-mode [data-tiptap-component] {
          outline: 1px dashed #f59e0b;
          outline-offset: 2px;
        }

        .editor-mode [data-tiptap-field] {
          outline: 1px dashed #ec4899;
          outline-offset: 1px;
          min-height: 20px;
          display: inline-block;
          min-width: 50px;
        }

        .editor-mode [data-tiptap-field]:hover {
          background-color: rgba(236, 72, 153, 0.1);
        }

        .ProseMirror {
          outline: none;
        }

        .ProseMirror p.is-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
};

export default TheDANGHomeEditor;
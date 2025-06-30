import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { lowlight } from 'lowlight'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Image as ImageIcon,
  Code2,
  MoreHorizontal
} from 'lucide-react'
import MediaSelector from '@/pages/media/components/MediaSelector'
import { MediaFile } from '@/types/content'

interface TipTapBlockProps {
  data: {
    content?: any
    level?: number
    language?: string
    code?: string
  }
  onChange: (data: any) => void
  blockType: string
  isSelected?: boolean
}

const TipTapBlock: React.FC<TipTapBlockProps> = ({
  data,
  onChange,
  blockType,
  isSelected
}) => {
  const [showMediaSelector, setShowMediaSelector] = React.useState(false)

  // Configure editor based on block type
  const getEditorConfig = () => {
    const baseConfig = {
      extensions: [
        StarterKit.configure({
          heading: blockType === 'heading' ? { levels: [1, 2, 3, 4, 5, 6] } : false,
          paragraph: blockType === 'paragraph',
          blockquote: blockType === 'quote',
          bulletList: blockType === 'list' && data.listType === 'bullet',
          orderedList: blockType === 'list' && data.listType === 'ordered',
          codeBlock: false, // We'll use CodeBlockLowlight instead
          horizontalRule: blockType === 'divider'
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 hover:text-blue-700 underline'
          }
        }),
        Image.configure({
          inline: true,
          HTMLAttributes: {
            class: 'max-w-full h-auto rounded'
          }
        }),
        Placeholder.configure({
          placeholder: getPlaceholder()
        })
      ],
      content: data.content || '',
      onUpdate: ({ editor }: any) => {
        onChange({ content: editor.getJSON() })
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-4'
        }
      }
    }

    // Add table extensions if needed
    if (blockType === 'table') {
      baseConfig.extensions.push(
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader
      )
    }

    // Add code block extension
    if (blockType === 'code') {
      baseConfig.extensions.push(
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class: 'bg-gray-900 text-gray-100 rounded p-4 font-mono text-sm'
          }
        })
      )
    }

    return baseConfig
  }

  const getPlaceholder = () => {
    switch (blockType) {
      case 'paragraph':
        return '텍스트를 입력하세요...'
      case 'heading':
        return `제목 ${data.level || 2}를 입력하세요...`
      case 'list':
        return '목록 항목을 입력하세요...'
      case 'quote':
        return '인용문을 입력하세요...'
      case 'code':
        return '코드를 입력하세요...'
      default:
        return '내용을 입력하세요...'
    }
  }

  const editor = useEditor(getEditorConfig())

  // Update editor when data changes
  useEffect(() => {
    if (editor && data.content && editor.getJSON() !== data.content) {
      editor.commands.setContent(data.content)
    }
  }, [data.content, editor])

  // Handle special block types
  if (blockType === 'divider') {
    return (
      <div className="py-4">
        <hr className={`border-t ${
          data.style === 'dashed' ? 'border-dashed' : 
          data.style === 'dotted' ? 'border-dotted' : 
          'border-solid'
        } border-gray-300`} style={{ borderWidth: data.thickness || 1 }} />
      </div>
    )
  }

  if (blockType === 'code' && !editor) {
    return (
      <div className="relative">
        <select
          value={data.language || 'javascript'}
          onChange={(e) => onChange({ language: e.target.value })}
          className="absolute top-2 right-2 text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="jsx">JSX</option>
          <option value="tsx">TSX</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="json">JSON</option>
          <option value="sql">SQL</option>
        </select>
        <pre className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto">
          <code className={`language-${data.language || 'javascript'}`}>
            {data.code || '// 코드를 입력하세요'}
          </code>
        </pre>
      </div>
    )
  }

  const handleImageSelect = (files: MediaFile[]) => {
    if (files.length > 0 && editor) {
      files.forEach(file => {
        editor.chain().focus().setImage({ src: file.url, alt: file.altText }).run()
      })
    }
    setShowMediaSelector(false)
  }

  return (
    <div className={`relative border rounded-lg ${
      isSelected ? 'ring-2 ring-blue-500' : 'border-gray-200'
    }`}>
      {/* Toolbar */}
      {editor && blockType !== 'divider' && (
        <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap">
          {/* Text formatting */}
          {blockType === 'paragraph' && (
            <>
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-100 ${
                  editor.isActive('bold') ? 'bg-gray-200' : ''
                }`}
                title="굵게"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-100 ${
                  editor.isActive('italic') ? 'bg-gray-200' : ''
                }`}
                title="기울임"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-2 rounded hover:bg-gray-100 ${
                  editor.isActive('strike') ? 'bg-gray-200' : ''
                }`}
                title="취소선"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-2 rounded hover:bg-gray-100 ${
                  editor.isActive('code') ? 'bg-gray-200' : ''
                }`}
                title="인라인 코드"
              >
                <Code className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
            </>
          )}

          {/* Heading levels */}
          {blockType === 'heading' && (
            <>
              {[1, 2, 3, 4, 5, 6].map(level => (
                <button
                  key={level}
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: level as any }).run()
                    onChange({ level })
                  }}
                  className={`px-3 py-2 rounded hover:bg-gray-100 text-sm ${
                    editor.isActive('heading', { level }) ? 'bg-gray-200' : ''
                  }`}
                  title={`제목 ${level}`}
                >
                  H{level}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-300 mx-1" />
            </>
          )}

          {/* List options */}
          {blockType === 'list' && (
            <>
              <button
                onClick={() => {
                  editor.chain().focus().toggleBulletList().run()
                  onChange({ listType: 'bullet' })
                }}
                className={`p-2 rounded hover:bg-gray-100 ${
                  data.listType === 'bullet' ? 'bg-gray-200' : ''
                }`}
                title="글머리 기호"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleOrderedList().run()
                  onChange({ listType: 'ordered' })
                }}
                className={`p-2 rounded hover:bg-gray-100 ${
                  data.listType === 'ordered' ? 'bg-gray-200' : ''
                }`}
                title="번호 매기기"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
            </>
          )}

          {/* Table actions */}
          {blockType === 'table' && (
            <>
              <button
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className="p-2 rounded hover:bg-gray-100"
                title="표 삽입"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="p-2 rounded hover:bg-gray-100"
                title="열 추가"
              >
                열+
              </button>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="p-2 rounded hover:bg-gray-100"
                title="행 추가"
              >
                행+
              </button>
              <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="p-2 rounded hover:bg-gray-100"
                title="열 삭제"
              >
                열-
              </button>
              <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="p-2 rounded hover:bg-gray-100"
                title="행 삭제"
              >
                행-
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
            </>
          )}

          {/* Common actions */}
          <button
            onClick={() => setShowMediaSelector(true)}
            className="p-2 rounded hover:bg-gray-100"
            title="이미지 삽입"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="실행 취소"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="다시 실행"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Media Selector Modal */}
      {showMediaSelector && (
        <MediaSelector
          allowedTypes={['image']}
          onSelect={handleImageSelect}
          onClose={() => setShowMediaSelector(false)}
        />
      )}
    </div>
  )
}

export default TipTapBlock
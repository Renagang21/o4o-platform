import { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Youtube,
  Package,
  Undo,
  Redo,
} from 'lucide-react'
import { AIAssistant } from './AIAssistant'
import { EditorTemplateManager } from './EditorTemplateManager'
import { EditorVersionManager } from './EditorVersionManager'

interface EditorToolbarProps {
  editor: Editor
  page: string
}

// 툴바 버튼 정의
const toolbarItems = [
  {
    type: 'divider',
  },
  {
    type: 'button',
    icon: Undo,
    title: '실행 취소',
    action: (editor: Editor) => editor.commands.undo(),
    isActive: (editor: Editor) => false,
    isDisabled: (editor: Editor) => !editor.can().undo(),
  },
  {
    type: 'button',
    icon: Redo,
    title: '다시 실행',
    action: (editor: Editor) => editor.commands.redo(),
    isActive: (editor: Editor) => false,
    isDisabled: (editor: Editor) => !editor.can().redo(),
  },
  {
    type: 'divider',
  },
  {
    type: 'button',
    icon: Bold,
    title: '굵게',
    action: (editor: Editor) => editor.commands.toggleBold(),
    isActive: (editor: Editor) => editor.isActive('bold'),
  },
  {
    type: 'button',
    icon: Italic,
    title: '기울임',
    action: (editor: Editor) => editor.commands.toggleItalic(),
    isActive: (editor: Editor) => editor.isActive('italic'),
  },
  {
    type: 'divider',
  },
  {
    type: 'button',
    icon: Heading1,
    title: '제목 1',
    action: (editor: Editor) => editor.commands.toggleHeading({ level: 1 }),
    isActive: (editor: Editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    type: 'button',
    icon: Heading2,
    title: '제목 2',
    action: (editor: Editor) => editor.commands.toggleHeading({ level: 2 }),
    isActive: (editor: Editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    type: 'divider',
  },
  {
    type: 'button',
    icon: List,
    title: '글머리 기호 목록',
    action: (editor: Editor) => editor.commands.toggleBulletList(),
    isActive: (editor: Editor) => editor.isActive('bulletList'),
  },
  {
    type: 'button',
    icon: ListOrdered,
    title: '번호 매기기 목록',
    action: (editor: Editor) => editor.commands.toggleOrderedList(),
    isActive: (editor: Editor) => editor.isActive('orderedList'),
  },
  {
    type: 'divider',
  },
  {
    type: 'button',
    icon: Youtube,
    title: 'YouTube 동영상 삽입',
    action: (editor: Editor) => {
      const url = prompt('YouTube URL을 입력하세요:')
      if (url) {
        editor.commands.setYouTubeEmbed({ url })
      }
    },
  },
  {
    type: 'button',
    icon: Package,
    title: '제품 블록 삽입',
    action: (editor: Editor) => {
      editor.commands.setProductBlock({
        name: '샘플 제품',
        description: '이것은 샘플 제품 설명입니다.',
        imageUrl: 'https://via.placeholder.com/150',
        price: 29900,
      })
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'component',
    component: AIAssistant,
  },
]

export const EditorToolbar = ({ editor, page }: EditorToolbarProps) => {
  return (
    <div className="border-b p-2 flex items-center gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bold') ? 'bg-gray-100' : ''
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('italic') ? 'bg-gray-100' : ''
          }`}
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('strike') ? 'bg-gray-100' : ''
          }`}
        >
          <s>S</s>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-2" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-100' : ''
          }`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''
          }`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-gray-100' : ''
          }`}
        >
          H3
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-2" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bulletList') ? 'bg-gray-100' : ''
          }`}
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('orderedList') ? 'bg-gray-100' : ''
          }`}
        >
          1. List
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-2" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const url = window.prompt('YouTube URL을 입력하세요:')
            if (url) {
              editor.chain().focus().setYouTubeEmbed({ url }).run()
            }
          }}
          className="p-2 rounded hover:bg-gray-100"
        >
          YouTube
        </button>
        <button
          onClick={() => {
            const name = window.prompt('제품명을 입력하세요:')
            const description = window.prompt('제품 설명을 입력하세요:')
            const imageUrl = window.prompt('이미지 URL을 입력하세요:')
            const price = window.prompt('가격을 입력하세요:')

            if (name && description && imageUrl && price) {
              editor.chain().focus().setProductBlock({
                name,
                description,
                imageUrl,
                price: parseInt(price),
              }).run()
            }
          }}
          className="p-2 rounded hover:bg-gray-100"
        >
          제품
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <EditorTemplateManager editor={editor} />
        <EditorVersionManager editor={editor} page={page} />
        <AIAssistant editor={editor} />
      </div>
    </div>
  )
} 
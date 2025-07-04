import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TextAlign } from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Highlight } from '@tiptap/extension-highlight'
import { YouTubeEmbed } from './extensions/YouTubeEmbed'
import { ProductBlock } from './extensions/ProductBlock'
import { AutoSaveManager } from './AutoSaveManager'
import { JSONContent } from '@tiptap/react'
import { useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube,
  Package,
  Table as TableIcon,
  Undo,
  Redo,
  Quote,
  Code,
  Separator,
  Palette,
  Eye,
  Save,
  Upload
} from 'lucide-react'

interface EnhancedTiptapEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent) => void
  onSave?: () => void
  onLoad?: () => void
  isLoading?: boolean
  page: string
  placeholder?: string
  readOnly?: boolean
  autoSave?: {
    enabled?: boolean
    interval?: number
    onAutoSave?: (content: any) => Promise<boolean>
  }
}

// 색상 팔레트
const colors = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#A61E4D', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79'
]

export const EnhancedTiptapEditor = ({
  content,
  onChange,
  onSave,
  onLoad,
  isLoading = false,
  page,
  placeholder = '여기에 내용을 작성하세요...',
  readOnly = false,
  autoSave = { enabled: true, interval: 30000 },
}: EnhancedTiptapEditorProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

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
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
      YouTubeEmbed,
      ProductBlock,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange?.(json)
    },
  })

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  // 이미지 업로드 핸들러
  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const url = e.target?.result as string
          editor.chain().focus().setImage({ src: url }).run()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  // 링크 추가 핸들러
  const handleAddLink = () => {
    if (linkUrl) {
      if (linkText) {
        editor.chain().focus().insertContent({
          type: 'text',
          text: linkText,
          marks: [{ type: 'link', attrs: { href: linkUrl } }]
        }).run()
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run()
      }
      setLinkUrl('')
      setLinkText('')
      setShowLinkDialog(false)
    }
  }

  // 테이블 추가 핸들러
  const handleAddTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  // YouTube 비디오 추가 핸들러
  const handleAddYouTube = () => {
    const url = prompt('YouTube URL을 입력하세요:')
    if (url) {
      editor.chain().focus().setYouTubeEmbed({ url }).run()
    }
  }

  // 제품 블록 추가 핸들러
  const handleAddProduct = () => {
    const name = prompt('제품명을 입력하세요:')
    const description = prompt('제품 설명을 입력하세요:')
    const imageUrl = prompt('이미지 URL을 입력하세요:')
    const price = prompt('가격을 입력하세요:')

    if (name && description && imageUrl && price) {
      editor.chain().focus().setProductBlock({
        name,
        description,
        imageUrl,
        price: parseInt(price),
      }).run()
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* 자동 저장 매니저 */}
      {!readOnly && autoSave?.enabled && (
        <AutoSaveManager
          editor={editor}
          contentId={page}
          autoSaveInterval={autoSave.interval}
          onSave={autoSave.onAutoSave}
          enabled={autoSave.enabled}
        />
      )}

      {/* 툴바 */}
      <div className="border-b p-2 bg-gray-50">
        <div className="flex flex-wrap items-center gap-1">
          {/* 실행취소/다시실행 */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="실행 취소"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="다시 실행"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 텍스트 포맷팅 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('bold') ? 'bg-gray-200' : ''
              }`}
              title="굵게"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('italic') ? 'bg-gray-200' : ''
              }`}
              title="기울임"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('strike') ? 'bg-gray-200' : ''
              }`}
              title="취소선"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('code') ? 'bg-gray-200' : ''
              }`}
              title="코드"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 제목 스타일 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-2 rounded hover:bg-gray-200 text-sm font-medium ${
                editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
              }`}
              title="제목 1"
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded hover:bg-gray-200 text-sm font-medium ${
                editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
              }`}
              title="제목 2"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-2 rounded hover:bg-gray-200 text-sm font-medium ${
                editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''
              }`}
              title="제목 3"
            >
              H3
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 정렬 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''
              }`}
              title="왼쪽 정렬"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''
              }`}
              title="가운데 정렬"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''
              }`}
              title="오른쪽 정렬"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''
              }`}
              title="양쪽 정렬"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 목록 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('bulletList') ? 'bg-gray-200' : ''
              }`}
              title="글머리 기호 목록"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('orderedList') ? 'bg-gray-200' : ''
              }`}
              title="번호 매기기 목록"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('blockquote') ? 'bg-gray-200' : ''
              }`}
              title="인용문"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 색상 */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded hover:bg-gray-200"
              title="텍스트 색상"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPicker && (
              <div className="absolute top-10 left-0 z-10 bg-white border rounded-lg shadow-lg p-2">
                <div className="grid grid-cols-10 gap-1 mb-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run()
                        setShowColorPicker(false)
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    editor.chain().focus().unsetColor().run()
                    setShowColorPicker(false)
                  }}
                  className="w-full px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  기본 색상
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 미디어 및 콘텐츠 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleImageUpload}
              className="p-2 rounded hover:bg-gray-200"
              title="이미지 추가"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLinkDialog(true)}
              className="p-2 rounded hover:bg-gray-200"
              title="링크 추가"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleAddTable}
              className="p-2 rounded hover:bg-gray-200"
              title="테이블 추가"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleAddYouTube}
              className="p-2 rounded hover:bg-gray-200"
              title="YouTube 동영상 추가"
            >
              <Youtube className="w-4 h-4" />
            </button>
            <button
              onClick={handleAddProduct}
              className="p-2 rounded hover:bg-gray-200"
              title="제품 블록 추가"
            >
              <Package className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1" />

          {/* 저장 버튼 */}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </div>

      {/* 에디터 콘텐츠 */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="p-6 min-h-[400px] prose prose-sm max-w-none focus:outline-none"
        />
        {editor.isEmpty && (
          <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* 링크 다이얼로그 */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4">링크 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 텍스트 (선택사항)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="링크 텍스트"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddLink}
                disabled={!linkUrl}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가
              </button>
              <button
                onClick={() => {
                  setShowLinkDialog(false)
                  setLinkUrl('')
                  setLinkText('')
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상태 표시 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-gray-600">처리 중...</div>
        </div>
      )}
    </div>
  )
}
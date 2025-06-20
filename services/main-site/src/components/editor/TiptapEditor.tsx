import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { YouTubeEmbed } from './extensions/YouTubeEmbed'
import { ProductBlock } from './extensions/ProductBlock'
import { EditorToolbar } from './EditorToolbar'
import { JSONContent } from '@tiptap/react'
import { useEffect } from 'react'

interface TiptapEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent) => void
  onSave?: () => void
  onLoad?: () => void
  isLoading?: boolean
  page: string
}

export const TiptapEditor = ({
  content,
  onChange,
  onSave,
  onLoad,
  isLoading = false,
  page,
}: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      YouTubeEmbed,
      ProductBlock,
    ],
    content,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const html = editor.getHTML()
      console.log('JSON:', json)
      console.log('HTML:', html)
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <EditorToolbar editor={editor} page={page} />
      <EditorContent editor={editor} className="p-4 min-h-[200px]" />
      <div className="border-t p-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '저장 중...' : '저장하기'}
        </button>
        <button
          onClick={onLoad}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          {isLoading ? '불러오는 중...' : '불러오기'}
        </button>
      </div>
    </div>
  )
} 
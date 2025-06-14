import { JSONContent } from '@tiptap/react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { YouTubeEmbed } from './extensions/YouTubeEmbed'
import { ProductBlock } from './extensions/ProductBlock'

interface EditorRendererProps {
  content: JSONContent
}

export const EditorRenderer = ({ content }: EditorRendererProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      YouTubeEmbed,
      ProductBlock,
    ],
    content,
    editable: false,
  })

  if (!editor) {
    return null
  }

  return (
    <div className="prose max-w-none">
      <EditorContent editor={editor} />
    </div>
  )
} 
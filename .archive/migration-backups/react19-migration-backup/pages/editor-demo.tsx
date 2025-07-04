import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { useState } from 'react'
import { JSONContent } from '@tiptap/react'

const initialContent: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Tiptap 에디터 데모' }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '이 페이지는 Tiptap 에디터의 다양한 기능을 테스트할 수 있는 데모 페이지입니다.' }]
    }
  ]
}

export default function EditorDemo() {
  const [content, setContent] = useState<JSONContent>(initialContent)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Tiptap 에디터 데모</h1>
      <TiptapEditor content={content} onChange={setContent} page="demo" />
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">현재 콘텐츠:</h2>
        <div className="p-4 bg-gray-50 rounded-lg">
          <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
} 
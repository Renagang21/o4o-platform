import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { useState } from 'react'

const initialContent = `
  <h1>Tiptap 에디터 데모</h1>
  <p>이 페이지는 Tiptap 에디터의 다양한 기능을 테스트할 수 있는 데모 페이지입니다.</p>
  <p>다음과 같은 기능들을 사용해볼 수 있습니다:</p>
  <ul>
    <li>기본 텍스트 서식 (굵게, 기울임)</li>
    <li>YouTube 동영상 삽입</li>
    <li>제품 정보 블록 삽입</li>
  </ul>
`

export default function EditorDemo() {
  const [content, setContent] = useState(initialContent)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Tiptap 에디터 데모</h1>
      <TiptapEditor content={content} onChange={setContent} />
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">현재 콘텐츠:</h2>
        <div className="p-4 bg-gray-50 rounded-lg">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  )
} 
import { TiptapEditor } from '@shared/components/editor/TiptapEditor'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { JSONContent } from '@tiptap/react'
import toast from 'react-hot-toast'
import { useVersionStore } from '@shared/lib/editor/versions'

// localStorage key for content storage
const CONTENT_STORAGE_KEY = 'o4o-editor-content'

export default function EditorPage() {
  const { page } = useParams<{ page: string }>()
  const [content, setContent] = useState<JSONContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addVersion } = useVersionStore()

  useEffect(() => {
    if (page) {
      loadContent()
    }
  }, [page])

  const loadContent = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Load from localStorage instead of API
      const stored = localStorage.getItem(`${CONTENT_STORAGE_KEY}-${page}`)
      if (stored) {
        const data = JSON.parse(stored)
        setContent(data)
      } else {
        // Default content if nothing stored
        setContent({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Welcome to ${page} editor. Start writing...`
                }
              ]
            }
          ]
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      toast.error('콘텐츠를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!content || !page) return

    try {
      setIsLoading(true)
      
      // Save to localStorage instead of API
      localStorage.setItem(`${CONTENT_STORAGE_KEY}-${page}`, JSON.stringify(content))

      // 저장 성공 시 자동으로 버전 추가
      addVersion(page as string, content)
      toast.success('저장되었습니다.')
    } catch (err) {
      toast.error('저장에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <TiptapEditor
        content={content || undefined}
        onChange={setContent}
        onSave={handleSave}
        isLoading={isLoading}
        page={page as string}
      />
    </div>
  )
}
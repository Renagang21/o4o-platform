import { Editor } from '@tiptap/react'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface AIAssistantProps {
  editor: Editor
}

type AssistType = 'summarize' | 'rewrite' | 'suggest' | 'spellcheck'

export const AIAssistant = ({ editor }: AIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAIAssist = async (type: AssistType) => {
    try {
      setIsLoading(true)

      // 선택된 텍스트가 있으면 해당 텍스트만, 없으면 전체 콘텐츠 사용
      const content = editor.state.selection.content().size > 0
        ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)
        : editor.getText()

      if (!content) {
        toast.error('처리할 내용이 없습니다.')
        return
      }

      // 임시 AI 응답 (실제 API 대신)
      const response = {
        ok: true,
        json: () => Promise.resolve({
          result: `[AI 개선됨] ${content}`
        })
      }

      if (!response.ok) {
        throw new Error('AI 도우미 요청 실패')
      }

      const { result } = await response.json()

      // 선택된 텍스트가 있으면 해당 부분만 교체, 없으면 커서 위치에 삽입
      if (editor.state.selection.content().size > 0) {
        editor.chain().focus().deleteSelection().insertContent(result).run()
      } else {
        editor.chain().focus().insertContent(result).run()
      }

      toast.success('AI 도우미가 내용을 개선했습니다.')
    } catch (error) {
      console.error('AI 도우미 오류:', error)
      toast.error('AI 도우미 요청에 실패했습니다.')
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        <span>AI 도우미</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border p-2 z-50">
          <button
            onClick={() => handleAIAssist('summarize')}
            disabled={isLoading}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            요약하기
          </button>
          <button
            onClick={() => handleAIAssist('rewrite')}
            disabled={isLoading}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            다시 작성하기
          </button>
          <button
            onClick={() => handleAIAssist('suggest')}
            disabled={isLoading}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            문장 추천
          </button>
          <button
            onClick={() => handleAIAssist('spellcheck')}
            disabled={isLoading}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            맞춤법 검사
          </button>
        </div>
      )}
    </div>
  )
} 
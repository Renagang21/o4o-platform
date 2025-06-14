import { Editor } from '@tiptap/react'
import { useState } from 'react'
import { useVersionStore } from '@/lib/editor/versions'
import toast from 'react-hot-toast'

interface EditorVersionManagerProps {
  editor: Editor
  page: string
}

export const EditorVersionManager = ({ editor, page }: EditorVersionManagerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [comment, setComment] = useState('')
  const { versions, addVersion, removeVersion, getVersions } = useVersionStore()

  const handleSaveVersion = () => {
    const content = editor.getJSON()
    addVersion(page, content, comment)
    setComment('')
    toast.success('버전이 저장되었습니다.')
  }

  const handleRestoreVersion = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId)
    if (version) {
      editor.commands.setContent(version.content)
      toast.success('버전이 복원되었습니다.')
    }
  }

  const handleDeleteVersion = (versionId: string) => {
    if (window.confirm('이 버전을 삭제하시겠습니까?')) {
      removeVersion(page, versionId)
      toast.success('버전이 삭제되었습니다.')
    }
  }

  const pageVersions = getVersions(page)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <span>버전 관리</span>
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border p-4 z-50">
          <div className="mb-4">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="버전 설명 (선택사항)"
              className="w-full px-3 py-2 border rounded"
            />
            <button
              onClick={handleSaveVersion}
              className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              현재 내용을 새 버전으로 저장
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {pageVersions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">저장된 버전이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {pageVersions.map((version) => (
                  <li key={version.id} className="border-b pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(version.savedAt).toLocaleString()}
                        </p>
                        {version.comment && (
                          <p className="text-sm text-gray-600">{version.comment}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestoreVersion(version.id)}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          복원
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(version.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 
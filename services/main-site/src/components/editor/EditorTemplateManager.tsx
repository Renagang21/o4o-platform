import { Editor } from '@tiptap/react'
import { useState } from 'react'
import { useTemplateStore, Template } from '@/lib/editor/templates'
import { toast } from 'react-hot-toast'

interface EditorTemplateManagerProps {
  editor: Editor
}

export const EditorTemplateManager = ({ editor }: EditorTemplateManagerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { templates, addTemplate, removeTemplate } = useTemplateStore()

  const handleSaveTemplate = async () => {
    try {
      setIsSaving(true)
      const name = window.prompt('템플릿 이름을 입력하세요:')
      if (!name) return

      const content = editor.getJSON()
      addTemplate(name, content)
      toast.success('템플릿이 저장되었습니다.')
    } catch (error) {
      console.error('템플릿 저장 오류:', error)
      toast.error(error instanceof Error ? error.message : '템플릿 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInsertTemplate = (template: Template) => {
    try {
      editor.chain().focus().insertContent(template.content).run()
      setIsOpen(false)
      toast.success('템플릿이 삽입되었습니다.')
    } catch (error) {
      console.error('템플릿 삽입 오류:', error)
      toast.error('템플릿 삽입에 실패했습니다.')
    }
  }

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('이 템플릿을 삭제하시겠습니까?')) {
      try {
        removeTemplate(id)
        toast.success('템플릿이 삭제되었습니다.')
      } catch (error) {
        console.error('템플릿 삭제 오류:', error)
        toast.error('템플릿 삭제에 실패했습니다.')
      }
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSaving}
        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {isSaving ? '저장 중...' : '템플릿'}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border rounded shadow-lg z-50">
          <div className="p-2">
            <button
              onClick={handleSaveTemplate}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded mb-2"
            >
              현재 내용을 템플릿으로 저장
            </button>

            <div className="border-t pt-2">
              <h3 className="text-sm font-semibold mb-2">저장된 템플릿</h3>
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 px-3 py-2">
                  저장된 템플릿이 없습니다.
                </p>
              ) : (
                <div className="space-y-1">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded"
                    >
                      <button
                        onClick={() => handleInsertTemplate(template)}
                        className="flex-1 text-left"
                      >
                        {template.name}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
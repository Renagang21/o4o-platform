import { JSONContent } from '@tiptap/react'

/**
 * 에디터 콘텐츠 저장 요청 타입
 */
export interface SaveEditorContentRequest {
  page: string
  content: JSONContent
}

/**
 * 에디터 콘텐츠 저장 응답 타입
 */
export interface SaveEditorContentResponse {
  success: boolean
  message: string
}

/**
 * 에디터 콘텐츠 불러오기 응답 타입
 */
export interface LoadEditorContentResponse {
  content: JSONContent
}

/**
 * 에디터 콘텐츠 저장
 */
export const saveEditorContent = async (
  request: SaveEditorContentRequest
): Promise<SaveEditorContentResponse> => {
  try {
    const response = await fetch('/api/editor-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('저장에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('에디터 콘텐츠 저장 중 오류:', error)
    throw error
  }
}

/**
 * 에디터 콘텐츠 불러오기
 */
export const loadEditorContent = async (
  page: string
): Promise<LoadEditorContentResponse> => {
  try {
    const response = await fetch(`/api/editor-content?page=${encodeURIComponent(page)}`)

    if (!response.ok) {
      throw new Error('불러오기에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('에디터 콘텐츠 불러오기 중 오류:', error)
    throw error
  }
} 
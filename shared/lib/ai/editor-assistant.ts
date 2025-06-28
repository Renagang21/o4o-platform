import { JSONContent } from '@tiptap/react'

/**
 * AI 도우미 기능 타입
 */
export type AIAssistantType = 'summarize' | 'rewrite' | 'suggest' | 'spellcheck'

/**
 * AI 도우미 요청 타입
 */
export interface AIAssistantRequest {
  type: AIAssistantType
  content: string
}

/**
 * AI 도우미 응답 타입
 */
export interface AIAssistantResponse {
  success: boolean
  result: string
  message?: string
}

/**
 * JSON 콘텐츠를 텍스트로 변환
 */
export const convertContentToText = (content: JSONContent): string => {
  if (!content.content) return ''

  const text = content.content
    .map(node => {
      if (node.type === 'text') return node.text
      if (node.content) return convertContentToText(node)
      return ''
    })
    .join(' ')

  return text.trim()
}

/**
 * AI 도우미 API 호출
 */
export const callAIAssistant = async (
  request: AIAssistantRequest
): Promise<AIAssistantResponse> => {
  try {
    const response = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('AI 도우미 요청에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('AI 도우미 호출 중 오류:', error)
    throw error
  }
}

/**
 * AI 도우미 기능 설명
 */
export const AIAssistantDescriptions: Record<AIAssistantType, string> = {
  summarize: '현재 콘텐츠를 요약합니다.',
  rewrite: '선택한 문장의 말투를 수정합니다.',
  suggest: '문장 작성을 도와드립니다.',
  spellcheck: '맞춤법을 검사하고 수정합니다.',
} 
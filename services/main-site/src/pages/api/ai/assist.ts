import type { NextApiRequest, NextApiResponse } from 'next'

type AIRequestType = 'summarize' | 'rewrite' | 'suggest' | 'spellcheck'

interface AIRequest {
  type: AIRequestType
  content: string
}

// 임시 AI 응답 함수 (실제 AI 서비스 연동 전까지 사용)
const mockAIResponse = (type: AIRequestType, content: string): string => {
  switch (type) {
    case 'summarize':
      return `요약: ${content.slice(0, 100)}...`
    case 'rewrite':
      return `다듬어진 문장: ${content}`
    case 'suggest':
      return `추천 문장: ${content}`
    case 'spellcheck':
      return `맞춤법 검사 결과: ${content}`
    default:
      return content
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { type, content } = req.body as AIRequest

    if (!type || !content) {
      return res.status(400).json({ message: 'Type and content are required' })
    }

    // TODO: 실제 AI 서비스 연동
    const response = mockAIResponse(type, content)

    return res.status(200).json({ response })
  } catch (error) {
    console.error('AI 도우미 오류:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
} 
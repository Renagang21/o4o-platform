import type { NextApiRequest, NextApiResponse } from 'next'
import { JSONContent } from '@tiptap/react'

// 임시 저장소 (실제 DB 연동 전까지 사용)
const contentStore: Record<string, JSONContent> = {}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { page = 'home' } = req.query

  if (req.method === 'GET') {
    try {
      const content = contentStore[page as string] || null
      return res.status(200).json(content)
    } catch (error) {
      console.error('콘텐츠 불러오기 오류:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { content } = req.body
      contentStore[page as string] = content
      console.log('저장된 콘텐츠:', { page, content })
      return res.status(200).json({ message: 'Content saved successfully' })
    } catch (error) {
      console.error('콘텐츠 저장 오류:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
} 
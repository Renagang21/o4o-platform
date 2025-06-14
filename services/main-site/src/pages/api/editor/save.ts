import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { page, content } = req.body

    if (!page || !content) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // 페이지 콘텐츠 저장 또는 업데이트
    const savedContent = await prisma.pageContent.upsert({
      where: {
        page,
      },
      update: {
        content,
        updatedAt: new Date(),
      },
      create: {
        page,
        content,
      },
    })

    return res.status(200).json(savedContent)
  } catch (error) {
    console.error('저장 중 오류 발생:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
} 
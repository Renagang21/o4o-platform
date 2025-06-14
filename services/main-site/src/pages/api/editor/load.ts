import type { NextApiRequest, NextApiResponse } from 'next'

// 임시 저장소 (save.ts와 공유)
declare global {
  var savedContent: any
}

// 샘플 콘텐츠 (저장된 콘텐츠가 없을 때 사용)
const sampleContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: '샘플 콘텐츠' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '이것은 저장된 샘플 콘텐츠입니다. 다양한 블록이 포함되어 있습니다.',
        },
      ],
    },
    {
      type: 'youtubeEmbed',
      attrs: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    },
    {
      type: 'productBlock',
      attrs: {
        name: '샘플 제품',
        description: '이것은 샘플 제품 설명입니다.',
        imageUrl: 'https://via.placeholder.com/150',
        price: 29900,
      },
    },
  ],
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // 저장된 콘텐츠가 있으면 반환, 없으면 샘플 콘텐츠 반환
    const content = global.savedContent || sampleContent
    return res.status(200).json(content)
  } catch (error) {
    console.error('불러오기 중 오류 발생:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
} 
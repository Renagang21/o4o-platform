/**
 * AI Blocks API Routes
 * AI 페이지 생성을 위한 블록 정보 제공 (SSOT)
 */

import { Router, Request, Response } from 'express';
import { blockRegistry } from '../services/block-registry.service';
import logger from '../utils/logger';

const router: Router = Router();

/**
 * AI를 위한 블록 참조 데이터 (SSOT)
 * GET /api/ai/blocks/reference
 */
router.get('/reference', async (req: Request, res: Response) => {
  try {
    const reference = blockRegistry.getAIReference();

    // 응답 헤더 설정 (캐싱)
    res.set({
      'Cache-Control': 'public, max-age=300', // 5분 캐싱
      'ETag': `"${Buffer.from(reference.lastUpdated).toString('base64')}"`
    });

    res.json({
      success: true,
      data: reference,
      meta: {
        version: '1.0.0',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('AI block reference error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch block reference',
      message: error.message
    });
  }
});

/**
 * AI용 간소화된 블록 목록
 * GET /api/ai/blocks/simple
 */
router.get('/simple', async (req: Request, res: Response) => {
  try {
    const { category, limit } = req.query;
    let blocks = blockRegistry.getAll();

    // 카테고리 필터
    if (category) {
      blocks = blockRegistry.getByCategory(category as string);
    }

    // 개수 제한
    if (limit) {
      const limitNum = parseInt(limit as string);
      blocks = blocks.slice(0, limitNum);
    }

    // AI용 간소화된 형태로 변환
    const simpleBlocks = blocks.map(block => ({
      name: block.name,
      title: block.title,
      description: block.description,
      category: block.category,
      exampleJson: block.example.json,
      commonUse: block.aiPrompts?.[0] || block.description
    }));

    res.json({
      success: true,
      data: {
        blocks: simpleBlocks,
        total: simpleBlocks.length,
        filtered: !!category || !!limit
      }
    });

  } catch (error: any) {
    logger.error('AI simple blocks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simple blocks',
      message: error.message
    });
  }
});

/**
 * 블록 검색
 * GET /api/ai/blocks/search?q=query
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const results = blockRegistry.search(query);

    res.json({
      success: true,
      data: {
        query,
        results: results.map(block => ({
          name: block.name,
          title: block.title,
          description: block.description,
          category: block.category,
          example: block.example,
          relevantPrompts: block.aiPrompts || []
        })),
        total: results.length
      }
    });

  } catch (error: any) {
    logger.error('Block search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search blocks',
      message: error.message
    });
  }
});

/**
 * 블록 상세 정보
 * GET /api/ai/blocks/:name
 */
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const block = blockRegistry.get(name);

    if (!block) {
      return res.status(404).json({
        success: false,
        error: 'Block not found',
        message: `Block "${name}" does not exist`
      });
    }

    res.json({
      success: true,
      data: {
        ...block,
        attributeCount: Object.keys(block.attributes).length
      }
    });

  } catch (error: any) {
    logger.error('Block detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch block details',
      message: error.message
    });
  }
});

/**
 * Registry 통계
 * GET /api/ai/blocks/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = blockRegistry.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    logger.error('Block stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch block statistics',
      message: error.message
    });
  }
});

export default router;

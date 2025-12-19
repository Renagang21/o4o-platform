/**
 * AI Blocks API Routes
 * AI 페이지 생성을 위한 블록 정보 제공 (SSOT)
 * 인증 필수 - 읽기 권한 보유자만 접근 가능
 */

import { Router, Request, Response } from 'express';
import { blockRegistry } from '../services/block-registry.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// AI 엔드포인트용 레이트리밋 (읽기 전용이므로 관대한 한도)
const aiReadRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1분
  max: 60, // 분당 60회
  message: 'AI 참조 데이터 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.userId || req.ip || 'anonymous';
  }
});

/**
 * AI를 위한 블록 참조 데이터 (SSOT)
 * GET /api/ai/blocks/reference
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/reference', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const startTime = Date.now();

  try {
    const reference = await blockRegistry.getAIReference(); // V2: Now async
    const etag = `"${Buffer.from(reference.lastUpdated).toString('base64')}"`;

    // ETag 검증 (304 Not Modified)
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === etag) {
      const duration = Date.now() - startTime;

      // Operational logging
      logger.info('AI blocks reference - 304 Not Modified', {
        userId: authReq.user?.userId,
        userEmail: authReq.user?.email,
        route: '/api/ai/blocks/reference',
        method: 'GET',
        status: 304,
        etag: etag,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return res.status(304).set({
        'Cache-Control': 'public, max-age=300',
        'ETag': etag
      }).end();
    }

    // 응답 헤더 설정 (캐싱)
    res.set({
      'Cache-Control': 'public, max-age=300', // 5분 캐싱
      'ETag': etag
    });

    const duration = Date.now() - startTime;

    // Operational logging
    logger.info('AI blocks reference - Success', {
      userId: authReq.user?.userId,
      userEmail: authReq.user?.email,
      route: '/api/ai/blocks/reference',
      method: 'GET',
      status: 200,
      etag: etag,
      schemaVersion: reference.schemaVersion,
      format: reference.format || 'structured', // V2: Log format
      totalBlocks: reference.total,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: reference,
      meta: {
        version: '2.0.0', // V2: Database-driven
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('AI block reference error', {
      userId: authReq.user?.userId,
      userEmail: authReq.user?.email,
      route: '/api/ai/blocks/reference',
      method: 'GET',
      status: 500,
      error: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

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
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/simple', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
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
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/search', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
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
 * Registry 통계
 * GET /api/ai/blocks/stats
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/stats', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
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

/**
 * 블록 상세 정보
 * GET /api/ai/blocks/:name
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/:name', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
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

export default router;

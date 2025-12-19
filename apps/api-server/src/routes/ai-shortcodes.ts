/**
 * AI Shortcodes API Routes
 * AI 페이지 생성을 위한 shortcode 정보 제공
 * 인증 필수 - 읽기 권한 보유자만 접근 가능
 */

import { Router, Request, Response } from 'express';
import { shortcodeRegistry } from '../services/shortcode-registry.service.js';
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
 * AI를 위한 shortcode 참조 데이터
 * GET /api/ai/shortcodes/reference
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/reference', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const startTime = Date.now();

  try {
    const reference = await shortcodeRegistry.getAIReference(); // V2: Now async
    const etag = `"${Buffer.from(reference.lastUpdated).toString('base64')}"`;

    // ETag 검증 (304 Not Modified)
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === etag) {
      const duration = Date.now() - startTime;

      // Operational logging
      logger.info('AI shortcodes reference - 304 Not Modified', {
        userId: authReq.user?.userId,
        userEmail: authReq.user?.email,
        route: '/api/ai/shortcodes/reference',
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
    logger.info('AI shortcodes reference - Success', {
      userId: authReq.user?.userId,
      userEmail: authReq.user?.email,
      route: '/api/ai/shortcodes/reference',
      method: 'GET',
      status: 200,
      etag: etag,
      schemaVersion: reference.schemaVersion,
      format: reference.format || 'structured', // V2: Log format
      totalShortcodes: reference.total,
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

    logger.error('AI shortcode reference error', {
      userId: authReq.user?.userId,
      userEmail: authReq.user?.email,
      route: '/api/ai/shortcodes/reference',
      method: 'GET',
      status: 500,
      error: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch shortcode reference',
      message: error.message
    });
  }
});

/**
 * AI용 간소화된 shortcode 목록
 * GET /api/ai/shortcodes/simple
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/simple', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
  try {
    const { category, limit } = req.query;
    let shortcodes = shortcodeRegistry.getAll();

    // 카테고리 필터
    if (category) {
      shortcodes = shortcodeRegistry.getByCategory(category as string);
    }

    // 개수 제한
    if (limit) {
      const limitNum = parseInt(limit as string);
      shortcodes = shortcodes.slice(0, limitNum);
    }

    // AI용 간소화된 형태로 변환
    const simpleShortcodes = shortcodes.map(sc => ({
      name: sc.name,
      description: sc.description,
      usage: `[${sc.name}]`,
      category: sc.category,
      mainExample: sc.examples[0] || `[${sc.name}]`,
      commonUse: sc.aiPrompts?.[0] || sc.description
    }));

    res.json({
      success: true,
      data: {
        shortcodes: simpleShortcodes,
        total: simpleShortcodes.length,
        filtered: !!category || !!limit
      }
    });

  } catch (error: any) {
    logger.error('AI simple shortcodes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simple shortcodes',
      message: error.message
    });
  }
});

/**
 * AI 프롬프트 생성 도우미
 * POST /api/ai/shortcodes/prompt
 * 인증 필수 + 레이트리밋 적용
 */
router.post('/prompt', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
  try {
    const { userRequest, includeCategories, maxShortcodes = 20 } = req.body;

    if (!userRequest) {
      return res.status(400).json({
        success: false,
        error: 'User request is required'
      });
    }

    let shortcodes = shortcodeRegistry.getAll();

    // 카테고리 필터링
    if (includeCategories && Array.isArray(includeCategories)) {
      shortcodes = shortcodes.filter(sc => 
        includeCategories.includes(sc.category)
      );
    }

    // 개수 제한
    shortcodes = shortcodes.slice(0, maxShortcodes);

    // AI 프롬프트 생성
    const shortcodeList = shortcodes.map(sc => {
      const params = Object.keys(sc.parameters).length > 0 
        ? ` (parameters: ${Object.keys(sc.parameters).join(', ')})`
        : '';
      
      return `- [${sc.name}]${params}: ${sc.description}
  Example: ${sc.examples[0] || `[${sc.name}]`}
  Use when: ${sc.aiPrompts?.[0] || sc.description}`;
    }).join('\n\n');

    const fullPrompt = `Available Shortcodes (${shortcodes.length} total):

${shortcodeList}

User Request: "${userRequest}"

Instructions:
1. Analyze the user request and determine which shortcodes would be most appropriate
2. Generate a complete page layout using HTML structure and appropriate shortcodes
3. Use shortcode parameters when needed to customize the output
4. Consider the user's intent and create a cohesive page design
5. Only use shortcodes from the list above

Please generate a page that fulfills the user's request using the available shortcodes.`;

    res.json({
      success: true,
      data: {
        prompt: fullPrompt,
        availableShortcodes: shortcodes.length,
        categories: [...new Set(shortcodes.map(sc => sc.category))],
        userRequest
      }
    });

  } catch (error: any) {
    logger.error('AI prompt generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI prompt',
      message: error.message
    });
  }
});

/**
 * Shortcode 검색
 * GET /api/ai/shortcodes/search?q=query
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

    const results = shortcodeRegistry.search(query);
    
    res.json({
      success: true,
      data: {
        query,
        results: results.map(sc => ({
          name: sc.name,
          description: sc.description,
          category: sc.category,
          usage: `[${sc.name}]`,
          examples: sc.examples,
          relevantPrompts: sc.aiPrompts || []
        })),
        total: results.length
      }
    });

  } catch (error: any) {
    logger.error('Shortcode search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search shortcodes',
      message: error.message
    });
  }
});

/**
 * Registry 통계
 * GET /api/ai/shortcodes/stats
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/stats', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
  try {
    const stats = shortcodeRegistry.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    logger.error('Shortcode stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shortcode statistics',
      message: error.message
    });
  }
});

/**
 * Shortcode 상세 정보
 * GET /api/ai/shortcodes/:name
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/:name', authenticate, aiReadRateLimit, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const shortcode = shortcodeRegistry.get(name);

    if (!shortcode) {
      return res.status(404).json({
        success: false,
        error: 'Shortcode not found',
        message: `Shortcode [${name}] does not exist`
      });
    }

    res.json({
      success: true,
      data: {
        ...shortcode,
        usage: `[${shortcode.name}]`,
        parameterCount: Object.keys(shortcode.parameters).length,
        exampleCount: shortcode.examples.length
      }
    });

  } catch (error: any) {
    logger.error('Shortcode detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shortcode details',
      message: error.message
    });
  }
});

export default router;
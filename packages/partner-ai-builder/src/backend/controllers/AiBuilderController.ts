/**
 * AI Builder Controller
 *
 * AI 루틴/콘텐츠 생성 API 엔드포인트
 *
 * @package @o4o/partner-ai-builder
 */

import { Router, Request, Response } from 'express';
import type { Router as IRouter } from 'express';
import { AiRoutineBuilderService } from '../services/AiRoutineBuilderService.js';
import { AiRecommendationService } from '../services/AiRecommendationService.js';
import { AiContentService } from '../services/AiContentService.js';
import type { AllowedIndustry } from '../services/AiRoutineBuilderService.js';

const router: IRouter = Router();

// Service instances
const routineService = new AiRoutineBuilderService();
const recommendationService = new AiRecommendationService();
const contentService = new AiContentService();

// ========================================
// Routine Generation Endpoints
// ========================================

/**
 * POST /ai-builder/routine/generate
 * AI 루틴 생성
 */
router.post('/routine/generate', async (req: Request, res: Response) => {
  try {
    const { industry, baseProducts, routineGoal, targetAudience, difficulty, preferredStepCount } = req.body;

    // Validation
    if (!industry || !routineGoal) {
      return res.status(400).json({
        success: false,
        error: 'industry와 routineGoal은 필수입니다.',
      });
    }

    // PHARMACEUTICAL 차단 (API 레벨)
    if (industry === 'PHARMACEUTICAL') {
      return res.status(403).json({
        success: false,
        error: 'PHARMACEUTICAL 산업군은 AI 루틴 생성이 허용되지 않습니다.',
      });
    }

    const result = await routineService.generateRoutine({
      industry: industry as AllowedIndustry,
      baseProducts: baseProducts || [],
      routineGoal,
      targetAudience,
      difficulty,
      preferredStepCount,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('[AiBuilder] Routine generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '루틴 생성 중 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /ai-builder/routine/improve
 * 기존 루틴 개선 제안
 */
router.post('/routine/improve', async (req: Request, res: Response) => {
  try {
    const { routine, feedback } = req.body;

    if (!routine) {
      return res.status(400).json({
        success: false,
        error: 'routine은 필수입니다.',
      });
    }

    const result = await routineService.suggestImprovements(routine, feedback);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '개선 제안 생성 중 오류가 발생했습니다.',
    });
  }
});

// ========================================
// Recommendation Endpoints
// ========================================

/**
 * POST /ai-builder/recommend/products
 * AI 제품 추천
 */
router.post('/recommend/products', async (req: Request, res: Response) => {
  try {
    const { industry, category, targetAudience, existingProducts, routineGoal, maxResults } = req.body;

    if (!industry) {
      return res.status(400).json({
        success: false,
        error: 'industry는 필수입니다.',
      });
    }

    // PHARMACEUTICAL 차단
    if (industry === 'PHARMACEUTICAL') {
      return res.status(403).json({
        success: false,
        error: 'PHARMACEUTICAL 산업군은 AI 추천이 허용되지 않습니다.',
      });
    }

    const result = await recommendationService.recommend({
      industry: industry as AllowedIndustry,
      category,
      targetAudience,
      existingProducts,
      routineGoal,
      maxResults,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '제품 추천 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /ai-builder/recommend/trending
 * 트렌딩 제품 조회
 */
router.get('/recommend/trending', async (req: Request, res: Response) => {
  try {
    const industry = req.query.industry as string;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!industry) {
      return res.status(400).json({
        success: false,
        error: 'industry는 필수입니다.',
      });
    }

    if (industry === 'PHARMACEUTICAL') {
      return res.status(403).json({
        success: false,
        error: 'PHARMACEUTICAL 산업군은 조회할 수 없습니다.',
      });
    }

    const trending = await recommendationService.getTrendingProducts(
      industry as AllowedIndustry,
      limit
    );

    res.json({ success: true, data: trending });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '트렌딩 제품 조회 중 오류가 발생했습니다.',
    });
  }
});

// ========================================
// Content Generation Endpoints
// ========================================

/**
 * POST /ai-builder/content/generate
 * AI 콘텐츠 생성
 */
router.post('/content/generate', async (req: Request, res: Response) => {
  try {
    const { contentType, industry, context, maxLength } = req.body;

    if (!contentType || !industry) {
      return res.status(400).json({
        success: false,
        error: 'contentType과 industry는 필수입니다.',
      });
    }

    if (industry === 'PHARMACEUTICAL') {
      return res.status(403).json({
        success: false,
        error: 'PHARMACEUTICAL 산업군은 AI 콘텐츠 생성이 허용되지 않습니다.',
      });
    }

    const result = await contentService.generate({
      contentType,
      industry: industry as AllowedIndustry,
      context: context || {},
      maxLength,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '콘텐츠 생성 중 오류가 발생했습니다.',
    });
  }
});

// ========================================
// Utility Endpoints
// ========================================

/**
 * GET /ai-builder/industries
 * 허용된 산업군 목록 조회
 */
router.get('/industries', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      allowed: ['COSMETICS', 'HEALTH', 'GENERAL'],
      blocked: ['PHARMACEUTICAL'],
      message: 'PHARMACEUTICAL 산업군은 법적 이유로 AI 콘텐츠 생성이 차단됩니다.',
    },
  });
});

/**
 * POST /ai-builder/validate
 * 산업군 및 제품 유효성 검증
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { industry, products } = req.body;

    const validation = routineService.validateIndustry(industry);

    if (!validation.valid) {
      return res.json({
        success: true,
        data: {
          valid: false,
          industryValid: false,
          error: validation.error,
        },
      });
    }

    // 제품 필터링 검증
    const filteredProducts = products
      ? routineService.filterBlockedProducts(products)
      : [];
    const blockedCount = (products?.length || 0) - filteredProducts.length;

    res.json({
      success: true,
      data: {
        valid: true,
        industryValid: true,
        validProductCount: filteredProducts.length,
        blockedProductCount: blockedCount,
        warning:
          blockedCount > 0
            ? `${blockedCount}개의 PHARMACEUTICAL 제품이 필터링되었습니다.`
            : undefined,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '검증 중 오류가 발생했습니다.',
    });
  }
});

export const aiBuilderController = router;
export default router;

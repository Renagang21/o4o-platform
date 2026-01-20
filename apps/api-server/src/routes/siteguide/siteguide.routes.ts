/**
 * SiteGuide Routes
 *
 * @service SiteGuide
 * @domain siteguide.co.kr
 * @audience 외부 사업자 (모든 홈페이지 운영자)
 * @independence Neture 종속 아님 - 독립 서비스
 *
 * WO-SITEGUIDE-CORE-EXECUTION-V1
 * - API Key 기반 사업자 식별
 * - 도메인 검증
 * - 영속적 사용량 추적
 * - Kill Switch 지원
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { SiteGuideService, ValidationResult } from './siteguide.service.js';
import {
  SiteGuideExecutionType,
  SiteGuideExecutionResult,
  SiteGuideBusinessStatus,
  SiteGuideApiKeyStatus,
} from './entities/index.js';
import { googleAI } from '../../services/google-ai.service.js';
import logger from '../../utils/logger.js';

// Gemini API Key (환경변수에서 가져옴)
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

// SiteGuide Admin Key (환경변수에서 가져옴)
// WO-SITEGUIDE-ADMIN-AUTH-GUARD-V1
const SITEGUIDE_ADMIN_KEY = process.env.SITEGUIDE_ADMIN_KEY || '';

/**
 * Admin 인증 미들웨어
 * WO-SITEGUIDE-ADMIN-AUTH-GUARD-V1
 *
 * X-SITEGUIDE-ADMIN-KEY 헤더로 인증
 * 키 값은 절대 로그에 출력하지 않음
 */
function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const adminKey = req.headers['x-siteguide-admin-key'] as string;

  // 환경변수 미설정 시 서비스 불가
  if (!SITEGUIDE_ADMIN_KEY) {
    logger.error('[SiteGuide Admin] SITEGUIDE_ADMIN_KEY not configured');
    res.status(503).json({
      success: false,
      error: 'Admin service not configured',
      errorCode: 'ADMIN_NOT_CONFIGURED',
    });
    return;
  }

  // 키 누락
  if (!adminKey) {
    logger.warn('[SiteGuide Admin] Missing admin key', {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      success: false,
      error: 'Admin authentication required',
      errorCode: 'ADMIN_AUTH_REQUIRED',
    });
    return;
  }

  // 키 불일치 (키 값은 로그에 절대 출력하지 않음)
  if (adminKey !== SITEGUIDE_ADMIN_KEY) {
    logger.warn('[SiteGuide Admin] Invalid admin key', {
      path: req.path,
      ip: req.ip,
    });
    res.status(403).json({
      success: false,
      error: 'Invalid admin key',
      errorCode: 'ADMIN_AUTH_FAILED',
    });
    return;
  }

  // 인증 성공
  next();
}

interface SiteGuideQueryRequest {
  question: string;
  pageContext: {
    url: string;
    title: string;
    description?: string;
    pageType?: string;
    category?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
  sessionId: string;
}

/**
 * 페이지 컨텍스트와 질문을 결합한 전체 프롬프트 구성
 */
function buildSiteGuidePrompt(
  pageContext: SiteGuideQueryRequest['pageContext'],
  question: string
): string {
  const parts: string[] = [
    '당신은 웹사이트 방문자를 돕는 친절한 AI 안내 도우미입니다.',
    '사용자가 현재 보고 있는 페이지의 맥락을 바탕으로 질문에 답변해 주세요.',
    '',
    '## 현재 페이지 정보',
    `- URL: ${pageContext.url}`,
    `- 제목: ${pageContext.title}`,
  ];

  if (pageContext.description) {
    parts.push(`- 설명: ${pageContext.description}`);
  }

  if (pageContext.pageType) {
    parts.push(`- 페이지 유형: ${pageContext.pageType}`);
  }

  if (pageContext.category) {
    parts.push(`- 카테고리: ${pageContext.category}`);
  }

  if (pageContext.tags && pageContext.tags.length > 0) {
    parts.push(`- 태그: ${pageContext.tags.join(', ')}`);
  }

  parts.push(
    '',
    '## 응답 원칙',
    '1. 친절하고 자연스러운 한국어로 답변합니다.',
    '2. 페이지 내용과 관련된 답변을 우선합니다.',
    '3. 확실하지 않은 정보는 "확인이 필요합니다"라고 말합니다.',
    '4. 답변은 간결하게, 핵심만 전달합니다.',
    '5. 사이트와 무관한 질문은 정중히 범위를 안내합니다.',
    '',
    '## 사용자 질문',
    question
  );

  return parts.join('\n');
}

/**
 * Origin 헤더에서 도메인 추출
 */
function extractDomainFromOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return origin;
  }
}

/**
 * SiteGuide 라우터 생성
 */
export function createSiteGuideRoutes(dataSource: DataSource): Router {
  const router: Router = Router();
  const service = new SiteGuideService(dataSource);

  /**
   * POST /api/siteguide/query
   * SiteGuide AI 질의 처리
   */
  router.post('/query', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const apiKey = req.headers['x-siteguide-key'] as string;
    const requestDomain = extractDomainFromOrigin(req.headers.origin as string);

    // 1. API Key 및 Business 검증
    const validation: ValidationResult = await service.validateApiKey(apiKey, requestDomain);

    if (!validation.success || !validation.context) {
      // 검증 실패 로깅 (businessId 없으면 'unknown')
      const errorCode = validation.error?.code || 'UNKNOWN_ERROR';

      // API Key에서 businessId를 추출할 수 없으므로 기본값 사용
      // 실제 운영에서는 별도 로깅 테이블 사용 가능
      logger.warn(`[SiteGuide] Validation failed: ${errorCode}`, {
        domain: requestDomain,
        errorCode,
      });

      const statusCode =
        errorCode === 'SERVICE_DISABLED' ? 503 :
        errorCode === 'LIMIT_EXCEEDED' ? 429 :
        errorCode === 'DOMAIN_NOT_ALLOWED' ? 403 :
        401;

      return res.status(statusCode).json({
        success: false,
        error: validation.error?.message,
        errorCode,
      });
    }

    const { businessId, apiKeyId, remaining } = validation.context;

    try {
      const body = req.body as SiteGuideQueryRequest;

      // 2. 필수 필드 검증
      if (!body.question || !body.pageContext?.url) {
        await service.recordUsage(
          businessId,
          apiKeyId,
          SiteGuideExecutionResult.BLOCKED,
          SiteGuideExecutionType.QUERY,
          requestDomain,
          Date.now() - startTime,
          'INVALID_REQUEST'
        );

        return res.status(400).json({
          success: false,
          error: 'Missing required fields: question, pageContext.url',
          errorCode: 'INVALID_REQUEST',
        });
      }

      // 3. Gemini API Key 확인
      if (!GEMINI_API_KEY) {
        logger.error('[SiteGuide] Gemini API key not configured');

        await service.recordUsage(
          businessId,
          apiKeyId,
          SiteGuideExecutionResult.ERROR,
          SiteGuideExecutionType.QUERY,
          requestDomain,
          Date.now() - startTime,
          'AI_NOT_CONFIGURED'
        );

        return res.status(503).json({
          success: false,
          error: 'AI service not configured',
          errorCode: 'AI_NOT_CONFIGURED',
        });
      }

      // 4. 페이지 컨텍스트 기반 프롬프트 구성
      const fullPrompt = buildSiteGuidePrompt(body.pageContext, body.question);

      // 5. AI 호출
      const response = await googleAI.executeGemini(GEMINI_API_KEY, {
        prompt: fullPrompt,
        maxOutputTokens: 500,
        temperature: 0.7,
      });

      if (!response.data?.text) {
        logger.error('[SiteGuide] AI generation failed: empty response');

        await service.recordUsage(
          businessId,
          apiKeyId,
          SiteGuideExecutionResult.ERROR,
          SiteGuideExecutionType.QUERY,
          requestDomain,
          Date.now() - startTime,
          'AI_ERROR'
        );

        return res.status(500).json({
          success: false,
          error: 'AI service temporarily unavailable',
          errorCode: 'AI_ERROR',
        });
      }

      // 6. 성공 기록
      const responseTimeMs = Date.now() - startTime;
      await service.recordUsage(
        businessId,
        apiKeyId,
        SiteGuideExecutionResult.SUCCESS,
        SiteGuideExecutionType.QUERY,
        requestDomain,
        responseTimeMs
      );

      // 7. 성공 응답
      const newRemaining = await service.getRemainingUsage(businessId);
      return res.json({
        success: true,
        answer: response.data.text,
        remaining: newRemaining,
      });
    } catch (error) {
      logger.error('[SiteGuide] Query error:', error);

      await service.recordUsage(
        businessId,
        apiKeyId,
        SiteGuideExecutionResult.ERROR,
        SiteGuideExecutionType.QUERY,
        requestDomain,
        Date.now() - startTime,
        'SERVER_ERROR'
      );

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorCode: 'SERVER_ERROR',
      });
    }
  });

  /**
   * GET /api/siteguide/health
   * SiteGuide API 상태 확인
   */
  router.get('/health', (_req: Request, res: Response) => {
    const isDisabled = service.isGloballyDisabled();

    return res.json({
      status: isDisabled ? 'disabled' : 'ok',
      service: 'siteguide',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // Admin Endpoints (내부 관리용)
  // WO-SITEGUIDE-ADMIN-AUTH-GUARD-V1: X-SITEGUIDE-ADMIN-KEY 헤더 인증 적용
  // ============================================================================

  /**
   * POST /api/siteguide/admin/kill-switch
   * 전역 Kill Switch 제어
   */
  router.post('/admin/kill-switch', requireAdminAuth, (req: Request, res: Response) => {
    const { enabled } = req.body;

    if (enabled === true) {
      service.enableGlobalKillSwitch();
    } else if (enabled === false) {
      service.disableGlobalKillSwitch();
    }

    return res.json({
      success: true,
      killSwitchEnabled: service.isGloballyDisabled(),
    });
  });

  /**
   * POST /api/siteguide/admin/business
   * Business 생성
   */
  router.post('/admin/business', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { name, allowedDomains, dailyLimit, email, notes } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Business name is required',
        });
      }

      const business = await service.createBusiness({
        name,
        allowedDomains,
        dailyLimit,
        email,
        notes,
      });

      return res.status(201).json({
        success: true,
        data: business,
      });
    } catch (error) {
      logger.error('[SiteGuide] Create business error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create business',
      });
    }
  });

  /**
   * POST /api/siteguide/admin/business/:businessId/api-key
   * API Key 발급
   */
  router.post('/admin/business/:businessId/api-key', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const { label } = req.body;

      const result = await service.createApiKey(businessId, label);

      return res.status(201).json({
        success: true,
        data: {
          id: result.id,
          key: result.key, // 1회만 반환
          message: 'API key created. Save this key - it will not be shown again.',
        },
      });
    } catch (error: any) {
      logger.error('[SiteGuide] Create API key error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create API key',
      });
    }
  });

  /**
   * PATCH /api/siteguide/admin/business/:businessId/status
   * Business 상태 변경
   */
  router.patch('/admin/business/:businessId/status', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const { status } = req.body;

      if (!Object.values(SiteGuideBusinessStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${Object.values(SiteGuideBusinessStatus).join(', ')}`,
        });
      }

      await service.updateBusinessStatus(businessId, status);

      return res.json({
        success: true,
        message: `Business status updated to ${status}`,
      });
    } catch (error) {
      logger.error('[SiteGuide] Update business status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update business status',
      });
    }
  });

  /**
   * PATCH /api/siteguide/admin/api-key/:apiKeyId/status
   * API Key 상태 변경
   */
  router.patch('/admin/api-key/:apiKeyId/status', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { apiKeyId } = req.params;
      const { status } = req.body;

      if (!Object.values(SiteGuideApiKeyStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${Object.values(SiteGuideApiKeyStatus).join(', ')}`,
        });
      }

      await service.updateApiKeyStatus(apiKeyId, status);

      return res.json({
        success: true,
        message: `API key status updated to ${status}`,
      });
    } catch (error) {
      logger.error('[SiteGuide] Update API key status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update API key status',
      });
    }
  });

  /**
   * GET /api/siteguide/admin/businesses
   * Business 목록 조회
   */
  router.get('/admin/businesses', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const businesses = await service.listBusinesses();
      return res.json({
        success: true,
        data: businesses,
      });
    } catch (error) {
      logger.error('[SiteGuide] List businesses error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to list businesses',
      });
    }
  });

  return router;
}

export default createSiteGuideRoutes;

/**
 * SiteGuide Public Routes
 *
 * @service SiteGuide
 * @domain siteguide.co.kr
 * @audience 외부 사업자 (모든 홈페이지 운영자)
 * @independence Neture 종속 아님 - 독립 서비스
 *
 * 이 라우트는 인증 없이 익명으로 사용 가능한 공개 API입니다.
 * SiteGuide 위젯에서 호출되며, API Key 기반으로 사업자를 식별합니다.
 */

import { Router, Request, Response } from 'express';
import { googleAI } from '../services/google-ai.service.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// Gemini API Key (환경변수에서 가져옴)
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

// 일 사용량 제한 (API Key 당)
const DAILY_LIMIT = 100;
const usageMap = new Map<string, { count: number; date: string }>();

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
 * API Key 검증 (간단한 형식 검증)
 * TODO: DB에서 실제 API Key 검증
 */
function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false;
  // 최소 길이 검증 (추후 DB 검증으로 대체)
  return apiKey.length >= 8;
}

/**
 * 사용량 체크 및 증가
 */
function checkAndIncrementUsage(apiKey: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0];
  const usage = usageMap.get(apiKey);

  if (!usage || usage.date !== today) {
    usageMap.set(apiKey, { count: 1, date: today });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  if (usage.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  usage.count++;
  return { allowed: true, remaining: DAILY_LIMIT - usage.count };
}

/**
 * POST /api/siteguide/query
 * SiteGuide AI 질의 처리 (공개 API)
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-siteguide-key'] as string;

    // API Key 검증
    if (!validateApiKey(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing API key',
        errorCode: 'INVALID_API_KEY',
      });
    }

    // 사용량 체크
    const usage = checkAndIncrementUsage(apiKey);
    if (!usage.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Daily usage limit exceeded',
        errorCode: 'LIMIT_EXCEEDED',
      });
    }

    const body = req.body as SiteGuideQueryRequest;

    // 필수 필드 검증
    if (!body.question || !body.pageContext?.url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question, pageContext.url',
        errorCode: 'INVALID_REQUEST',
      });
    }

    // Gemini API Key 확인
    if (!GEMINI_API_KEY) {
      logger.error('[SiteGuide] Gemini API key not configured');
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        errorCode: 'AI_NOT_CONFIGURED',
      });
    }

    // 페이지 컨텍스트 기반 프롬프트 구성
    const fullPrompt = buildSiteGuidePrompt(body.pageContext, body.question);

    // AI 호출 (executeGemini 사용)
    const response = await googleAI.executeGemini(GEMINI_API_KEY, {
      prompt: fullPrompt,
      maxOutputTokens: 500,
      temperature: 0.7,
    });

    if (!response.data?.text) {
      logger.error('[SiteGuide] AI generation failed: empty response');
      return res.status(500).json({
        success: false,
        error: 'AI service temporarily unavailable',
        errorCode: 'AI_ERROR',
      });
    }

    // 성공 응답
    return res.json({
      success: true,
      answer: response.data.text,
      remaining: usage.remaining,
    });
  } catch (error) {
    logger.error('[SiteGuide] Query error:', error);
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
router.get('/health', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'siteguide',
    timestamp: new Date().toISOString(),
  });
});

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

export default router;

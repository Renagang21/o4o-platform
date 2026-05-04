/**
 * AI Proxy Routes
 * WO-O4O-AI-SECURITY-APIKEY-REMEDIATION
 *
 * Server-side proxy endpoints for AI generation:
 * - POST /api/ai/generate — Text generation proxy (wraps aiProxyService.generateContent)
 * - POST /api/ai/vision/analyze — Vision AI proxy (Gemini Vision API)
 * - POST /api/ai/url-to-blocks — URL 콘텐츠 → Block[] 변환 (WO-O4O-AI-BLOCK-GENERATION-V1)
 *
 * All LLM API keys are server-side only. Frontend never touches provider APIs directly.
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiProxyService } from '../services/ai-proxy.service.js';
import { AppDataSource } from '../database/connection.js';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';
import { resolveAiApiKey } from '../utils/ai-key.util.js';
import {
  isSupportedOutputType,
  buildSystemPrompt,
  buildUserPrompt,
  parseResponse,
} from '../services/ai-prompts/index.js';

const router: Router = Router();

// ===========================================
// POST /api/ai/generate — Text Generation Proxy
// ===========================================
router.post('/generate', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK } = req.body;

  if (!provider || !systemPrompt || !userPrompt) {
    return res.status(400).json({
      success: false,
      error: 'provider, systemPrompt, userPrompt are required',
      type: 'VALIDATION_ERROR',
    });
  }

  const requestId = crypto.randomUUID();

  try {
    const response = await aiProxyService.generateContent(
      { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK },
      userId,
      requestId
    );
    return res.json({ ...response, requestId });
  } catch (error: any) {
    const status = error.type === 'RATE_LIMIT_ERROR' ? 429
                 : error.type === 'AUTH_ERROR' ? 401
                 : error.type === 'VALIDATION_ERROR' ? 400
                 : error.type === 'TIMEOUT_ERROR' ? 504
                 : 500;

    logger.error('AI generate error', { requestId, error: error.message, type: error.type });

    return res.status(status).json({
      success: false,
      error: error.message || 'AI 생성 중 오류가 발생했습니다.',
      type: error.type || 'PROVIDER_ERROR',
      retryable: error.retryable || false,
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/vision/analyze — Vision AI Proxy
// ===========================================
router.post('/vision/analyze', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { imageBase64, mimeType = 'image/jpeg', prompt } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'imageBase64 is required' });
  }

  // Limit image size (10MB base64 ≈ 7.5MB raw)
  if (imageBase64.length > 10 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: '이미지 크기가 너무 큽니다 (최대 10MB).' });
  }

  try {
    const apiKey = await resolveAiApiKey(AppDataSource, 'gemini');
    if (!apiKey) throw new Error('Gemini API key not configured. Set GEMINI_API_KEY or configure in AI Settings.');

    const systemPrompt = prompt || `이미지를 분석하고 다음 JSON 형식으로 응답하세요:
{
  "description": "이미지에 대한 상세 설명",
  "objects": ["감지된 객체 목록"],
  "colors": ["주요 색상"],
  "mood": "이미지의 분위기",
  "style": "이미지 스타일",
  "suggestions": ["이미지 활용 제안"],
  "context": "추가 맥락 정보"
}`;

    const model = 'gemini-3.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Vision AI provider error', { status: response.status, body: errorBody });
      throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini Vision API');
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      description: text,
      objects: [],
      colors: [],
      mood: '',
      style: '',
      suggestions: [],
    };

    logger.info('Vision AI analysis completed', { userId, model });

    return res.json({ success: true, result });
  } catch (error: any) {
    logger.error('Vision AI error', { userId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Vision AI 분석 중 오류가 발생했습니다.',
    });
  }
});

// ===========================================
// POST /api/ai/content — outputType 기반 콘텐츠 변환
// WO-AI-CONTENT-TRANSFORM-IMPLEMENTATION-V1
// WO-AI-PROMPT-STRUCTURE-DESIGN-V1
// ===========================================

router.post('/content', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { input, outputType = 'product_detail', options = {} } = req.body;

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'input 텍스트가 필요합니다.' });
  }

  if (!isSupportedOutputType(outputType)) {
    return res.status(400).json({ success: false, error: `지원하지 않는 outputType: ${outputType}` });
  }

  const systemPrompt = buildSystemPrompt(outputType, options);
  const userPrompt = buildUserPrompt(outputType, input);
  const requestId = crypto.randomUUID();

  try {
    const rawResponse = await aiProxyService.generateRawContent(
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 4096,
      },
      userId,
      requestId,
    );

    const normalized = parseResponse(outputType, rawResponse.parsed, rawResponse.rawText);

    logger.info('AI content generated', { requestId, userId, outputType, model: rawResponse.model });

    return res.json({ success: true, ...normalized, requestId });
  } catch (error: any) {
    const status = error.type === 'RATE_LIMIT_ERROR' ? 429
                 : error.type === 'AUTH_ERROR' ? 401
                 : error.type === 'VALIDATION_ERROR' ? 400
                 : error.type === 'TIMEOUT_ERROR' ? 504
                 : 500;
    logger.error('AI content generate error', { requestId, error: error.message, type: error.type });
    return res.status(status).json({
      success: false,
      error: error.message || 'AI 콘텐츠 생성 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/url-to-blocks — URL 콘텐츠 → Block[] 변환
// WO-O4O-AI-BLOCK-GENERATION-V1
// ===========================================

/**
 * URL에서 텍스트 추출 (서버사이드 fetch + HTML 스트리핑)
 */
async function fetchUrlText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; O4O-AI-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`URL fetch 실패: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    // HTML이면 태그 제거, plain text면 그대로
    if (contentType.includes('text/html')) {
      return stripHtml(rawText);
    }
    return rawText;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * HTML에서 의미있는 텍스트 추출
 * WO-O4O-AI-URL-CONTENT-QUALITY-V2: 노이즈 제거 강화
 */
function stripHtml(html: string): string {
  // UI 노이즈 태그 전체 블록 제거 (nav/header/footer/aside/form/button/input/select)
  const noiseTagsRe = /<(nav|header|footer|aside|form|button|input|select|textarea|label|fieldset|dialog|menu|menuitem)[\s\S]*?<\/\1>/gi;

  const cleaned = html
    // script/style 블록 제거
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // UI 노이즈 태그 제거 (2회 반복: 중첩 대응)
    .replace(noiseTagsRe, ' ')
    .replace(noiseTagsRe, ' ')
    // 자기완결형 input/br/hr 제거
    .replace(/<(input|br|hr|img)[^>]*\/?>/gi, ' ')
    // 블록 태그를 줄바꿈으로
    .replace(/<\/(p|div|h[1-6]|li|br|tr|td|th|section|article)>/gi, '\n')
    // 나머지 태그 제거
    .replace(/<[^>]+>/g, ' ')
    // HTML 엔티티 기본 변환
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '')
    // 연속 공백 정리
    .replace(/[ \t]+/g, ' ');

  // 라인별 UI 노이즈 필터링 (WO-O4O-AI-URL-CONTENT-QUALITY-V2)
  const noisePatterns = [
    /^(로그인|회원가입|아이디\s*찾기|비밀번호\s*찾기|회원\s*등록|이용약관|개인정보|저작권|문의|고객센터)$/,
    /^(login|sign\s*up|register|contact|menu|quick\s*menu|subscribe|newsletter)$/i,
    /^(정보|보도자료|저작권|광고|개발자|약관|크리에이터|채널|구독|좋아요|댓글|공유)$/,
    /^(home|about|services|products|blog|news|events|careers|faq|sitemap)$/i,
    /^[\s\|·•\-–—]+$/,  // 구분자만 있는 라인
  ];

  const filteredLines = cleaned
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (l.length === 0) return false;
      if (l.length < 3) return false;
      // 노이즈 패턴 매칭
      if (noisePatterns.some(re => re.test(l))) return false;
      // 메뉴처럼 짧은 단어들이 연속된 라인 (예: "정보 보도자료 저작권 광고")
      const words = l.split(/\s+/);
      if (words.length >= 4 && words.every(w => w.length <= 8)) return false;
      return true;
    });

  return filteredLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    // 최대 3500자 (토큰 초과 방지, V2: 4000→3500 압축)
    .slice(0, 3500);
}

/**
 * Block 생성용 시스템 프롬프트
 * WO-O4O-AI-URL-CONTENT-QUALITY-V2: 블록 수 압축 + 구조 안정화
 */
function buildUrlBlockSystemPrompt(contentType: string, tone: string): string {
  const contentTypeLabel = contentType === 'explain' || contentType === 'explanatory' ? '설명형' : '문서형';
  const toneLabel = tone === 'professional' ? '전문적' : tone === 'store' ? '매장 친화적' : '일반적';

  return `당신은 O4O 플랫폼의 콘텐츠 블록 생성 전문가입니다.
주어진 텍스트를 분석하여 O4O 블록 JSON 배열을 생성하세요.

콘텐츠 유형: ${contentTypeLabel}
톤앤매너: ${toneLabel}

## 출력 규칙
- 반드시 JSON 배열만 반환 (\`\`\`json ... \`\`\` 코드블록 형식)
- 각 블록 구조: { "id": "block-N", "type": "o4o/...", "content": "...", "attributes": {...} }
- id는 "block-1", "block-2" ... 순서대로

## 블록 수 및 길이 제한 (필수)
- **최대 8~10개 블록**으로 구성할 것
- 핵심 내용만 요약하여 포함할 것
- 각 paragraph는 3문장 이내로 간결하게 작성
- 전체 내용을 나열하지 말고 독자에게 가장 유용한 정보만 선별

## 콘텐츠 필터링 (필수)
- 메뉴, 네비게이션, 로그인, 회원가입, footer, 저작권 등 UI 요소는 절대 포함하지 말 것
- 광고, 구독 유도, 관련 링크 목록은 제외
- YouTube 페이지의 경우: 영상 제목, 설명, 핵심 정보만 포함. 채널 메뉴, 추천 영상, UI 항목 제외
- 실제 읽을 수 있는 본문 내용만 포함

## 사용 가능한 블록 타입
- o4o/heading: 제목 → { "id": "block-1", "type": "o4o/heading", "content": "제목", "attributes": { "level": 2 } }
- o4o/paragraph: 문단 → { "id": "block-2", "type": "o4o/paragraph", "content": "본문" }
- o4o/list: 핵심 포인트 목록 → { "id": "block-3", "type": "o4o/list", "content": "<li>항목1</li><li>항목2</li>", "attributes": { "type": "unordered" } }
- o4o/quote: 중요 인용문만 → { "id": "block-4", "type": "o4o/quote", "content": "인용", "attributes": { "citation": "출처" } }
- o4o/image: 이미지 URL 있을 때만 → { "id": "block-5", "type": "o4o/image", "attributes": { "url": "https://...", "alt": "설명" } }
- o4o/youtube: YouTube URL 있을 때만 → { "id": "block-6", "type": "o4o/youtube", "attributes": { "url": "https://youtube.com/..." } }

## 구조 규칙
1. heading(level 2) → paragraph 흐름 중심으로 구성
2. list는 핵심 포인트에만 사용 (3~5개 항목)
3. layout/widget/columns 블록 사용 금지
4. 읽기 쉬운 문서 형태로 구성

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;
}

router.post('/url-to-blocks', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const {
    url,
    contentType = 'document',
    tone = 'normal',
    customInstruction = '',
  } = req.body as {
    url?: string;
    contentType?: string;
    tone?: string;
    customInstruction?: string;
  };

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'url이 필요합니다.' });
  }

  // URL 형식 검증
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('http/https URL만 허용됩니다.');
    }
  } catch {
    return res.status(400).json({ success: false, error: '올바른 URL 형식이 아닙니다. (http/https만 허용)' });
  }

  const requestId = crypto.randomUUID();

  try {
    logger.info('[url-to-blocks] 시작', { requestId, userId, url: parsedUrl.hostname });

    // 1. URL 콘텐츠 가져오기
    let urlText: string;
    try {
      urlText = await fetchUrlText(parsedUrl.toString());
    } catch (fetchError: any) {
      logger.warn('[url-to-blocks] URL fetch 실패', { requestId, error: fetchError.message });
      return res.status(422).json({
        success: false,
        error: `URL 콘텐츠를 가져올 수 없습니다: ${fetchError.message}`,
      });
    }

    if (urlText.trim().length < 50) {
      return res.status(422).json({
        success: false,
        error: 'URL에서 충분한 텍스트를 추출할 수 없습니다.',
      });
    }

    // 2. 프롬프트 빌드
    const systemPrompt = buildUrlBlockSystemPrompt(contentType, tone);
    const userPrompt = [
      `다음 URL(${parsedUrl.hostname})의 텍스트를 O4O 블록 JSON 배열로 변환하세요:`,
      '',
      '=== 추출된 텍스트 ===',
      urlText,
      '',
      customInstruction ? `=== 추가 요청사항 ===\n${customInstruction}` : '',
    ].filter(Boolean).join('\n');

    // 3. AI 호출 (기존 프록시 서비스 사용)
    const aiResponse = await aiProxyService.generateRawContent(
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 8192,
      },
      userId,
      requestId,
    );

    // 4. JSON 블록 파싱
    const rawText: string = aiResponse.rawText || '';
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) ||
                      rawText.match(/```\s*([\s\S]*?)```/) ||
                      rawText.match(/(\[[\s\S]*\])/);

    if (!jsonMatch) {
      logger.error('[url-to-blocks] JSON 블록을 찾을 수 없음', { requestId, rawText: rawText.slice(0, 200) });
      return res.status(500).json({ success: false, error: 'AI 응답에서 블록 구조를 파싱할 수 없습니다.' });
    }

    let blocks: any[];
    try {
      blocks = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      if (!Array.isArray(blocks)) throw new Error('블록이 배열 형식이 아닙니다.');
    } catch (parseError: any) {
      logger.error('[url-to-blocks] 블록 JSON 파싱 실패', { requestId, error: parseError.message });
      return res.status(500).json({ success: false, error: '블록 JSON 파싱 실패: ' + parseError.message });
    }

    // 5. 블록 ID 보장 및 기본 정규화
    const normalizedBlocks = blocks.map((block, i) => ({
      id: block.id || `block-${i + 1}-${Date.now()}`,
      type: block.type || 'o4o/paragraph',
      content: block.content ?? '',
      ...(block.attributes ? { attributes: block.attributes } : {}),
      ...(block.innerBlocks ? { innerBlocks: block.innerBlocks } : {}),
    }));

    // 6. 후처리 파이프라인 (WO-O4O-AI-URL-CONTENT-QUALITY-V4)
    // 전략: 키워드 기반 제거 → 문장/구조 기반 품질 필터로 전환
    const isYouTube =
      parsedUrl.hostname.includes('youtube.com') ||
      parsedUrl.hostname.includes('youtu.be');

    // 6-A. 품질 기반 필터 함수
    /** 20자 미만 — 메뉴/버튼/레이블 대부분 해당 */
    const isTooShort = (text: string): boolean => text.trim().length < 20;

    /** 짧은 단어 4개 이상 연속 — 네비게이션/메뉴 구조 특징 */
    const isMenuLike = (text: string): boolean => {
      const tokens = text.split(/[\s|,·\-–—\/]/).filter(Boolean);
      return tokens.length >= 4 && tokens.every(t => t.length <= 6);
    };

    /** 블록 텍스트가 실질적인 콘텐츠인지 판단 */
    const isValidContent = (text: string): boolean => {
      if (!text || isTooShort(text)) return false;
      if (isMenuLike(text)) return false;
      return true;
    };

    // 6-B. 블록별 품질 필터 적용
    let finalBlocks: typeof normalizedBlocks;
    if (isYouTube) {
      // YouTube: embed 유지 + 유효 텍스트 블록 최대 3개
      const ytBlocks = normalizedBlocks.filter(b => b.type === 'o4o/youtube');
      const textBlocks = normalizedBlocks
        .filter(b => b.type !== 'o4o/youtube')
        .filter(b => isValidContent(b.content || ''))
        .slice(0, 3);
      finalBlocks = [...ytBlocks, ...textBlocks];
    } else {
      // 일반 페이지: 품질 필터 적용
      finalBlocks = normalizedBlocks.filter(b => isValidContent(b.content || ''));
    }

    // 6-C. 최대 블록 수 강제 제한
    const MAX_BLOCKS = 10;
    const limitedBlocks = finalBlocks.slice(0, MAX_BLOCKS);

    logger.info('[url-to-blocks] 완료', {
      requestId,
      userId,
      rawBlocks: normalizedBlocks.length,
      afterFilter: finalBlocks.length,
      final: limitedBlocks.length,
      isYouTube,
    });

    return res.json({ success: true, blocks: limitedBlocks, requestId });
  } catch (error: any) {
    logger.error('[url-to-blocks] 오류', { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'URL 블록 생성 중 오류가 발생했습니다.',
    });
  }
});

// ===========================================
// POST /api/ai/content-to-store-use — 콘텐츠 → 매장 활용 변환
// WO-O4O-STORE-USE-CONTENT-TRANSFORM-V1
//
// sourceHtml의 텍스트를 추출하여 useCase에 맞는 매장 활용 문구로 변환한다.
// useCase: 'qr' | 'pop' | 'sns' | 'blog'
// audience: 'customer' | 'staff' | 'store_owner'
// tone: 'easy' | 'professional' | 'promotion'
// length: 'short' | 'medium'
// ===========================================

/** HTML에서 순수 텍스트 추출 (간단 strip) */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** useCase → OutputType 매핑 */
type StoreUseCase = 'qr' | 'pop' | 'sns' | 'blog';

function useCaseToOutputType(useCase: StoreUseCase): string {
  switch (useCase) {
    case 'qr': return 'store_qr';
    case 'pop': return 'pop';
    case 'sns': return 'store_sns';
    case 'blog': return 'blog';
  }
}

/** audience 매핑 (WO API → 내부 프롬프트 옵션) */
function mapAudience(audience: string): string {
  switch (audience) {
    case 'customer': return 'pharmacy';
    case 'staff': return 'operator';
    case 'store_owner': return 'operator';
    default: return 'general';
  }
}

router.post('/content-to-store-use', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const {
    sourceHtml,
    useCase,
    audience = 'customer',
    tone = 'easy',
    length = 'short',
  } = req.body;

  if (!sourceHtml || typeof sourceHtml !== 'string' || sourceHtml.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'sourceHtml이 필요합니다.' });
  }

  const validUseCases: StoreUseCase[] = ['qr', 'pop', 'sns', 'blog'];
  if (!validUseCases.includes(useCase)) {
    return res.status(400).json({ success: false, error: `useCase는 ${validUseCases.join(', ')} 중 하나여야 합니다.` });
  }

  const plainText = htmlToPlainText(sourceHtml);
  if (plainText.length < 10) {
    return res.status(400).json({ success: false, error: '콘텐츠 내용이 너무 짧습니다. 본문을 먼저 작성해 주세요.' });
  }

  const outputType = useCaseToOutputType(useCase as StoreUseCase);

  if (!isSupportedOutputType(outputType)) {
    return res.status(400).json({ success: false, error: `지원하지 않는 useCase: ${useCase}` });
  }

  const internalAudience = mapAudience(audience);
  const options = { tone, length, audience: internalAudience };
  const systemPrompt = buildSystemPrompt(outputType, options);
  const userPrompt = buildUserPrompt(outputType, plainText);
  const requestId = crypto.randomUUID();

  try {
    const rawResponse = await aiProxyService.generateRawContent(
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 2048,
      },
      userId,
      requestId,
    );

    const normalized = parseResponse(outputType, rawResponse.parsed, rawResponse.rawText);
    const resultPlainText = normalized.html
      ? htmlToPlainText(normalized.html)
      : normalized.longText || normalized.shortText || normalized.summary || '';

    logger.info('AI content-to-store-use generated', { requestId, userId, useCase, outputType, model: rawResponse.model });

    return res.json({
      success: true,
      html: normalized.html,
      plainText: resultPlainText,
      title: normalized.title,
      summary: normalized.summary,
      shortText: normalized.shortText,
      longText: normalized.longText,
      bullets: normalized.bullets,
      requestId,
    });
  } catch (error: any) {
    const status = error.type === 'RATE_LIMIT_ERROR' ? 429
                 : error.type === 'AUTH_ERROR' ? 401
                 : error.type === 'VALIDATION_ERROR' ? 400
                 : error.type === 'TIMEOUT_ERROR' ? 504
                 : 500;
    logger.error('AI content-to-store-use error', { requestId, error: error.message, type: error.type });
    return res.status(status).json({
      success: false,
      error: error.message || 'AI 매장 활용 변환 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

export default router;

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
// WO-O4O-AI-URL-TO-BLOCKS-YOUTUBE-SUPPORT-V1
import { isYouTubeUrl, fetchYouTubeContent, fetchYouTubeOEmbed } from './ai-proxy/youtube-fetcher.js';

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

    // WO-O4O-AI-MODEL-SETTINGS-CLEANUP-V1: gemini-3.0-flash → gemini-2.5-flash (canonical valid model).
    const model = 'gemini-2.5-flash';
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

  const { input, outputType = 'product_detail', options = {}, customPrompt } = req.body;

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'input 텍스트가 필요합니다.' });
  }

  if (!isSupportedOutputType(outputType)) {
    return res.status(400).json({ success: false, error: `지원하지 않는 outputType: ${outputType}` });
  }

  // WO-O4O-AI-CONTENT-CUSTOM-PROMPT-AND-CORE-EXTENSION-AUDIT-V1:
  //   customPrompt 는 options 외부에서도 받을 수 있도록 허용하되, options.customPrompt 로 통합한다.
  //   미전달/빈 문자열 시 기존 동작 그대로.
  const mergedOptions = {
    ...options,
    customPrompt:
      typeof customPrompt === 'string'
        ? customPrompt
        : (typeof options?.customPrompt === 'string' ? options.customPrompt : ''),
  };

  const systemPrompt = buildSystemPrompt(outputType, mergedOptions);
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
 * URL 추출 본문 최대 길이 (글자).
 * WO-O4O-KPA-AI-URL-LONGFORM-GENERATION-DRIFT-V1:
 *   기존 3500 → 6000 으로 완화. 장문(A4 1장 이상) 생성 시 원문 핵심을
 *   충분히 확보하려면 추출 단계 절단을 줄여야 한다. AI 입력 토큰 한도는
 *   maxTokens 상향(16384)으로 함께 흡수한다.
 */
const URL_EXTRACT_MAX_CHARS = 6000;

/**
 * URL에서 텍스트 추출 (서버사이드 fetch + HTML 스트리핑)
 *
 * WO-O4O-AI-URL-TO-BLOCKS-YOUTUBE-SUPPORT-V1:
 *   YouTube URL 은 SPA 라 단순 fetch 로 콘텐츠 추출 불가 →
 *   별도 oEmbed + transcript 경로(fetchYouTubeContent) 우선 사용,
 *   결과가 부실하면(50자 미만) 일반 fetch 로 폴백.
 */
async function fetchUrlText(url: string): Promise<string> {
  if (isYouTubeUrl(url)) {
    const ytText = await fetchYouTubeContent(url).catch(() => '');
    if (ytText && ytText.trim().length >= 50) {
      return ytText.slice(0, URL_EXTRACT_MAX_CHARS);
    }
    // 폴백: 일반 fetch 도 거의 의미 없지만 시도는 해 둔다
  }

  // WO-O4O-AI-URL-NAVER-BLOG-IFRAME-POSTVIEW-EXTRACTOR-V1
  if (isNaverBlogUrl(url)) {
    const { text } = await fetchNaverBlogContent(url);
    return text;
  }

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
 * WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1
 *
 * url-to-blocks 전용: 본문 + 추출된 제목을 함께 반환.
 * fetchUrlText 와 거의 동일한 fetch 경로지만 추가로 페이지 제목을 함께 추출한다.
 *
 * - YouTube URL: oEmbed.title 사용 (fetchYouTubeContent 와 병렬)
 * - HTML 페이지: <title> → og:title → twitter:title 우선순위로 추출
 * - course-structure 등 LMS 라우트는 기존 fetchUrlText 를 계속 사용 (영향 없음)
 */
interface UrlContent { text: string; title?: string }

// WO-O4O-AI-URL-NAVER-BLOG-IFRAME-POSTVIEW-EXTRACTOR-V1
function isNaverBlogUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'blog.naver.com' || hostname === 'm.blog.naver.com';
  } catch {
    return false;
  }
}

// 네이버 블로그 PostView HTML에서 본문 텍스트 추출 (se-main-container 우선)
function extractNaverBlogText(html: string): string {
  // se-main-container (스마트에디터 최신 글)
  const seMain = html.match(/<div[^>]+class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (seMain) {
    const text = stripHtml(seMain[1]);
    if (text.trim().length >= 50) return text;
  }

  // post-view (구형 에디터)
  const postView = html.match(/<div[^>]+class="[^"]*post-view[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (postView) {
    const text = stripHtml(postView[1]);
    if (text.trim().length >= 50) return text;
  }

  // viewTypeSelector (일부 레이아웃)
  const viewType = html.match(/<div[^>]+id="viewTypeSelector"[^>]*>([\s\S]*?)<\/div>/i);
  if (viewType) {
    const text = stripHtml(viewType[1]);
    if (text.trim().length >= 50) return text;
  }

  // fallback: 전체 stripHtml
  return stripHtml(html);
}

async function fetchNaverBlogContent(url: string): Promise<UrlContent> {
  const fetchOpts = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; O4O-AI-Bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,text/plain',
    },
  };

  // 1. 첫 페이지 fetch
  const ctrl1 = new AbortController();
  const t1 = setTimeout(() => ctrl1.abort(), 12000);
  let firstHtml: string;
  try {
    const res = await fetch(url, { ...fetchOpts, signal: ctrl1.signal });
    if (!res.ok) throw new Error(`네이버 블로그 fetch 실패: ${res.status}`);
    firstHtml = await res.text();
  } finally {
    clearTimeout(t1);
  }

  // 2. iframe#mainFrame src 추출
  const iframeMatch = firstHtml.match(/<iframe[^>]+id=["']mainFrame["'][^>]+src=["']([^"']+)["']/i)
    || firstHtml.match(/<iframe[^>]+src=["']([^"']+)["'][^>]+id=["']mainFrame["']/i);

  let postViewHtml = firstHtml;
  let resolvedTitle = extractHtmlTitle(firstHtml);

  if (iframeMatch) {
    const iframeSrc = iframeMatch[1];
    // 상대경로 → 절대 URL
    const postViewUrl = iframeSrc.startsWith('http')
      ? iframeSrc
      : `https://blog.naver.com${iframeSrc.startsWith('/') ? '' : '/'}${iframeSrc}`;

    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 12000);
    try {
      const res2 = await fetch(postViewUrl, { ...fetchOpts, signal: ctrl2.signal });
      if (res2.ok) {
        postViewHtml = await res2.text();
        resolvedTitle = extractHtmlTitle(postViewHtml) || resolvedTitle;
      }
    } finally {
      clearTimeout(t2);
    }
  }

  const text = extractNaverBlogText(postViewHtml).slice(0, URL_EXTRACT_MAX_CHARS);
  return { text, title: resolvedTitle };
}

async function fetchUrlContent(url: string): Promise<UrlContent> {
  if (isYouTubeUrl(url)) {
    // oEmbed 와 본문(자막+metadata)을 병렬 호출 — 추가 latency 없음
    const [oembed, ytText] = await Promise.all([
      fetchYouTubeOEmbed(url).catch(() => null),
      fetchYouTubeContent(url).catch(() => ''),
    ]);
    if (ytText && ytText.trim().length >= 50) {
      return {
        text: ytText.slice(0, URL_EXTRACT_MAX_CHARS),
        title: oembed?.title?.trim() || undefined,
      };
    }
    // 폴백: 일반 fetch — 보통 SPA 라 본문도 부족하지만 흐름 유지
  }

  // WO-O4O-AI-URL-NAVER-BLOG-IFRAME-POSTVIEW-EXTRACTOR-V1
  if (isNaverBlogUrl(url)) {
    return fetchNaverBlogContent(url);
  }

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

    if (contentType.includes('text/html')) {
      return {
        text: stripHtml(rawText),
        title: extractHtmlTitle(rawText),
      };
    }
    return { text: rawText };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** HTML 엔티티 기본 디코딩 (제목 추출용 짧은 텍스트 한정) */
function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * 페이지 제목 추출.
 *
 * 우선순위 (WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1):
 *   1. <title>
 *   2. og:title
 *   3. twitter:title
 *
 * meta 태그는 attribute 순서가 다양하므로 (name 먼저 / content 먼저) 양방향 패턴을 모두 시도.
 * 실패 시 undefined — 호출 측에서 blocks 기반 fallback 으로 넘긴다.
 */
function extractHtmlTitle(html: string): string | undefined {
  // 1. <title>...</title>
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTagMatch) {
    const cleaned = decodeBasicHtmlEntities(
      titleTagMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    );
    if (cleaned) return cleaned.slice(0, 200);
  }

  // 2. og:title (property=og:title content="...")
  const og =
    html.match(/<meta\s+[^>]*?property\s*=\s*["']og:title["'][^>]*?content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<meta\s+[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?property\s*=\s*["']og:title["']/i);
  if (og) {
    const cleaned = decodeBasicHtmlEntities(og[1].trim());
    if (cleaned) return cleaned.slice(0, 200);
  }

  // 3. twitter:title (name=twitter:title content="...")
  const tw =
    html.match(/<meta\s+[^>]*?name\s*=\s*["']twitter:title["'][^>]*?content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<meta\s+[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?name\s*=\s*["']twitter:title["']/i);
  if (tw) {
    const cleaned = decodeBasicHtmlEntities(tw[1].trim());
    if (cleaned) return cleaned.slice(0, 200);
  }

  return undefined;
}

/**
 * AI 가 생성한 blocks 에서 fallback 제목 도출.
 *
 * 우선순위 (WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1):
 *   5. 첫 o4o/heading content
 *   6. 첫 o4o/paragraph 의 첫 문장 (또는 앞 40자)
 */
function deriveTitleFromBlocks(blocks: Array<{ type?: string; content?: string }>): string | undefined {
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const firstHeading = blocks.find((b) => b.type === 'o4o/heading');
  if (firstHeading?.content) {
    const cleaned = stripTags(String(firstHeading.content));
    if (cleaned) return cleaned.slice(0, 80);
  }

  const firstPara = blocks.find((b) => b.type === 'o4o/paragraph');
  if (firstPara?.content) {
    const cleaned = stripTags(String(firstPara.content));
    if (cleaned) {
      const firstSentence = cleaned.split(/(?<=[.!?。！？])\s+/)[0]?.trim();
      if (firstSentence && firstSentence.length > 0 && firstSentence.length <= 80) {
        return firstSentence;
      }
      return cleaned.slice(0, 40) + (cleaned.length > 40 ? '…' : '');
    }
  }

  return undefined;
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
    // WO-O4O-KPA-AI-URL-LONGFORM-GENERATION-DRIFT-V1:
    //   3500 → 6000 으로 완화. 장문 모드(long, A4 1장 이상)에서 원문 핵심을
    //   충분히 확보하려면 추출 단계 절단을 줄여야 한다. 토큰 한도는 maxTokens
    //   상향(16384)으로 흡수.
    .slice(0, URL_EXTRACT_MAX_CHARS);
}

// ===========================================
// URL Length — WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1
// ===========================================
//
// 모달의 "정리 모드" 프리셋 제거에 맞춰 url-to-blocks 도 outputType 분기를 제거.
// 결과 형식은 customInstruction(사용자 추가 요청) 이 결정한다.
// length / tone 만 분량·말투 보조 가이드로 유지된다.
//
// 레거시: 구버전 클라이언트가 보내는 outputType / contentType 은 받기만 하고
// 무시한다 (UI 가 사라졌으므로 의미 없음).

type UrlLength = 'short' | 'medium' | 'long';

const VALID_URL_LENGTHS: readonly UrlLength[] = ['short', 'medium', 'long'];

// customInstruction 에서 장문 요청 의도를 추론하는 키워드.
// 명시 length 가 없을 때만 적용 — 사용자가 짧게 지정했으면 그쪽이 우선.
const LONGFORM_INTENT_RE = /(A4|1\s*장|장문|상세\s*히|상세\s*하게|깊이|풍부|길게|풀\s*버전|full\s*version|강의\s*자료)/i;

function isLongformIntent(customInstruction: string | undefined): boolean {
  if (!customInstruction) return false;
  return LONGFORM_INTENT_RE.test(customInstruction);
}

function resolveUrlLength(
  requested: unknown,
  customInstruction: string | undefined,
): UrlLength {
  if (typeof requested === 'string' && (VALID_URL_LENGTHS as readonly string[]).includes(requested)) {
    return requested as UrlLength;
  }
  // 사용자 자유 텍스트에서 장문 의도 감지 시 자동 long 승격
  if (isLongformIntent(customInstruction)) return 'long';
  return 'medium';
}

/**
 * length → 분량/블록 수 가이드.
 * WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
 *   outputType 별 형식 강제(요약/문서/블로그/강의자료)는 제거. customInstruction 이
 *   결과 형식을 결정하고, length 는 분량 보조 가이드로만 사용한다.
 */
const URL_LENGTH_INSTRUCTIONS: Record<UrlLength, string> = {
  short: '총 분량 500~1000자, 4~8개 블록. 핵심만 간결히.',
  medium: '총 분량 1500~2500자, 8~15개 블록. 본문을 적절히 풀어쓰기.',
  long: '총 분량 3000~6000자, 15~25개 블록. A4 1장 이상의 충분한 분량.',
};

/** length → MAX_BLOCKS 강제 상한. customInstruction 으로 형식이 결정되므로 length 만으로 통일. */
const MAX_BLOCKS_BY_LENGTH: Record<UrlLength, number> = {
  short: 10,
  medium: 18,
  long: 32,
};

/** length 별 AI 응답 max output tokens. long 은 Gemini 2.5 한도 내에서 충분히 확보. */
const MAX_TOKENS_BY_LENGTH: Record<UrlLength, number> = {
  short: 4096,
  medium: 8192,
  long: 16384,
};

/**
 * Block 생성용 시스템 프롬프트
 * WO-O4O-AI-URL-CONTENT-QUALITY-V2: 블록 수 압축 + 구조 안정화
 * WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
 *   outputType 별 형식 강제(요약/문서/블로그/강의자료) 제거.
 *   결과 형식은 customInstruction(사용자 추가 요청) 이 결정한다.
 *   length / tone 은 분량·말투 보조 가이드로만 동작한다.
 */
function buildUrlBlockSystemPrompt(length: UrlLength, tone: string): string {
  const toneLabel = tone === 'professional' ? '전문적' : tone === 'store' ? '매장 친화적' : '일반적';
  const lengthInstruction = URL_LENGTH_INSTRUCTIONS[length];

  return `당신은 O4O 플랫폼의 콘텐츠 블록 생성 보조 도구입니다.
주어진 URL 원본 텍스트를 사용자 요청에 맞춰 O4O 블록 JSON 배열로 재구성하세요.

톤앤매너: ${toneLabel}

## 결과 형식 (필수)
- [사용자 추가 요청] 블록이 있으면 그 의도(예: 블로그 글, POP 문구, QR 안내문, 제목 추천, A4 1장 강의자료 등)대로 따른다.
- 요청이 없거나 모호하면 원본을 깨끗한 본문 블록 묶음으로 정리한다.
- 자의적으로 "요약" 으로 좁히지 말 것. 사용자가 명시적으로 요약을 요청한 경우에만 요약한다.

## 분량 (보조 가이드)
${lengthInstruction}
- 사용자 요청과 충돌하면 사용자 요청 우선. 없는 사실은 창작하지 말 것.

## 출력 규칙
- 반드시 JSON 배열만 반환 (\`\`\`json ... \`\`\` 코드블록 형식)
- 각 블록 구조: { "id": "block-N", "type": "o4o/...", "content": "...", "attributes": {...} }
- id는 "block-1", "block-2" ... 순서대로

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
1. heading(level 2)을 큰 흐름 구분에, level 3은 세부 섹션 구분에 사용
2. paragraph 본문이 흐름의 중심 — 단락마다 한 가지 주제 집중
3. list는 핵심 포인트 정리에 사용 (한 list 당 3~7개 항목)
4. layout/widget/columns 블록 사용 금지

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;
}

router.post('/url-to-blocks', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  // WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
  //   outputType / contentType 은 받기만 하고 prompt 분기에는 사용하지 않는다
  //   (정리 모드 프리셋 제거에 따라 결과 형식은 customInstruction 이 결정).
  //   length / tone 만 보조 가이드로 사용.
  const {
    url,
    length: rawLength,
    tone = 'normal',
    customInstruction = '',
  } = req.body as {
    url?: string;
    outputType?: string;  // 레거시 — 무시
    length?: string;
    contentType?: string;  // 레거시 — 무시
    tone?: string;
    customInstruction?: string;
  };

  const resolvedLength = resolveUrlLength(rawLength, customInstruction);

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
    logger.info('[url-to-blocks] 시작', {
      requestId,
      userId,
      url: parsedUrl.hostname,
      length: resolvedLength,
      hasCustomInstruction: customInstruction.trim().length > 0,
    });

    // 1. URL 콘텐츠 가져오기
    // WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1: fetchUrlContent 로 본문 + 추출 제목 함께 수신
    let urlText: string;
    let extractedTitle: string | undefined;
    try {
      const fetched = await fetchUrlContent(parsedUrl.toString());
      urlText = fetched.text;
      extractedTitle = fetched.title;
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
    // WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
    //   outputType 별 형식 강제 제거. customInstruction 이 결과 형식을 결정한다.
    //   length 는 분량 보조 가이드, tone 은 말투 보조 가이드.
    const systemPrompt = buildUrlBlockSystemPrompt(resolvedLength, tone);
    const userPrompt = [
      `다음 URL(${parsedUrl.hostname})의 텍스트를 O4O 블록 JSON 배열로 변환하세요.`,
      `분량 가이드: ${resolvedLength}`,
      '',
      '=== 추출된 텍스트 ===',
      urlText,
      '',
      customInstruction
        ? `=== 사용자 추가 요청 (최우선) ===\n${customInstruction}\n\n위 요청이 결과 형식·구조의 1순위 기준입니다. 분량/톤 가이드와 충돌하면 이 요청을 따르세요.`
        : '',
    ].filter(Boolean).join('\n');

    // 3. AI 호출 (기존 프록시 서비스 사용)
    //   maxTokens 는 length 별로 동적 조정 (long 은 16384 까지 확보).
    let aiResponse: Awaited<ReturnType<typeof aiProxyService.generateRawContent>>;
    try {
      aiResponse = await aiProxyService.generateRawContent(
        {
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          systemPrompt,
          userPrompt,
          temperature: 0.5,
          maxTokens: MAX_TOKENS_BY_LENGTH[resolvedLength],
        },
        userId,
        requestId,
      );
    } catch (aiError: any) {
      logger.error('[url-to-blocks] AI 생성 실패', { requestId, error: aiError.message, type: aiError.type });
      const isTimeout = aiError.type === 'TIMEOUT_ERROR' || aiError.message?.includes('abort');
      const isRateLimit = aiError.type === 'RATE_LIMIT_ERROR';
      const statusCode = isTimeout ? 504 : isRateLimit ? 429 : 500;
      return res.status(statusCode).json({
        success: false,
        error: isTimeout
          ? 'AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
          : isRateLimit
            ? 'AI 서비스 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
            : 'AI 콘텐츠 생성에 실패했습니다. 다시 시도해 주세요.',
      });
    }

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
      // WO-O4O-AI-URL-TO-BLOCKS-YOUTUBE-SUPPORT-V1:
      //   Gemini 가 o4o/youtube 블록을 만들지 않은 경우에도 원본 URL 기반으로
      //   embed 블록 1개를 보장한다. (block schema 변경 없음 — 기존 타입 그대로)
      if (ytBlocks.length === 0) {
        ytBlocks.push({
          id: `block-yt-${Date.now()}`,
          type: 'o4o/youtube',
          content: '',
          attributes: { url: parsedUrl.toString() },
        } as typeof normalizedBlocks[number]);
      }
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
    // WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
    //   length 기준 단일 매트릭스로 단순화. outputType 분기 제거.
    const MAX_BLOCKS = MAX_BLOCKS_BY_LENGTH[resolvedLength];
    const limitedBlocks = finalBlocks.slice(0, MAX_BLOCKS);

    // WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1:
    //   추출 제목(youtube oEmbed / HTML <title>·og·twitter) 우선, 없으면 blocks 기반 fallback.
    //   둘 다 실패하면 title 미포함 — 클라이언트는 빈 string 으로 다루고 사용자가 직접 입력.
    const blocksTitleFallback = extractedTitle ? undefined : deriveTitleFromBlocks(limitedBlocks);
    const finalTitle = (extractedTitle || blocksTitleFallback || '').trim();

    logger.info('[url-to-blocks] 완료', {
      requestId,
      userId,
      length: resolvedLength,
      maxBlocks: MAX_BLOCKS,
      rawBlocks: normalizedBlocks.length,
      afterFilter: finalBlocks.length,
      final: limitedBlocks.length,
      isYouTube,
      titleSource: extractedTitle ? 'extracted' : (blocksTitleFallback ? 'blocks' : 'none'),
    });

    return res.json({ success: true, blocks: limitedBlocks, title: finalTitle, requestId });
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

// ===========================================
// POST /api/ai/course-structure — 주제/URL → 레슨 목록 (5~8개)
// WO-O4O-LMS-COURSE-STRUCTURE-AI-V2
// ===========================================
//
// 정책:
// - 입력: { input: string, type: 'url' | 'topic' }
// - 출력: { success, lessons: [{ title, summary }], requestId }
// - 자동 생성된 레슨은 절대 자동 저장하지 않음 (사용자 선택 후 호출자가 createLesson 으로 저장)
// - 5~8개의 논리 순서 레슨, 각 제목은 짧고 명확, summary 1~2문장

function buildCourseStructureSystemPrompt(): string {
  return `당신은 O4O LMS 강의 설계 전문가입니다.
주어진 주제 또는 URL 콘텐츠로부터 강의의 레슨 구조(목차)를 설계하세요.

## 출력 규칙
- 반드시 JSON 배열만 반환 (\`\`\`json ... \`\`\` 코드블록 형식)
- 각 항목 구조: { "title": "레슨 제목", "summary": "1~2문장 요약" }
- 5개 이상 8개 이하

## 레슨 구성 규칙
- 논리적인 순서로 배치 (입문 → 핵심 → 응용)
- 각 레슨은 독립적으로 학습 가능한 단일 주제
- 제목은 짧고 명확하게 (한 줄, 30자 이내 권장)
- summary 는 1~2문장으로 학습자가 무엇을 얻는지 명시

## 금지
- 본문 / 영상 / 퀴즈 / 과제 생성 금지
- 8개 초과 또는 5개 미만 금지
- JSON 외 다른 텍스트 포함 금지

JSON 만 반환하세요.`;
}

router.post('/course-structure', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { input, type } = req.body as { input?: string; type?: 'url' | 'topic' };

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'input이 필요합니다.' });
  }
  if (type !== 'url' && type !== 'topic') {
    return res.status(400).json({ success: false, error: "type 은 'url' 또는 'topic' 이어야 합니다." });
  }

  const requestId = crypto.randomUUID();

  try {
    // 1. type 별 user prompt 빌드
    let userPrompt: string;
    if (type === 'url') {
      // URL 검증
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(input.trim());
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('http/https URL 만 허용됩니다.');
        }
      } catch {
        return res.status(400).json({ success: false, error: '올바른 URL 형식이 아닙니다. (http/https 만 허용)' });
      }

      // URL 텍스트 추출 (재사용)
      let urlText: string;
      try {
        urlText = await fetchUrlText(parsedUrl.toString());
      } catch (fetchError: any) {
        logger.warn('[course-structure] URL fetch 실패', { requestId, error: fetchError.message });
        return res.status(422).json({ success: false, error: `URL 콘텐츠를 가져올 수 없습니다: ${fetchError.message}` });
      }
      if (urlText.trim().length < 50) {
        return res.status(422).json({ success: false, error: 'URL 에서 충분한 텍스트를 추출할 수 없습니다.' });
      }
      userPrompt = [
        `다음 URL(${parsedUrl.hostname})의 콘텐츠로부터 강의의 레슨 구조(목차)를 5~8개로 설계하세요:`,
        '',
        '=== 추출된 텍스트 ===',
        urlText,
      ].join('\n');
    } else {
      // topic 모드 — 그대로 주제로 사용
      userPrompt = [
        '다음 주제로 강의의 레슨 구조(목차)를 5~8개로 설계하세요:',
        '',
        `주제: ${input.trim()}`,
      ].join('\n');
    }

    // 2. AI 호출
    logger.info('[course-structure] 시작', { requestId, userId, type });
    const aiResponse = await aiProxyService.generateRawContent(
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt: buildCourseStructureSystemPrompt(),
        userPrompt,
        temperature: 0.6,
        maxTokens: 4096,
      },
      userId,
      requestId,
    );

    // 3. JSON 배열 파싱 (url-to-blocks 와 동일 패턴)
    const rawText: string = aiResponse.rawText || '';
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)```/) ||
      rawText.match(/```\s*([\s\S]*?)```/) ||
      rawText.match(/(\[[\s\S]*\])/);

    if (!jsonMatch) {
      logger.error('[course-structure] JSON 파싱 실패', { requestId, rawText: rawText.slice(0, 200) });
      return res.status(500).json({ success: false, error: 'AI 응답에서 레슨 구조를 파싱할 수 없습니다.' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (parseError: any) {
      logger.error('[course-structure] JSON parse error', { requestId, error: parseError.message });
      return res.status(500).json({ success: false, error: 'JSON 파싱 실패: ' + parseError.message });
    }
    if (!Array.isArray(parsed)) {
      return res.status(500).json({ success: false, error: 'AI 응답이 배열 형식이 아닙니다.' });
    }

    // 4. 정규화 + 5~8개 강제
    const lessons = parsed
      .map((item: any) => ({
        title: typeof item?.title === 'string' ? item.title.trim() : '',
        summary: typeof item?.summary === 'string' ? item.summary.trim() : '',
      }))
      .filter((l) => l.title.length > 0)
      .slice(0, 8);

    if (lessons.length < 3) {
      // 5개 미만이면 사실상 사용 불가 — 에러
      logger.warn('[course-structure] 부족한 레슨 수', { requestId, count: lessons.length });
      return res.status(500).json({
        success: false,
        error: `생성된 레슨이 너무 적습니다 (${lessons.length}개). 다시 시도해 주세요.`,
      });
    }

    logger.info('[course-structure] 완료', { requestId, userId, count: lessons.length });
    return res.json({ success: true, lessons, requestId });
  } catch (error: any) {
    logger.error('[course-structure] 오류', { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || '강의 구조 생성 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/lesson-body — 레슨 본문 HTML 초안 생성
// WO-O4O-LMS-LESSON-BODY-AI-GENERATION-V3
// ===========================================
//
// 정책:
// - 입력: { courseTitle, lessonTitle, lessonSummary, tone?, audience? }
// - 출력: { success, html, requestId }
// - 한국어 / 약사·전문가 강의 톤 / h2·p·ul·li 중심 / 700~1200자
// - 과장 홍보 / 의료·법률 확정 표현 금지
// - 자동 저장 안 함 (호출자가 createLesson 으로 저장 시점 결정)

function buildLessonBodySystemPrompt(tone: string, audience: string): string {
  const toneLabel = tone === 'casual' ? '편안한' : tone === 'concise' ? '간결한' : '전문적이고 차분한';
  const audienceLabel = audience === 'student' ? '약대생/일반 학습자' : '약사 및 보건·전문가 커뮤니티';
  return `당신은 O4O LMS 강의 작가입니다. 한국어로 강의 본문 초안 HTML 을 작성하세요.

## 톤 / 대상
- 톤: ${toneLabel}
- 대상: ${audienceLabel}
- 학습자가 바로 읽을 수 있는 본문이어야 합니다.

## 분량 / 형식
- 700~1200자 분량의 HTML 만 반환 (코드블록 / 마크다운 금지)
- 사용 가능한 태그: <h2> <h3> <p> <ul> <li> <ol> <strong> <em>
- 첫 줄은 <h2>...</h2> 로 시작
- 단락마다 빈 줄로 구분되도록 <p> 또는 <h2>·<h3> 단위 분리
- 적절한 곳에 <h3>실무 적용 포인트</h3> + <ul><li>… 섹션을 1회 추가 (필요할 때만)

## 금지
- iframe / img / script / style / class 속성 / 인라인 스타일 금지
- "최고", "유일한", "완벽한" 등 과장 표현 금지
- 의료 / 법률 / 효능 효과를 단정하는 표현 금지 (예: "치료된다", "보장된다")
- 출처 미상의 통계 / 수치 인용 금지
- 본문 외 메타 설명("이 글은…", "다음 강의는…") 금지

## 형식 예시 (참고용 — 실제 출력은 주제에 맞게)
<h2>레슨 제목</h2>
<p>도입 단락…</p>
<h3>핵심 개념</h3>
<ul><li>…</li><li>…</li></ul>
<p>설명 단락…</p>
<h3>실무 적용 포인트</h3>
<ul><li>…</li><li>…</li></ul>

HTML 만 반환하세요. 다른 텍스트나 코드블록 표시는 포함하지 마세요.`;
}

router.post('/lesson-body', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const {
    courseTitle = '',
    lessonTitle,
    lessonSummary = '',
    tone = 'professional',
    audience = 'instructor',
  } = req.body as {
    courseTitle?: string;
    lessonTitle?: string;
    lessonSummary?: string;
    tone?: string;
    audience?: string;
  };

  if (!lessonTitle || typeof lessonTitle !== 'string' || lessonTitle.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'lessonTitle 이 필요합니다.' });
  }

  const requestId = crypto.randomUUID();

  try {
    const userPrompt = [
      `다음 레슨의 본문 HTML 초안을 작성하세요.`,
      '',
      courseTitle ? `강의명: ${courseTitle.trim()}` : '',
      `레슨 제목: ${lessonTitle.trim()}`,
      lessonSummary ? `레슨 요약: ${lessonSummary.trim()}` : '',
    ].filter(Boolean).join('\n');

    logger.info('[lesson-body] 시작', { requestId, userId, lessonTitle: lessonTitle.slice(0, 60) });

    const aiResponse = await aiProxyService.generateRawContent(
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt: buildLessonBodySystemPrompt(tone, audience),
        userPrompt,
        temperature: 0.6,
        maxTokens: 4096,
      },
      userId,
      requestId,
    );

    let rawText: string = (aiResponse.rawText || '').trim();
    // 혹시 codeblock 으로 감싸면 제거
    const codeblockMatch = rawText.match(/^```(?:html)?\s*([\s\S]*?)```$/);
    if (codeblockMatch) rawText = codeblockMatch[1].trim();

    // 최소 검증 — 빈 응답 또는 너무 짧음
    if (rawText.length < 80) {
      logger.warn('[lesson-body] 응답이 너무 짧음', { requestId, length: rawText.length });
      return res.status(500).json({
        success: false,
        error: 'AI 응답이 너무 짧습니다. 다시 시도해 주세요.',
        requestId,
      });
    }

    // HTML 외 위험 태그 / 속성 제거 (간단 sanitize — script/style/iframe/on*/class)
    const safeHtml = rawText
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<(\w+)([^>]*?)\son\w+="[^"]*"([^>]*?)>/gi, '<$1$2$3>')
      .replace(/<(\w+)([^>]*?)\sclass="[^"]*"([^>]*?)>/gi, '<$1$2$3>');

    logger.info('[lesson-body] 완료', { requestId, userId, length: safeHtml.length });
    return res.json({ success: true, html: safeHtml, requestId });
  } catch (error: any) {
    logger.error('[lesson-body] 오류', { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || '레슨 본문 생성 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

export default router;

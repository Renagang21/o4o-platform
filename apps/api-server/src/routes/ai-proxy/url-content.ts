import logger from '../../utils/logger.js';
import { parse as parseHtml, type HTMLElement as NodeHtmlElement } from 'node-html-parser';
import { isYouTubeUrl, fetchYouTubeContent, fetchYouTubeOEmbed } from './youtube-fetcher.js';



// WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1: POST /api/ai/qr-description(QR 전용 Gemini 설명 생성, WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1)
//   은퇴 — 유일 consumer(KPA StoreQrAiDescriptionPage)가 외부 LLM(ChatGPT로 작업) 경로로 대체됨. prompt 모듈 qrDescription.ts 도 제거.
//   기존 저장 데이터의 content_json.aiDescription 은 read 경로(store-qr.service · store-library-feed)에서 그대로 읽는다.

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
export const URL_EXTRACT_MAX_CHARS = 6000;


/**
 * URL에서 텍스트 추출 (서버사이드 fetch + HTML 스트리핑)
 *
 * WO-O4O-AI-URL-TO-BLOCKS-YOUTUBE-SUPPORT-V1:
 *   YouTube URL 은 SPA 라 단순 fetch 로 콘텐츠 추출 불가 →
 *   별도 oEmbed + transcript 경로(fetchYouTubeContent) 우선 사용,
 *   결과가 부실하면(50자 미만) 일반 fetch 로 폴백.
 */
export async function fetchUrlText(url: string): Promise<string> {
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
// WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1 ─────────────────────────────────
// 이용조건 감지 Core. AI 생성 중단 금지. 감지 → 안내만.
// ─────────────────────────────────────────────────────────────────────────────

export interface UsageWarning {
  detected: boolean;
  categories: string[];   // 사용자 친화 카테고리 레이블
  snippets: string[];     // 원문 표현 (AI 재해석 없이 그대로)
}


export const USAGE_CONDITION_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  {
    category: '저작자 표시 관련 표현',
    patterns: [/저작자\s*(명시|표시)/, /출처\s*(명시|표시|표기)/],
  },
  {
    category: '영리적 이용 제한 관련 표현',
    patterns: [/영리적?\s*(사용|이용)\s*(불가|금지|제한)/, /비영리\s*한정/],
  },
  {
    category: '내용 변경 제한 관련 표현',
    patterns: [/내용\s*변경\s*(불가|금지)/, /변경\s*(금지|불가)/, /개작\s*(금지|불가)/],
  },
  {
    category: '복제·재배포 제한 관련 표현',
    patterns: [/무단\s*(복제|전재|배포|게시|도용)/, /재배포\s*(금지|불가)/, /무단\s*사용\s*금지/],
  },
  {
    category: '저작권 표시 관련 표현',
    patterns: [/copyright\s*(©|\(c\)|\d{4})/i, /all\s*rights?\s*reserved/i, /©\s*\d{4}/],
  },
  {
    category: 'Creative Commons 라이선스 표현',
    patterns: [/\bcc\s*by(-sa|-nd|-nc)?\b/i, /creative\s*commons/i, /creativecommons\.org/i],
  },
];


export function detectUsageConditions(rawText: string): UsageWarning {
  const categories: string[] = [];
  const snippets: string[] = [];

  for (const { category, patterns } of USAGE_CONDITION_PATTERNS) {
    for (const re of patterns) {
      const m = rawText.match(re);
      if (m) {
        if (!categories.includes(category)) categories.push(category);
        // 원문 표현: 매칭된 위치 앞뒤 20자 맥락
        const idx = rawText.indexOf(m[0]);
        const start = Math.max(0, idx - 10);
        const end = Math.min(rawText.length, idx + m[0].length + 10);
        const snippet = rawText.slice(start, end).replace(/\s+/g, ' ').trim();
        if (!snippets.includes(snippet)) snippets.push(snippet);
        break; // 카테고리당 첫 매칭만
      }
    }
  }

  return { detected: categories.length > 0, categories, snippets };
}


export interface UrlContent { text: string; title?: string; usageWarning?: UsageWarning }


// WO-O4O-AI-URL-NAVER-BLOG-IFRAME-POSTVIEW-EXTRACTOR-V1
export function isNaverBlogUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'blog.naver.com' || hostname === 'm.blog.naver.com';
  } catch {
    return false;
  }
}


// WO-O4O-AI-URL-NAVER-BLOG-POLICY-FOOTER-CLEANUP-V1:
//   lazy regex는 se-main-container 첫 자식 div에서 조기 종료 → 50자 미만 → 전체 fallback.
//   div depth counter로 실제 닫는 태그를 찾아 전체 블록을 정확히 추출.
// WO-O4O-AI-NAVER-BLOG-ROBUST-CONTAINER-PARSER-FIX-V1
// 네이버 블로그 PostView HTML에서 실제 게시글 본문 추출 — 견고한 HTML parser 기반.
// 기존 naive depth-counter 방식은 SE component 내부의 script/comment/raw text 때문에
// 조기 종료되어 본문을 놓쳤음 (IR-O4O-AI-NAVER-BLOG-POSTVIEW-HTML-STRUCTURE-AUDIT-V1 참조).
// — 4-tier fallback 순서는 유지: contentCandidates(≥100자) → lenientContent(≥50자) → wrapper(≥50자) → 전체 텍스트.
// — Generic URL extractor에는 영향 없음 (이 함수는 네이버 전용 경로에서만 호출됨).
export function extractNaverBlogText(html: string): string {
  // CCL 블록 이전까지만 분석 — footer 오염 원천 차단 (parser 입력에서도 동일 정책 유지)
  const cclIdx = html.search(/<div[^>]+class="[^"]*blog_ccl[^"]*"/i);
  const workHtml = cclIdx > 200 ? html.slice(0, cclIdx) : html;

  // HTML parse — 실패 시 전체 stripHtml로 안전 fallback
  let root: NodeHtmlElement;
  try {
    root = parseHtml(workHtml, { comment: false, blockTextElements: { script: false, noscript: false, style: false, pre: true } });
  } catch (parseError: any) {
    logger.warn('[NAVER_PARSER_ERROR]', { error: parseError?.message });
    return stripHtml(workHtml);
  }

  // script/style/noscript 노드 제거 후 text 추출 — head meta·iframe 내부 JS 잡음 차단
  for (const el of root.querySelectorAll('script, style, noscript')) {
    el.remove();
  }

  // 소개문 라인 trim (WO-O4O-AI-URL-NAVER-BLOG-CANDIDATE-SELECTION-FIX-V1 유지)
  const NAVER_INTRO_LINE_RE = /^이\s*블로그(는|의)?\s+\S+[^\n]*\n+/;
  const trimIntroLine = (t: string): string => t.replace(NAVER_INTRO_LINE_RE, '').trim();

  type Probed = { selector: string; hit: boolean; rawLen: number; text: string };
  const collectProbes = (selectors: string[]): Probed[] =>
    selectors.map((sel) => {
      const el = root.querySelector(sel);
      if (!el) return { selector: sel, hit: false, rawLen: 0, text: '' };
      const text = trimIntroLine(el.text.trim());
      return { selector: sel, hit: true, rawLen: el.outerHTML.length, text };
    });
  const logProbes = (logKey: string, probes: Probed[]) => {
    logger.info(logKey, {
      probes: probes.map((p) => ({
        selector: p.selector,
        hit: p.hit,
        rawLen: p.rawLen,
        textLen: p.text.length,
        sample: p.text.slice(0, 100),
      })),
    });
  };

  // content-only selectors — SmartEditor / 구형 에디터 본문 컨테이너 (페이지 wrapper 아님)
  const contentProbes = collectProbes(['.se-main-container', '.se-component-wrap', '.post-view', '.post_body']);
  logProbes('[NAVER_PARSER_PROBE_CLASS]', contentProbes);

  const contentCandidates = contentProbes.map((p) => p.text).filter((t) => t.length >= 100);
  if (contentCandidates.length > 0) {
    const selected = contentCandidates.reduce((a, b) => (a.length >= b.length ? a : b));
    logger.info('[NAVER_FINAL_SELECTION]', {
      source: 'contentCandidates',
      selectedTextLength: selected.length,
      selectedTextSample: selected.slice(0, 300),
    });
    return selected;
  }

  const lenientContent = contentProbes.map((p) => p.text).filter((t) => t.length >= 50);
  if (lenientContent.length > 0) {
    const selected = lenientContent.reduce((a, b) => (a.length >= b.length ? a : b));
    logger.info('[NAVER_FINAL_SELECTION]', {
      source: 'lenientContent',
      selectedTextLength: selected.length,
      selectedTextSample: selected.slice(0, 300),
    });
    return selected;
  }

  // wrapper fallback — postViewArea / viewTypeSelector 는 페이지 전체 wrapper (최후 수단)
  const wrapperProbes = collectProbes(['#postViewArea', '#viewTypeSelector']);
  logProbes('[NAVER_PARSER_PROBE_ID]', wrapperProbes);

  const wrapperCandidates = wrapperProbes.map((p) => p.text).filter((t) => t.length >= 50);
  if (wrapperCandidates.length > 0) {
    const selected = wrapperCandidates.reduce((a, b) => (a.length >= b.length ? a : b));
    logger.info('[NAVER_FINAL_SELECTION]', {
      source: 'wrapperCandidates',
      selectedTextLength: selected.length,
      selectedTextSample: selected.slice(0, 300),
    });
    return selected;
  }

  // 최종 fallback — root.text (이미 script/style 제거됨)
  const fallback = trimIntroLine(root.text.trim());
  logger.info('[NAVER_FINAL_SELECTION]', {
    source: 'parserFullText',
    selectedTextLength: fallback.length,
    selectedTextSample: fallback.slice(0, 300),
  });
  return fallback;
}


export async function fetchNaverBlogContent(url: string): Promise<UrlContent> {
  // WO-O4O-AI-NAVER-BLOG-POSTVIEW-SILENT-FALLBACK-FIX-V1:
  //   iframe context 모방을 위해 Referer로 사용할 blog 첫 페이지 URL 추출.
  //   blog.naver.com/{blogId}/{logNo} 또는 m.blog.naver.com/{blogId}/... 모두 매칭.
  const blogIdMatch = url.match(/blog\.naver\.com\/([^/?#]+)/i);
  const refererBase = blogIdMatch ? `https://blog.naver.com/${blogIdMatch[1]}` : 'https://blog.naver.com/';

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
      // WO-O4O-AI-NAVER-BLOG-POSTVIEW-SILENT-FALLBACK-FIX-V1:
      //   Referer 헤더 추가 — Naver PostView는 iframe context에서 로드되므로
      //   blog 첫 페이지 URL을 Referer로 모방하여 GCP IP 차단/리디렉션 가능성 완화.
      const postViewFetchOpts = {
        headers: {
          ...fetchOpts.headers,
          'Referer': refererBase,
        },
        signal: ctrl2.signal,
      };
      const res2 = await fetch(postViewUrl, postViewFetchOpts);
      if (res2.ok) {
        postViewHtml = await res2.text();
        resolvedTitle = extractHtmlTitle(postViewHtml) || resolvedTitle;
        // WO-O4O-AI-NAVER-BLOG-POSTVIEW-SILENT-FALLBACK-FIX-V1:
        //   운영 관측 — 성공 케이스의 응답 메타데이터 기록.
        //   비정상적으로 짧은 body (e.g. login redirect) 추적 목적.
        logger.info('[NAVER_POSTVIEW_FETCH_OK]', {
          status: res2.status,
          finalUrl: res2.url,
          redirected: res2.redirected,
          contentType: res2.headers.get('content-type'),
          bodyLength: postViewHtml.length,
        });
      } else {
        // WO-O4O-AI-NAVER-BLOG-POSTVIEW-SILENT-FALLBACK-FIX-V1:
        //   silent fallback 제거 — !res2.ok 시 warn + degraded mode.
        //   Cloud Run GCP IP에서 PostView 차단/리디렉션 여부 관측.
        //   postViewHtml은 firstHtml로 유지 (기존 동작 보존, observable degradation).
        logger.warn('[NAVER_POSTVIEW_FETCH_FAIL]', {
          status: res2.status,
          statusText: res2.statusText,
          contentType: res2.headers.get('content-type'),
          contentLength: res2.headers.get('content-length'),
          finalUrl: res2.url,
          requestedUrl: postViewUrl.slice(0, 200),
          redirected: res2.redirected,
          referer: refererBase,
        });
      }
    } catch (postViewError: any) {
      // WO-O4O-AI-NAVER-BLOG-POSTVIEW-SILENT-FALLBACK-FIX-V1:
      //   네트워크 오류 / abort / timeout 등 fetch 자체 실패 시에도 silent 금지.
      logger.warn('[NAVER_POSTVIEW_FETCH_ERROR]', {
        error: postViewError?.message,
        name: postViewError?.name,
        requestedUrl: postViewUrl.slice(0, 200),
        referer: refererBase,
      });
    } finally {
      clearTimeout(t2);
    }
  }

  // WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1: CCL 차단 전 전체 HTML로 감지 (cleanup 후엔 이미 제거됨)
  const usageWarning = detectUsageConditions(postViewHtml);
  const text = extractNaverBlogText(postViewHtml).slice(0, URL_EXTRACT_MAX_CHARS);
  return { text, title: resolvedTitle, usageWarning };
}


export async function fetchUrlContent(url: string): Promise<UrlContent> {
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
      // WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1: stripHtml 전 raw HTML로 감지
      return {
        text: stripHtml(rawText),
        title: extractHtmlTitle(rawText),
        usageWarning: detectUsageConditions(rawText),
      };
    }
    return { text: rawText, usageWarning: detectUsageConditions(rawText) };
  } finally {
    clearTimeout(timeoutId);
  }
}


/** HTML 엔티티 기본 디코딩 (제목 추출용 짧은 텍스트 한정) */
export function decodeBasicHtmlEntities(s: string): string {
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
 * meta 태그는 기존 HTML parser로 읽고 attribute 순서와 기본 entity 정책을 유지한다.
 * 실패 시 undefined — 호출 측에서 blocks 기반 fallback 으로 넘긴다.
 */
export function extractHtmlTitle(html: string): string | undefined {
  const root = parseHtml(html, {
    blockTextElements: { script: true, style: true, pre: true, title: true },
  });
  // 1. <title>...</title>
  const titleTag = root.querySelector('title');
  if (titleTag && /<\/title>/i.test(html)) {
    const cleaned = decodeBasicHtmlEntities(
      removeHtmlTags(titleTag.innerHTML, '').replace(/\s+/g, ' ').trim(),
    );
    if (cleaned) return cleaned.slice(0, 200);
  }

  // 2. og:title (property=og:title content="...")
  const metadata = root.querySelectorAll('meta');
  const og = readMetadataTitle(metadata, 'property', 'og:title');
  if (og) {
    const cleaned = decodeBasicHtmlEntities(og.trim());
    if (cleaned) return cleaned.slice(0, 200);
  }

  // 3. twitter:title (name=twitter:title content="...")
  const tw = readMetadataTitle(metadata, 'name', 'twitter:title');
  if (tw) {
    const cleaned = decodeBasicHtmlEntities(tw.trim());
    if (cleaned) return cleaned.slice(0, 200);
  }

  return undefined;
}

/** Keep raw entity values and the existing marker-before-content preference. */
function readMetadataTitle(nodes: NodeHtmlElement[], field: string, marker: string): string | undefined {
  let contentFirst: string | undefined;
  for (const node of nodes) {
    const entries = Object.entries(node.rawAttributes);
    const markerIndex = entries.findIndex(([key, value]) =>
      key.toLowerCase() === field && typeof value === 'string' && value.toLowerCase() === marker);
    const contentIndex = entries.findIndex(([key, value]) =>
      key.toLowerCase() === 'content' && typeof value === 'string' && value.length > 0);
    if (markerIndex < 0 || contentIndex < 0) continue;
    const content = entries[contentIndex][1];
    if (markerIndex < contentIndex) return content;
    contentFirst ??= content;
  }
  return contentFirst;
}


/**
 * AI 가 생성한 blocks 에서 fallback 제목 도출.
 *
 * 우선순위 (WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1):
 *   5. 첫 o4o/heading content
 *   6. 첫 o4o/paragraph 의 첫 문장 (또는 앞 40자)
 */
export function deriveTitleFromBlocks(blocks: Array<{ type?: string; content?: string }>): string | undefined {
  const stripTags = (s: string) => removeHtmlTags(s, '').replace(/\s+/g, ' ').trim();

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


/** Match the existing nonempty <...> stripping rule in a single forward scan. */
function removeHtmlTags(html: string, replacement: string): string {
  const parts: string[] = [];
  let cursor = 0;
  let start = html.indexOf('<');
  while (start !== -1) {
    const end = html.indexOf('>', start + 1);
    // An unclosed suffix stays as source text; never scan it again.
    if (end === -1) break;
    if (end > start + 1) {
      parts.push(html.slice(cursor, start), replacement);
      cursor = end + 1;
    }
    start = html.indexOf('<', end + 1);
  }
  parts.push(html.slice(cursor));
  return parts.join('');
}

/**
 * HTML에서 의미있는 텍스트 추출
 * WO-O4O-AI-URL-CONTENT-QUALITY-V2: 노이즈 제거 강화
 */
export function stripHtml(html: string): string {
  // UI 노이즈 태그 전체 블록 제거 (nav/header/footer/aside/form/button/input/select)
  const noiseTagsRe = /<(nav|header|footer|aside|form|button|input|select|textarea|label|fieldset|dialog|menu|menuitem)[\s\S]*?<\/\1>/gi;

  const withoutNoise = html
    // script/style 블록 제거
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // UI 노이즈 태그 제거 (2회 반복: 중첩 대응)
    .replace(noiseTagsRe, ' ')
    .replace(noiseTagsRe, ' ')
    // 자기완결형 input/br/hr 제거
    .replace(/<(input|br|hr|img)[^>]*\/?>/gi, ' ')
    // 블록 태그를 줄바꿈으로
    .replace(/<\/(p|div|h[1-6]|li|br|tr|td|th|section|article)>/gi, '\n');
  // 나머지 태그 제거
  const cleaned = removeHtmlTags(withoutNoise, ' ')
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
  // WO-O4O-AI-URL-NAVER-BLOG-POLICY-FOOTER-CLEANUP-V1: CCL/소셜/저작권 다단어 패턴 추가 (범용 URL Core)
  const noisePatterns = [
    // 단독 단어 정확 매칭
    /^(로그인|회원가입|아이디\s*찾기|비밀번호\s*찾기|회원\s*등록|이용약관|개인정보|저작권|문의|고객센터)$/,
    /^(login|sign\s*up|register|contact|menu|quick\s*menu|subscribe|newsletter)$/i,
    /^(정보|보도자료|저작권|광고|개발자|약관|크리에이터|채널|구독|좋아요|댓글|공유)$/,
    /^(home|about|services|products|blog|news|events|careers|faq|sitemap)$/i,
    /^[\s|·•\-–—]+$/,  // 구분자만 있는 라인
    // CCL / 저작권 정책 문구 (부분 포함 매칭 — 어디 있든 제거)
    /저작자\s*명시/,
    /영리적?\s*사용\s*불가/,
    /내용\s*변경\s*불가/,
    /동일\s*조건\s*변경\s*허락/,
    /이\s*블로그의?\s*저작물/,
    /무단\s*(복제|전재|배포)/,
    /출처\s*(표기|명시)\s*필수/,
    /copyright\s*(©|\(c\)|\d{4})/i,
    /all\s*rights?\s*reserved/i,
    // 소셜 / 공유 버튼 영역
    /^(공유하기|스크랩|이웃\s*추가|공감\s*\d*|이\s*글에\s*공감)$/,
    /^댓글\s*(쓰기|입력|등록|\d+)$/,
    /^(카카오톡|트위터|페이스북|밴드|라인)\s*(공유|에\s*공유)$/,
    // 고객센터 / 운영 안내
    /고객센터\s*(문의|로\s*문의)/,
    /^(신고하기|차단하기|더\s*보기|접기|펼치기)$/,
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

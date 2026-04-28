/**
 * WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * 외부 상품 페이지 HTML → 구조화된 상품 정보 추출
 *
 * 전략:
 * - DOMParser로 안전한 DOM 생성 (live DOM 삽입 없음)
 * - 셀렉터 + 정규식 기반 heuristic 추출
 * - 설명 HTML은 태그 화이트리스트 sanitize
 * - 상대 URL → 절대 URL 변환 (sourceUrl 제공 시)
 */

import type { ParsedProductData } from './types';

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function parseProductHtml(
  html: string,
  sourceUrl?: string,
): ParsedProductData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const text = doc.body?.innerText ?? '';

  const imageUrls = extractImages(doc, sourceUrl);

  return {
    name: extractName(doc),
    brand: extractByLabel(text, '브랜드'),
    manufacturer: extractByLabel(text, '제��사'),
    price: extractPrice(text),
    specification: extractSpecification(text),
    originCountry: extractByLabel(text, '원산지'),
    thumbnailUrl: pickThumbnail(doc, imageUrls, sourceUrl),
    imageUrls,
    shortDescription: buildShortDescription(doc),
    detailDescription: extractDetailDescription(doc, sourceUrl),
  };
}

/* ------------------------------------------------------------------ */
/*  상품명 추출                                                         */
/* ------------------------------------------------------------------ */

function extractName(doc: Document): string | null {
  const candidates = [
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    doc.querySelector('[itemprop="name"]')?.textContent,
    doc.querySelector('h1')?.textContent,
    doc.querySelector('title')?.textContent,
  ];

  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed && trimmed.length > 1 && trimmed.length < 200) {
      return trimmed;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  이미지 추출                                                         */
/* ------------------------------------------------------------------ */

function extractImages(doc: Document, sourceUrl?: string): string[] {
  const srcs = new Set<string>();

  // og:image
  const ogImage = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute('content');
  if (ogImage) srcs.add(resolveUrl(ogImage, sourceUrl));

  // itemprop image
  const itemImage = doc
    .querySelector('[itemprop="image"]')
    ?.getAttribute('src') ??
    doc.querySelector('[itemprop="image"]')?.getAttribute('content');
  if (itemImage) srcs.add(resolveUrl(itemImage, sourceUrl));

  // All img tags
  const imgs = doc.querySelectorAll('img');
  for (const img of imgs) {
    const src =
      img.getAttribute('data-src') ??
      img.getAttribute('data-original') ??
      img.getAttribute('src');
    if (!src) continue;

    const resolved = resolveUrl(src, sourceUrl);

    // 필터: 로고, 아이콘, 트래킹 픽셀, base64
    if (isIgnorableImage(resolved)) continue;

    srcs.add(resolved);
  }

  return Array.from(srcs);
}

function isIgnorableImage(src: string): boolean {
  const lower = src.toLowerCase();
  return (
    lower.includes('logo') ||
    lower.includes('icon') ||
    lower.includes('sprite') ||
    lower.includes('blank.') ||
    lower.includes('pixel') ||
    lower.includes('spacer') ||
    lower.includes('banner_ad') ||
    lower.startsWith('data:') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg')
  );
}

function pickThumbnail(
  doc: Document,
  images: string[],
  sourceUrl?: string,
): string | null {
  // 1) og:image
  const ogImage = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute('content');
  if (ogImage) return resolveUrl(ogImage, sourceUrl);

  // 2) itemprop image
  const itemImage = doc
    .querySelector('[itemprop="image"]')
    ?.getAttribute('src') ??
    doc.querySelector('[itemprop="image"]')?.getAttribute('content');
  if (itemImage) return resolveUrl(itemImage, sourceUrl);

  // 3) 첫 번째 이미지
  return images[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  가격 추출                                                           */
/* ------------------------------------------------------------------ */

function extractPrice(text: string): number | null {
  // 패턴: "15,000원", "₩15,000", "15000 원"
  const patterns = [
    /([\d,]+)\s*원/,
    /₩\s*([\d,]+)/,
    /(\d{1,3}(?:,\d{3})+)\s*(?:원|₩)/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const num = parseInt(m[1].replace(/,/g, ''), 10);
      if (num > 0 && num < 100_000_000) return num;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  규격 추출                                                           */
/* ------------------------------------------------------------------ */

function extractSpecification(text: string): string | null {
  const patterns = [
    /(\d+\s?(?:mg|ml|g|mL|㎎|㎖))\s?[×xX*]\s?\d+\s?(?:정|캡슐|포|개|매|봉|병)/i,
    /(\d+\s?(?:mg|ml|g|mL))\s?[×xX*]\s?\d+/i,
    /(?:용량|규격|내용량)\s*[:：]?\s*([^\n]{3,30})/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].trim();
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  레이블 기반 추출 (브랜드, 제조사, 원산지)                               */
/* ------------------------------------------------------------------ */

// 레이아웃/네비게이션에서 온 쓰레기 값 패턴
const JUNK_REGEXPS = [/={3,}/, /[-─━]{3,}/];
const JUNK_KEYWORDS = [
  'navigation', 'header', 'footer', 'menu', 'html_header', 'html_footer',
  'gnb', 'lnb', 'sitemap', '네비게이션', '메뉴', 'start', 'end',
];

function cleanExtractedValue(value: string | null): string | null {
  if (!value) return null;
  if (JUNK_REGEXPS.some((r) => r.test(value))) return null;
  const lower = value.toLowerCase();
  if (JUNK_KEYWORDS.some((kw) => lower.includes(kw))) return null;
  return value;
}

function extractByLabel(text: string, label: string): string | null {
  const re = new RegExp(`${label}\\s*[:：]?\\s*([^\\n]{1,60})`);
  const m = text.match(re);
  const raw = m?.[1]?.trim() ?? null;
  return cleanExtractedValue(raw);
}

/* ------------------------------------------------------------------ */
/*  설명 추출 + sanitize                                                */
/* ------------------------------------------------------------------ */

const DETAIL_SELECTORS = [
  '#detail',
  '.detail',
  '.product-detail',
  '#prdDetail',
  '.product-description',
  '[itemprop="description"]',
  '.goods_description',
  '#goods_description',
  '.item_detail',
  '#item_detail',
];

function extractDetailDescription(
  doc: Document,
  sourceUrl?: string,
): string | null {
  for (const sel of DETAIL_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el && el.innerHTML.length > 200) {
      return sanitizeHtml(el.innerHTML, sourceUrl);
    }
  }

  // fallback: body에서 가장 긴 div
  const divs = Array.from(doc.querySelectorAll('div'));
  let longest: Element | null = null;
  let maxLen = 0;
  for (const d of divs) {
    if (d.innerHTML.length > maxLen && d.innerHTML.length > 500) {
      maxLen = d.innerHTML.length;
      longest = d;
    }
  }
  if (longest) return sanitizeHtml(longest.innerHTML, sourceUrl);

  return null;
}

function buildShortDescription(doc: Document): string | null {
  // og:description
  const ogDesc = doc
    .querySelector('meta[property="og:description"]')
    ?.getAttribute('content');
  if (ogDesc && ogDesc.trim().length > 10) {
    return `<p>${escapeHtml(ogDesc.trim())}</p>`;
  }

  // meta description
  const metaDesc = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute('content');
  if (metaDesc && metaDesc.trim().length > 10) {
    return `<p>${escapeHtml(metaDesc.trim())}</p>`;
  }

  // 첫 200자 텍스트
  const text = doc.body?.innerText ?? '';
  if (text.length > 10) {
    return `<p>${escapeHtml(text.slice(0, 200).trim())}</p>`;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  HTML Sanitizer (화이트리스트 방식)                                    */
/* ------------------------------------------------------------------ */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'a',
  'div', 'span',
  'blockquote',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  img: new Set(['src', 'alt', 'width', 'height']),
  a: new Set(['href', 'title']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

function sanitizeHtml(html: string, sourceUrl?: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="__root">${html}</div>`,
    'text/html',
  );
  const root = doc.getElementById('__root');
  if (!root) return '';

  sanitizeNode(root, sourceUrl);
  return root.innerHTML;
}

function sanitizeNode(node: Element, sourceUrl?: string): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        // 허용되지 않는 태그 → 자식만 보존
        if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
          el.remove();
          continue;
        }
        // 자식 노드를 부모로 올림
        while (el.firstChild) {
          node.insertBefore(el.firstChild, el);
        }
        el.remove();
        continue;
      }

      // 허용 속성만 남김
      const allowedSet = ALLOWED_ATTRS[tag] ?? new Set<string>();
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (!allowedSet.has(attr.name)) {
          el.removeAttribute(attr.name);
        }
      }

      // img src 상대→절대 변환
      if (tag === 'img' && sourceUrl) {
        const src = el.getAttribute('src');
        if (src) {
          el.setAttribute('src', resolveUrl(src, sourceUrl));
        }
      }

      // a href 상대→절대 변환
      if (tag === 'a' && sourceUrl) {
        const href = el.getAttribute('href');
        if (href) {
          el.setAttribute('href', resolveUrl(href, sourceUrl));
        }
      }

      sanitizeNode(el, sourceUrl);
    } else {
      // 기타 노드 (comment 등) 제거
      child.remove();
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Utils                                                              */
/* ------------------------------------------------------------------ */

function resolveUrl(url: string, baseUrl?: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (!baseUrl) return url;

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Firstmall 관리자 상품 수정 페이지 HTML → 구조화된 상품 정보 추출
 *
 * WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1
 *
 * 공급자가 "자신이 운영하는" Firstmall 쇼핑몰 관리자 상품 수정 페이지의 HTML 을
 * 붙여넣거나 파일로 불러와, 등록에 필요한 필드만 브라우저에서 추출한다.
 *
 * 원칙:
 * - 브라우저 DOMParser 로 구조 분석만 (script 실행 없음, live DOM 삽입 없음)
 * - 관리자 전용/인증/주문 정보는 읽지 않는다 (허용 필드 화이트리스트만)
 * - 원문 HTML 은 서버로 전송하지 않는다 (선택 이미지 URL 만 별도 복사 요청)
 * - 상대 이미지 URL 은 쇼핑몰 도메인 기준으로 절대화
 */

import type { FirstmallAdminProduct, FirstmallSubInfo } from './types';

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param html        관리자 상품 수정 페이지 HTML 전체
 * @param shopDomain  사용자가 입력한 자사 쇼핑몰 주소(선택) — 상대 URL 절대화 기준 우선
 */
export function parseFirstmallAdmin(
  html: string,
  shopDomain?: string,
): FirstmallAdminProduct {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const warnings: string[] = [];

  // 도메인: 사용자 입력 > HTML 감지 (상대 /data/... 절대화 기준)
  const detected = detectShopBase(html);
  const base = normalizeBase(shopDomain) || detected;
  if (!base) {
    warnings.push('쇼핑몰 주소를 찾지 못했습니다. 이미지가 표시되지 않으면 쇼핑몰 주소를 직접 입력해 주세요.');
  }

  const goodsSeq = matchGoodsSeq(html);
  const name = inputValue(doc, 'goodsName');
  const summary = inputValue(doc, 'summary');
  const keyword = inputValue(doc, 'keyword');

  // 직접입력 추가정보 (subInfoTitle[] ↔ subInfoDesc[] pair) — 제조사/원산지 등 도출
  const subInfo = extractSubInfo(doc);
  const manufacturer = findByLabel(subInfo, ['제조사', '생산자', '제조원', '판매원']);
  const originCountry = findByLabel(subInfo, ['원산지', '원산국']);

  // 상품(대표/갤러리) 이미지 — Firstmall 표준 이미지 필드
  const productImageUrls = dedupe(
    collectArrayInputs(doc, [
      'viewGoodsImage[]',
      'largeGoodsImage[]',
      'list1GoodsImage[]',
      'list2GoodsImage[]',
      'thumbViewGoodsImage[]',
      'thumbScrollGoodsImage[]',
      'thumbCartGoodsImage[]',
    ])
      .map((u) => resolveUrl(u, base))
      .filter(Boolean),
  );

  // 상세설명 HTML — 우선순위대로 첫 비어있지 않은 소스 1개만
  const rawDetail = pickDetailHtml(doc);
  const detailHtml = rawDetail ? sanitizeDetailHtml(rawDetail, base) : null;
  const detailImageUrls = rawDetail ? extractDetailImages(rawDetail, base) : [];

  if (!name) warnings.push('상품명(goodsName)을 찾지 못했습니다. Firstmall 관리자 상품 수정 페이지 HTML 이 맞는지 확인해 주세요.');

  return {
    goodsSeq,
    name,
    summary,
    keyword,
    manufacturer,
    originCountry,
    subInfo,
    productImageUrls,
    detailHtml,
    detailImageUrls,
    shopDomain: base,
    warnings,
  };
}

/** 붙여넣은/불러온 HTML 이 Firstmall 관리자 상품 페이지로 보이는지 (UX 가드용) */
export function looksLikeFirstmallAdmin(html: string): boolean {
  return (
    /name=["']goodsName["']/.test(html) &&
    (/mobile_contents_hidden|pc_contents_hidden|geditor_/.test(html) || /GoodsImage\[\]/.test(html))
  );
}

/* ------------------------------------------------------------------ */
/*  Field helpers                                                      */
/* ------------------------------------------------------------------ */

function inputValue(doc: Document, name: string): string | null {
  const el = doc.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
  const v = el?.getAttribute('value') ?? (el as HTMLTextAreaElement | null)?.value;
  const t = v?.trim();
  return t ? t : null;
}

function collectArrayInputs(doc: Document, names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) {
    for (const el of doc.querySelectorAll(`input[name="${n}"]`)) {
      const v = el.getAttribute('value')?.trim();
      if (v) out.push(v);
    }
  }
  return out;
}

function extractSubInfo(doc: Document): FirstmallSubInfo[] {
  const titles = [...doc.querySelectorAll('input[name="subInfoTitle[]"]')].map(
    (e) => e.getAttribute('value')?.trim() ?? '',
  );
  const descs = [...doc.querySelectorAll('input[name="subInfoDesc[]"]')].map(
    (e) => e.getAttribute('value')?.trim() ?? '',
  );
  const out: FirstmallSubInfo[] = [];
  const n = Math.max(titles.length, descs.length);
  for (let i = 0; i < n; i++) {
    const label = titles[i] ?? '';
    const value = descs[i] ?? '';
    if (label || value) out.push({ label, value });
  }
  return out;
}

function findByLabel(pairs: FirstmallSubInfo[], labels: string[]): string | null {
  for (const p of pairs) {
    if (labels.some((l) => p.label.includes(l)) && p.value) return p.value;
  }
  return null;
}

function matchGoodsSeq(html: string): string | null {
  const m = html.match(/goods_seq["']?\s*[:=]\s*["']?(\d{1,12})/);
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ */
/*  Detail HTML                                                        */
/* ------------------------------------------------------------------ */

const DETAIL_SOURCES = [
  'mobile_contents_hidden',
  'mobile_contents',
  'mobile_contents_view',
  'geditor_mobile_contents_view',
];

function pickDetailHtml(doc: Document): string | null {
  for (const id of DETAIL_SOURCES) {
    const el = doc.getElementById(id) as HTMLTextAreaElement | HTMLElement | null;
    if (!el) continue;
    const raw = ('value' in el ? (el as HTMLTextAreaElement).value : null) ?? el.innerHTML ?? '';
    if (raw && raw.trim().length > 0) return raw;
  }
  return null;
}

function extractDetailImages(rawHtml: string, base: string | null): string[] {
  const doc = new DOMParser().parseFromString(`<div>${rawHtml}</div>`, 'text/html');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const img of doc.querySelectorAll('img')) {
    const src =
      img.getAttribute('src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-src') ||
      pickLargestSrcset(img.getAttribute('srcset'));
    if (!src) continue;
    const resolved = resolveUrl(src, base);
    if (!resolved || isIgnorableImage(resolved)) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}

function pickLargestSrcset(srcset: string | null): string | null {
  if (!srcset) return null;
  const entries = srcset.split(',').map((e) => e.trim().split(/\s+/)[0]).filter(Boolean);
  return entries.length ? entries[entries.length - 1] : null;
}

/** 관리자/테마 chrome 이미지 제외 (상세 본문 이미지는 /data/editor·/data/goods 등) */
function isIgnorableImage(src: string): boolean {
  const l = src.toLowerCase();
  if (l.startsWith('data:')) return true;
  if (l.endsWith('.svg')) return true;
  return ['logo', 'icon', 'sprite', 'blank.', 'pixel', 'spacer', 'btn_', '_btn', 'favicon', '/skin/', '/design/', '/admin/'].some(
    (kw) => l.includes(kw),
  );
}

/** 허용 태그/속성만 남기는 경량 sanitize — script/style/iframe 제거, img/a 절대화 */
function sanitizeDetailHtml(rawHtml: string, base: string | null): string {
  const doc = new DOMParser().parseFromString(`<div id="__r">${rawHtml}</div>`, 'text/html');
  const root = doc.getElementById('__r');
  if (!root) return '';
  root.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((e) => e.remove());
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || img.getAttribute('data-original') || img.getAttribute('data-src');
    if (src) img.setAttribute('src', resolveUrl(src, base) || src);
    img.removeAttribute('onerror');
    img.removeAttribute('onload');
  });
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href) a.setAttribute('href', resolveUrl(href, base) || href);
  });
  // 모든 on* 핸들러 제거
  root.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  });
  return root.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Domain / URL                                                       */
/* ------------------------------------------------------------------ */

/**
 * 관리자 HTML 에서 쇼핑몰 표시 도메인을 감지한다.
 * 네임스페이스(w3.org 등)·CDN·소셜·결제·Firstmall 인프라 도메인을 제외하고,
 * 가장 자주 등장하는 호스트를 자사 쇼핑몰 도메인으로 본다(예: 3lifezone.co.kr 66회).
 */
function detectShopBase(html: string): string | null {
  // 자사 쇼핑몰이 아닌(인프라/네임스페이스/CDN/소셜/결제) 호스트
  const blocked = [
    'w3.org', 'schema.org', 'purl.org', 'ogp.me', 'xmlns',
    'googleapis', 'gstatic', 'google.com', 'jsdelivr', 'cloudflare', 'jquery',
    'bootstrapcdn', 'fontawesome', 'kakaocdn', 'daumcdn', 'pstatic',
    'facebook', 'twitter', 'instagram', 'kakao', 'naver', 'daum', 'youtube',
    'payco', 'toss', 'geditor.co.kr',
  ];
  // Firstmall 인프라 서브도메인(자사 쇼핑몰의 firstmall 서브도메인은 허용)
  const fmInfra = /^(www|design|gmanual|cdn|img|image|static|errdoc|s|api)\.firstmall\.kr$/i;

  const isBlocked = (h: string) =>
    blocked.some((b) => h.includes(b)) || fmInfra.test(h) || h === 'firstmall.kr';

  // 호스트 빈도 집계
  const freq = new Map<string, number>();
  for (const m of html.matchAll(/https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) {
    const h = m[1].toLowerCase();
    if (isBlocked(h)) continue;
    freq.set(h, (freq.get(h) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestN = 0;
  for (const [h, n] of freq) {
    if (n > bestN) {
      best = h;
      bestN = n;
    }
  }
  if (best) {
    // 자사 firstmall 서브도메인은 http-only — 그 외 custom 도메인은 https 우선
    return best.endsWith('.firstmall.kr') ? `http://${best}` : `https://${best}`;
  }

  // fallback: krdomain = gl_protocol+'xxx.firstmall.kr'
  const kr = html.match(/krdomain\s*=\s*[^'"]*['"]([a-z0-9.-]+\.firstmall\.kr)['"]/i);
  if (kr && !fmInfra.test(kr[1])) return `http://${kr[1]}`;
  return null;
}

function normalizeBase(input?: string): string | null {
  if (!input) return null;
  const t = input.trim();
  if (!t) return null;
  try {
    if (/^https?:\/\//i.test(t)) return new URL(t).origin;
    return new URL(`https://${t}`).origin;
  } catch {
    return null;
  }
}

function resolveUrl(url: string, base: string | null): string {
  const u = url.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (!base) return ''; // 절대화 불가 → 제외 (미리보기/복사 불가)
  try {
    return new URL(u, base).href;
  } catch {
    return '';
  }
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

/**
 * Product Detail Contents Fetch Service
 *
 * WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-DYNAMIC-DETAIL-CONTENTS-DETECTION-V1
 *
 * Firstmall 계열(3lifezone 등) 상품 페이지는 상세설명 이미지를 기본 HTML 에 직접 두지 않고
 * 로딩 후 AJAX(`/goods/view_contents?no=...&zoom=1&view_preload=1`) 로 가져온다.
 * 이 서비스는 등록 도우미(import assistant) 가 탐지한 동적 상세설명 주소를
 * **서버에서 SSRF 안전 경로로** 조회하고, 응답 HTML 에서 상세설명 이미지 후보만 추출한다.
 *
 * 보안 (SSRF 방지):
 *  - http/https 프로토콜만 허용
 *  - localhost / private / link-local / loopback IP 차단 (호스트명 + DNS 해석 결과 모두 검사)
 *  - sourceUrl 제공 시 same-origin 으로 제한
 *  - timeout / 응답 크기 상한 적용
 *
 * 추출:
 *  - goods_view_contents 등 상세설명 컨테이너 내부 우선
 *  - img src / data-original / data-src / srcset 처리
 *  - 상대주소 → 절대주소 변환
 *  - 로고/아이콘/SNS/배너/썸네일/추적픽셀 제외
 */

import { JSDOM } from 'jsdom';
import dns from 'node:dns';
import net from 'node:net';
import logger from '../../../utils/logger.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FetchedDetailImageCandidate {
  /** 절대 URL */
  url: string;
  /** 추출에 사용한 원본 속성값 (resolve 이전) */
  originalUrl: string;
  /** img alt (없으면 null) */
  alt: string | null;
  /** width 속성(없으면 null) */
  width: number | null;
  /** height 속성(없으면 null) */
  height: number | null;
  /** 컨테이너 내 순서 (1-based) */
  order: number;
}

export interface FetchDetailContentsResult {
  /** 최종 조회한 절대 URL */
  fetchedUrl: string;
  /** 상세설명 컨테이너에서 추출했는지 (false = 문서 전체 fallback) */
  fromContainer: boolean;
  candidates: FetchedDetailImageCandidate[];
}

export class DetailFetchError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'DetailFetchError';
  }
}

/* ------------------------------------------------------------------ */
/*  Limits                                                             */
/* ------------------------------------------------------------------ */

const FETCH_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024; // 4MB
const CANDIDATE_LIMIT = 60;

/* ------------------------------------------------------------------ */
/*  SSRF Guard                                                         */
/* ------------------------------------------------------------------ */

/** IPv4/IPv6 문자열이 사설/루프백/링크로컬/예약 대역인지 검사 */
function isBlockedIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const parts = ip.split('.').map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
    // IPv4-mapped (::ffff:a.b.c.d) — 매핑된 IPv4 를 재검사
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  // IP 가 아니면 여기서 판단하지 않음 (호스트명은 DNS 해석 후 검사)
  return false;
}

/**
 * URL 을 검증하고 same-origin 제약을 적용한 뒤, 호스트명을 DNS 해석해
 * 해석된 모든 IP 가 안전한지 확인한다. (DNS rebinding 방지)
 */
async function assertSafeFetchUrl(rawUrl: string, sourceUrl?: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new DetailFetchError('INVALID_URL', '유효하지 않은 주소입니다.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new DetailFetchError('UNSUPPORTED_PROTOCOL', 'http/https 주소만 허용됩니다.');
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new DetailFetchError('BLOCKED_HOST', '내부 주소는 조회할 수 없습니다.');
  }

  // same-origin 제약 (sourceUrl 제공 시)
  if (sourceUrl) {
    let src: URL;
    try {
      src = new URL(sourceUrl);
    } catch {
      throw new DetailFetchError('INVALID_SOURCE_URL', '유효하지 않은 소스 주소입니다.');
    }
    if (src.origin !== parsed.origin) {
      throw new DetailFetchError('CROSS_ORIGIN', '상세설명 주소가 상품 페이지와 다른 사이트입니다.');
    }
  }

  // 호스트명이 곧바로 IP 인 경우
  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      throw new DetailFetchError('BLOCKED_IP', '내부/사설 IP 는 조회할 수 없습니다.');
    }
    return parsed;
  }

  // 도메인 → DNS 해석 후 모든 결과 IP 검사
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(host, { all: true });
  } catch {
    throw new DetailFetchError('DNS_FAILED', '주소를 확인할 수 없습니다.', 502);
  }
  if (addresses.length === 0) {
    throw new DetailFetchError('DNS_FAILED', '주소를 확인할 수 없습니다.', 502);
  }
  for (const addr of addresses) {
    if (isBlockedIp(addr.address)) {
      throw new DetailFetchError('BLOCKED_IP', '내부/사설 IP 로 해석되는 주소는 조회할 수 없습니다.');
    }
  }

  return parsed;
}

/* ------------------------------------------------------------------ */
/*  Fetch (timeout + size limit)                                       */
/* ------------------------------------------------------------------ */

async function fetchHtmlWithLimits(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // 일부 쇼핑몰은 UA/Accept 없으면 차단 — 일반 브라우저 헤더 모방
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch (e) {
    const err = e as Error;
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new DetailFetchError('TIMEOUT', '상세설명 원본 조회 시간이 초과되었습니다.', 504);
    }
    throw new DetailFetchError('FETCH_FAILED', '상세설명 원본을 가져오지 못했습니다.', 502);
  }

  if (!response.ok) {
    throw new DetailFetchError('UPSTREAM_ERROR', `상세설명 원본 응답 오류 (${response.status}).`, 502);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType && !/(text\/html|application\/xhtml|text\/plain)/i.test(contentType)) {
    throw new DetailFetchError('UNSUPPORTED_CONTENT_TYPE', 'HTML 응답이 아닙니다.', 415);
  }

  const declaredLen = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLen) && declaredLen > MAX_RESPONSE_BYTES) {
    throw new DetailFetchError('RESPONSE_TOO_LARGE', '상세설명 원본이 너무 큽니다.', 413);
  }

  // 스트림으로 읽으며 크기 상한 강제 (content-length 미신뢰)
  if (!response.body) {
    throw new DetailFetchError('EMPTY_RESPONSE', '빈 응답입니다.', 502);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch { /* noop */ }
        throw new DetailFetchError('RESPONSE_TOO_LARGE', '상세설명 원본이 너무 큽니다.', 413);
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
}

/* ------------------------------------------------------------------ */
/*  Detail image extraction (server-side jsdom)                        */
/* ------------------------------------------------------------------ */

/** 상세설명 컨테이너 후보 (Firstmall 및 일반 쇼핑몰) — 앞쪽일수록 우선 */
const DETAIL_CONTAINER_SELECTORS = [
  '.goods_view_contents',
  '#goods_view_contents',
  '.goods_description_images',
  '#prdDetail',
  '#detail',
  '.detail_explain',
  '.product-detail',
  '[itemprop="description"]',
];

function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return url;
  if (url.startsWith('//')) return `https:${url}`;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/** 로고/아이콘/SNS/배너/추적픽셀/벡터 등 상세 이미지가 아닐 가능성이 높은 src 제외 */
function isIgnorableImage(src: string): boolean {
  const lower = src.toLowerCase();
  if (lower.startsWith('data:')) return true;
  if (lower.endsWith('.svg')) return true;
  return [
    'logo', 'icon', 'sprite', 'blank.', 'pixel', 'spacer', 'banner_ad',
    '/sns', 'sns_', 'facebook', 'twitter', 'instagram', 'kakao', 'youtube',
    'btn_', '_btn', 'button', 'thumb', 'thumbnail', '/common/', 'favicon',
    'badge', 'arrow', 'bullet',
  ].some((kw) => lower.includes(kw));
}

function pickImgSrc(img: Element): string | null {
  const lazy =
    img.getAttribute('data-src') ||
    img.getAttribute('data-original') ||
    img.getAttribute('data-lazy-src') ||
    img.getAttribute('data-lazy');
  if (lazy && lazy.trim()) return lazy.trim();

  const src = img.getAttribute('src');
  if (src && src.trim() && !src.trim().startsWith('data:')) return src.trim();

  const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
  if (srcset) {
    const entries = srcset.split(',').map((e) => e.trim().split(/\s+/)[0]).filter(Boolean);
    if (entries.length > 0) return entries[entries.length - 1];
  }

  return src && src.trim() ? src.trim() : null;
}

function parseDimensionAttr(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value.replace(/px$/i, '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractCandidates(
  doc: Document,
  baseUrl: string,
): { candidates: FetchedDetailImageCandidate[]; fromContainer: boolean } {
  // 상세설명 컨테이너 우선 — img 가 있는 첫 컨테이너 선택
  let scope: Element | null = null;
  for (const sel of DETAIL_CONTAINER_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el && el.querySelectorAll('img').length > 0) {
      scope = el;
      break;
    }
  }
  const fromContainer = scope !== null;
  const root: ParentNode = scope ?? doc;

  const seen = new Set<string>();
  const candidates: FetchedDetailImageCandidate[] = [];

  for (const img of Array.from(root.querySelectorAll('img'))) {
    if (candidates.length >= CANDIDATE_LIMIT) break;

    const original = pickImgSrc(img);
    if (!original) continue;

    const resolved = resolveUrl(original, baseUrl);
    if (isIgnorableImage(resolved)) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);

    const width = parseDimensionAttr(img.getAttribute('width'));
    const height = parseDimensionAttr(img.getAttribute('height'));
    // 1×1 등 명백히 작은 추적/스페이서 제외 (확인 가능한 경우만)
    if (width !== null && height !== null && width <= 2 && height <= 2) continue;

    const alt = img.getAttribute('alt');
    candidates.push({
      url: resolved,
      originalUrl: original,
      alt: alt && alt.trim() ? alt.trim() : null,
      width,
      height,
      order: candidates.length + 1,
    });
  }

  return { candidates, fromContainer };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * 동적 상세설명 주소를 SSRF 안전 경로로 조회하고 상세 이미지 후보를 추출한다.
 * @param url        상세설명 원본 절대 URL (view_contents 등)
 * @param sourceUrl  상품 페이지 URL — 제공 시 same-origin 으로 제한
 */
export async function fetchDetailContents(
  url: string,
  sourceUrl?: string,
): Promise<FetchDetailContentsResult> {
  const safe = await assertSafeFetchUrl(url, sourceUrl);
  const html = await fetchHtmlWithLimits(safe.href);

  let doc: Document;
  try {
    doc = new JSDOM(html, { url: safe.href }).window.document;
  } catch (e) {
    logger.warn('[DetailFetch] jsdom parse failed:', e);
    throw new DetailFetchError('PARSE_FAILED', '상세설명 원본을 분석하지 못했습니다.', 502);
  }

  const { candidates, fromContainer } = extractCandidates(doc, safe.href);

  return { fetchedUrl: safe.href, fromContainer, candidates };
}

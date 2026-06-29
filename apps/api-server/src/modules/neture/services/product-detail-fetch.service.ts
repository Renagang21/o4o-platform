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
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';
import { MediaLibraryService } from '../../media/services/media-library.service.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FetchedDetailImageCandidate {
  /** 미리보기·삽입에 사용할 URL — copy 성공 시 O4O 저장소 https URL, 실패 시 원본 URL */
  url: string;
  /** 원본 상품 사이트의 이미지 절대 URL (resolve 후) */
  originalUrl: string;
  /** O4O 저장소(GCS)로 복사되었는지 — false 면 url 은 원본(미리보기 실패 가능) */
  copiedToStorage: boolean;
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
  /** 최종 조회한 절대 URL (redirect 추적 후) */
  fetchedUrl: string;
  /** 상세설명 컨테이너에서 추출했는지 (false = 문서 전체 fallback) */
  fromContainer: boolean;
  /** O4O 저장소로 복사된 이미지 수 */
  copiedCount: number;
  candidates: FetchedDetailImageCandidate[];
}

/**
 * 로그인/회원 전용 게이트로 redirect 되는 URL 패턴.
 * 일부 쇼핑몰(예: 3lifezone)은 비회원이 view_contents 조회 시 member_only/login 으로 보낸다.
 * 이 경우 게이트 페이지의 chrome 이미지를 상세 후보로 오인하지 않도록 명시적으로 거부한다.
 * (로그인·쿠키 우회는 하지 않는다 — 정책)
 */
const LOGIN_GATE_RE = /(member_only|members?_only|\/login|need_?login|needlogin|\/intro\/|auth\/login|signin|sign_in)/i;

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

// V2 (가져오기=복사): 추출 이미지를 O4O 저장소(GCS https)로 복사 — 원본 사이트 차단/변경/http 혼합콘텐츠 대응
const IMAGE_COPY_LIMIT = 40; // 한 번에 복사할 이미지 상한
const IMAGE_FETCH_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB/이미지
const ALLOWED_IMAGE_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;

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

async function fetchHtmlWithLimits(url: string): Promise<{ html: string; finalUrl: string }> {
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

  // 로그인/회원 전용 게이트로 redirect 된 경우 — 게이트 페이지 chrome 이미지 추출 방지.
  // (redirect 추적 후 최종 URL 이 로그인/회원 페이지면 거부. 로그인·쿠키 우회 안 함)
  const finalUrl = response.url || url;
  if (response.redirected && LOGIN_GATE_RE.test(finalUrl)) {
    throw new DetailFetchError(
      'LOGIN_REQUIRED',
      '이 상품 사이트는 비회원에게 상세설명을 제공하지 않습니다(로그인 전용). 로그인된 브라우저에서 상품 페이지를 직접 복사해 붙여넣어 주세요.',
      422,
    );
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
  return {
    html: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8'),
    finalUrl,
  };
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
    // Firstmall 등 쇼핑몰 테마 chrome 은 /data/skin/ 아래에 위치 — 상세 이미지는 /data/goods|editor 등
    '/skin/', '/design/', '/design_resp/',
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
      originalUrl: resolved,
      copiedToStorage: false,
      alt: alt && alt.trim() ? alt.trim() : null,
      width,
      height,
      order: candidates.length + 1,
    });
  }

  return { candidates, fromContainer };
}

/* ------------------------------------------------------------------ */
/*  V2: 이미지 O4O 저장소 복사 (가져오기=복사)                            */
/* ------------------------------------------------------------------ */

/**
 * 원본 이미지 URL → 다운로드(SSRF-safe, same-origin) → 공용 미디어 라이브러리(GCS https) 업로드
 * → O4O https URL 반환. 실패 시 null (호출부에서 원본 URL 유지). pageOrigin 으로 same-origin 강제.
 *
 * 저장은 editor 이미지 업로드와 동일한 MediaLibraryService(o4o-media-library 버킷, 공개)를 사용한다.
 */
async function copyImageToStorage(
  imageUrl: string,
  pageOrigin: string,
  mediaService: MediaLibraryService,
  userId: string,
): Promise<string | null> {
  try {
    // same-origin + private IP 차단 재검증 (페이지와 동일 사이트 이미지만 허용)
    const safe = await assertSafeFetchUrl(imageUrl, pageOrigin);

    let response: Response;
    try {
      response = await fetch(safe.href, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'image/*',
          Referer: pageOrigin,
        },
      });
    } catch {
      return null;
    }
    if (!response.ok) return null;

    let mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (mime === 'image/jpg') mime = 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME.test(mime)) return null;

    const declaredLen = Number(response.headers.get('content-length') ?? '');
    if (Number.isFinite(declaredLen) && declaredLen > MAX_IMAGE_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;

    const originalname = decodeURIComponent(safe.pathname.split('/').pop() || 'detail-image');
    const asset = await mediaService.upload(
      { buffer, originalname, mimetype: mime, size: buffer.length },
      userId,
      'neture',
      'description',
    );
    return asset.url;
  } catch (e) {
    logger.warn('[DetailFetch] image copy failed:', e);
    return null;
  }
}

/** 추출 후보를 순차로 O4O 미디어 라이브러리에 복사하고 url 을 교체한다. 반환: 복사 성공 개수. */
async function copyCandidatesToStorage(
  candidates: FetchedDetailImageCandidate[],
  pageOrigin: string,
  mediaService: MediaLibraryService,
  userId: string,
): Promise<number> {
  let copied = 0;
  for (const cand of candidates) {
    if (copied >= IMAGE_COPY_LIMIT) break;
    const o4oUrl = await copyImageToStorage(cand.originalUrl, pageOrigin, mediaService, userId);
    if (o4oUrl) {
      cand.url = o4oUrl;
      cand.copiedToStorage = true;
      copied++;
    }
  }
  return copied;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * 동적 상세설명 주소를 SSRF 안전 경로로 조회하고 상세 이미지 후보를 추출한다.
 * 추출 이미지는 O4O 저장소(GCS https)로 복사해 미리보기·삽입을 보장한다(가져오기=복사).
 * @param url        상세설명 원본 절대 URL (view_contents 등)
 * @param opts.sourceUrl  상품 페이지 URL — 제공 시 same-origin 으로 제한
 * @param opts.dataSource + opts.userId  제공 시 추출 이미지를 O4O 미디어 라이브러리로 복사.
 */
export async function fetchDetailContents(
  url: string,
  opts: { sourceUrl?: string; dataSource?: DataSource; userId?: string } = {},
): Promise<FetchDetailContentsResult> {
  const { sourceUrl, dataSource, userId } = opts;
  const safe = await assertSafeFetchUrl(url, sourceUrl);
  const { html, finalUrl } = await fetchHtmlWithLimits(safe.href);

  let doc: Document;
  try {
    doc = new JSDOM(html, { url: finalUrl }).window.document;
  } catch (e) {
    logger.warn('[DetailFetch] jsdom parse failed:', e);
    throw new DetailFetchError('PARSE_FAILED', '상세설명 원본을 분석하지 못했습니다.', 502);
  }

  const { candidates, fromContainer } = extractCandidates(doc, finalUrl);

  // 가져오기=복사: 추출 이미지를 O4O 미디어 라이브러리로 복사 (원본 사이트 의존 제거 + http 혼합콘텐츠 미리보기 문제 해결)
  let copiedCount = 0;
  if (dataSource && userId && candidates.length > 0) {
    const pageOrigin = new URL(finalUrl).origin;
    const mediaService = new MediaLibraryService(dataSource);
    copiedCount = await copyCandidatesToStorage(candidates, pageOrigin, mediaService, userId);
  }

  return { fetchedUrl: finalUrl, fromContainer, copiedCount, candidates };
}

/**
 * Product Import Image Copy Service
 *
 * WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1
 *   (이전 WO-...-DYNAMIC-DETAIL-CONTENTS-DETECTION-V1 의 공개페이지 server fetch 는 제거됨.
 *    SSRF 방어 + 이미지 복사 코드는 본인 쇼핑몰 이미지 복사에 재사용한다.)
 *
 * 공급자가 자사 관리자 HTML 에서 추출한 이미지 URL 을 O4O 미디어 라이브러리로 복사한다.
 * 관리자 HTML 원문은 받지 않으며(이미지 URL 만), 외부 페이지를 server 에서 fetch 하지 않는다.
 *
 * 보안 (SSRF 방지):
 *  - http/https 프로토콜만 허용
 *  - localhost / private / link-local / loopback / CGNAT / IPv4-mapped 차단
 *    (호스트명 + DNS 해석 결과 IP 모두 검사 — DNS rebinding 방지)
 *  - shopOrigin 제공 시 same-origin 으로 제한 (자사 쇼핑몰 이미지 한정)
 *  - 이미지별 timeout / 크기 상한 / mime 화이트리스트 / 개수 상한
 */

import dns from 'node:dns';
import net from 'node:net';
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';
import { MediaLibraryService } from '../../media/services/media-library.service.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** copyImages 결과 1건 */
export interface CopiedImageResult {
  originalUrl: string;
  /** 복사 성공 시 O4O https URL, 실패 시 null */
  url: string | null;
  ok: boolean;
  reason?: string;
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

const IMAGE_COPY_LIMIT = 60; // 한 번에 복사할 이미지 상한
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
async function assertSafeFetchUrl(rawUrl: string, sameOrigin?: string): Promise<URL> {
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

  // same-origin 제약 (제공 시) — 자사 쇼핑몰 이미지 한정
  if (sameOrigin) {
    let src: URL;
    try {
      src = new URL(sameOrigin);
    } catch {
      throw new DetailFetchError('INVALID_SOURCE_URL', '쇼핑몰 주소 형식이 올바르지 않습니다.');
    }
    if (src.origin !== parsed.origin) {
      throw new DetailFetchError('CROSS_ORIGIN', '이미지 주소가 쇼핑몰 도메인과 다릅니다.');
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
/*  Image copy (SSRF-safe download → MediaLibraryService 업로드)        */
/* ------------------------------------------------------------------ */

/**
 * 원본 이미지 URL → 다운로드(SSRF-safe, same-origin). 저장하지 않고 bytes+mime 만 반환.
 * 미리보기 프록시와 복사 업로드가 공유하는 단일 fetch 경로.
 */
async function fetchImageSafe(
  imageUrl: string,
  sameOrigin: string,
): Promise<{ buffer: Buffer; mime: string; filename: string } | { error: string }> {
  let safe: URL;
  try {
    safe = await assertSafeFetchUrl(imageUrl, sameOrigin);
  } catch (e) {
    return { error: e instanceof DetailFetchError ? e.code : 'unsafe_url' };
  }

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
        Referer: sameOrigin,
      },
    });
  } catch {
    return { error: 'fetch_error' };
  }
  if (!response.ok) return { error: `fetch_${response.status}` };

  let mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (mime === 'image/jpg') mime = 'image/jpeg';
  if (!ALLOWED_IMAGE_MIME.test(mime)) return { error: `bad_mime_${mime || 'none'}` };

  const declaredLen = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLen) && declaredLen > MAX_IMAGE_BYTES) return { error: 'too_large' };

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return { error: 'too_large' };

  const filename = decodeURIComponent(safe.pathname.split('/').pop() || 'image');
  return { buffer, mime, filename };
}

/**
 * 미리보기 프록시: 원본 이미지를 SSRF-safe 로 가져와 bytes 반환(저장 없음).
 * HTTPS Neture 화면에서 http 외부 이미지를 직접 표시하지 않기 위해 사용한다(혼합 콘텐츠 회피).
 */
export async function proxyImage(
  imageUrl: string,
  shopOrigin?: string,
): Promise<{ buffer: Buffer; mime: string }> {
  const constraint = shopOrigin || safeOriginOf(imageUrl);
  const r = await fetchImageSafe(imageUrl, constraint);
  if ('error' in r) {
    throw new DetailFetchError(r.error, '이미지 미리보기를 가져오지 못했습니다.', 502);
  }
  return { buffer: r.buffer, mime: r.mime };
}

/** url 의 origin (실패 시 빈 문자열 — assertSafeFetchUrl 에서 INVALID_URL 처리됨) */
function safeOriginOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * 원본 이미지 URL → 다운로드(SSRF-safe) → 공용 미디어 라이브러리(o4o-media-library, 공개 https) 업로드
 * → O4O https URL 반환. 실패 시 { url: null, reason }.
 */
async function copyImageToStorage(
  imageUrl: string,
  sameOrigin: string,
  mediaService: MediaLibraryService,
  userId: string,
  imageMode?: 'thumbnail-1000' | 'preserve-original',
): Promise<{ url: string | null; reason?: string }> {
  const r = await fetchImageSafe(imageUrl, sameOrigin);
  if ('error' in r) {
    logger.warn(`[ImportCopy] image copy failed (${r.error}): ${imageUrl}`);
    return { url: null, reason: r.error };
  }
  try {
    const asset = await mediaService.upload(
      { buffer: r.buffer, originalname: r.filename, mimetype: r.mime, size: r.buffer.length },
      userId,
      'neture',
      'description',
      // 대표=thumbnail-1000(서버 1000x1000), 상세=preserve-original, 갤러리=undefined(표준)
      imageMode ? { imageMode } : undefined,
    );
    return { url: asset.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const reason = msg.startsWith('IMAGE_TOO_TALL') ? 'too_tall' : 'upload_error';
    logger.warn(`[ImportCopy] upload failed (${reason}): ${imageUrl}`);
    return { url: null, reason };
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * 클라이언트가 관리자 HTML 에서 추출한 이미지 URL 목록을 O4O 미디어 라이브러리로 복사한다.
 * (페이지를 서버에서 fetch 하지 않는다 — URL 만 받는다)
 *
 * @param urls       절대 이미지 URL 목록
 * @param opts.shopOrigin  제공 시 모든 이미지가 이 origin 과 same-origin 이어야 함(자사 쇼핑몰 한정)
 */
export async function copyImages(
  urls: string[],
  opts: {
    dataSource: DataSource;
    userId: string;
    shopOrigin?: string;
    imageMode?: 'thumbnail-1000' | 'preserve-original';
  },
): Promise<CopiedImageResult[]> {
  const { dataSource, userId, shopOrigin, imageMode } = opts;
  const mediaService = new MediaLibraryService(dataSource);
  const out: CopiedImageResult[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    if (out.length >= IMAGE_COPY_LIMIT) break;
    const originalUrl = (raw || '').trim();
    if (!originalUrl || seen.has(originalUrl)) continue;
    seen.add(originalUrl);

    // same-origin 기준: shopOrigin 제공 시 강제, 아니면 이미지 자신의 origin (private IP 차단은 항상 적용)
    let originConstraint = shopOrigin;
    if (!originConstraint) {
      try {
        originConstraint = new URL(originalUrl).origin;
      } catch {
        out.push({ originalUrl, url: null, ok: false, reason: 'invalid_url' });
        continue;
      }
    }
    const { url, reason } = await copyImageToStorage(originalUrl, originConstraint, mediaService, userId, imageMode);
    out.push({ originalUrl, url, ok: !!url, reason: url ? undefined : reason });
  }
  return out;
}

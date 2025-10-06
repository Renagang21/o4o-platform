import { Request } from 'express';

/**
 * 요청에서 서브도메인 추출
 * @param req Express Request
 * @returns 서브도메인 (예: 'shop', 'forum') 또는 null (메인 도메인)
 */
export function extractSubdomain(req: Request): string | null {
  const origin = req.headers.origin || req.headers.referer;

  if (!origin) {
    return null;
  }

  // https://shop.neture.co.kr, http://admin.neture.co.kr 등에서 서브도메인 추출
  const match = origin.match(/https?:\/\/([^.]+)\.neture\.co\.kr/);

  if (!match) {
    // 메인 도메인 (neture.co.kr 또는 www.neture.co.kr)
    return null;
  }

  const subdomain = match[1];

  // www는 메인 도메인으로 처리
  if (subdomain === 'www') {
    return null;
  }

  return subdomain;
}

/**
 * 요청에서 경로 prefix 추출
 * @param path 경로 문자열 (예: '/seller1/products')
 * @returns 경로 prefix (예: '/seller1') 또는 null
 */
export function extractPathPrefix(path: string): string | null {
  if (!path || path === '/') {
    return null;
  }

  // 첫 번째 세그먼트 추출 (/seller1/products -> /seller1)
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return `/${segments[0]}`;
}

/**
 * 요청 컨텍스트 정보 추출
 * @param req Express Request
 * @returns 서브도메인, 경로 prefix 정보
 */
export function extractRequestContext(req: Request) {
  const subdomain = extractSubdomain(req);
  const path = (req.query.path as string) || req.path || '/';
  const pathPrefix = extractPathPrefix(path);

  return {
    subdomain,
    path,
    pathPrefix
  };
}

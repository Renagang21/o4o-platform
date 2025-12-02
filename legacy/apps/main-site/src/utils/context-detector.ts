/**
 * Context Detector Utility
 * Extracts subdomain and path information from browser location
 */

export interface PageContext {
  subdomain: string | null;
  path: string;
  pathPrefix: string | null;
}

/**
 * Extract subdomain from window.location.hostname
 * @returns subdomain (e.g., 'shop', 'forum') or null for main domain
 */
export function extractSubdomain(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const hostname = window.location.hostname;

  // Development: localhost or 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  // Production: extract subdomain from neture.co.kr
  const match = hostname.match(/^([^.]+)\.neture\.co\.kr$/);

  if (!match) {
    // Main domain (neture.co.kr or www.neture.co.kr)
    return null;
  }

  const subdomain = match[1];

  // www is treated as main domain
  if (subdomain === 'www') {
    return null;
  }

  return subdomain;
}

/**
 * Extract path prefix from pathname
 * @param pathname Current pathname (from useLocation or window.location.pathname)
 * @returns path prefix (e.g., '/seller1') or null
 */
export function extractPathPrefix(pathname: string): string | null {
  if (!pathname || pathname === '/') {
    return null;
  }

  // Extract first segment (/seller1/products -> /seller1)
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return `/${segments[0]}`;
}

/**
 * Get complete page context for API calls
 * @param pathname Current pathname
 * @returns Complete context object with subdomain, path, and pathPrefix
 */
export function getPageContext(pathname: string): PageContext {
  return {
    subdomain: extractSubdomain(),
    path: pathname,
    pathPrefix: extractPathPrefix(pathname)
  };
}

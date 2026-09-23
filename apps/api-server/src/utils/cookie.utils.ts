import { Response, Request } from 'express';
import { AuthTokens } from '../types/auth.js';

/**
 * Cookie Utility Module
 *
 * Centralized cookie management for authentication tokens.
 * Ensures consistent cookie configuration across all auth services.
 *
 * Supports multiple service domains:
 * - neture.co.kr (and subdomains)
 * - kpa-society.co.kr
 * - k-cosmetics.site
 */

/**
 * Supported service domains for cookie setting
 * Each domain gets its own cookie scope
 */
const SERVICE_DOMAINS = [
  '.neture.co.kr',
  '.kpa-society.co.kr',
  '.k-cosmetics.site',
];

/**
 * Extract cookie domain from request origin
 * Returns the appropriate cookie domain for the requesting origin
 */
function getCookieDomainFromOrigin(origin?: string): string | undefined {
  if (!origin) return process.env.COOKIE_DOMAIN;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Check each service domain
    for (const domain of SERVICE_DOMAINS) {
      const baseDomain = domain.substring(1); // Remove leading dot
      if (hostname === baseDomain || hostname.endsWith(baseDomain)) {
        return domain;
      }
    }

    // Fallback to environment variable
    return process.env.COOKIE_DOMAIN;
  } catch {
    return process.env.COOKIE_DOMAIN;
  }
}

/**
 * Get cookie configuration based on environment and request origin
 */
function getCookieConfig(req?: Request) {
  const isProduction = process.env.NODE_ENV === 'production';
  const origin = req?.get('origin');
  const cookieDomain = getCookieDomainFromOrigin(origin);

  return {
    isProduction,
    cookieDomain,
    baseOptions: {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax', // Use 'none' in production for cross-subdomain requests
      ...(cookieDomain && { domain: cookieDomain })
    }
  };
}

/**
 * Set authentication cookies
 *
 * Sets both access token and refresh token as httpOnly cookies.
 * Cookie domain is determined from request origin for multi-domain support.
 *
 * @param req - Express Request object (for origin-based domain detection)
 * @param res - Express Response object
 * @param tokens - AuthTokens object containing accessToken and refreshToken
 */
export function setAuthCookies(req: Request, res: Response, tokens: AuthTokens): void {
  const { baseOptions } = getCookieConfig(req);

  // Access token cookie (15 minutes)
  res.cookie('accessToken', tokens.accessToken, {
    ...baseOptions,
    maxAge: (tokens.expiresIn || 15 * 60) * 1000 // Convert to milliseconds
  });

  // Refresh token cookie (7 days)
  res.cookie('refreshToken', tokens.refreshToken, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });
}

/**
 * Set session ID cookie
 *
 * Used for SSO and session management across subdomains.
 *
 * @param req - Express Request object (for origin-based domain detection)
 * @param res - Express Response object
 * @param sessionId - Session ID string
 */
export function setSessionCookie(req: Request, res: Response, sessionId: string): void {
  const { baseOptions } = getCookieConfig(req);

  res.cookie('sessionId', sessionId, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });
}

/**
 * Clear all authentication cookies
 *
 * Removes accessToken, refreshToken, and sessionId cookies.
 *
 * @param req - Express Request object (for origin-based domain detection)
 * @param res - Express Response object
 */
export function clearAuthCookies(req: Request, res: Response): void {
  const { cookieDomain } = getCookieConfig(req);

  const clearOptions = cookieDomain ? { domain: cookieDomain } : {};

  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
  res.clearCookie('sessionId', clearOptions);
}

/**
 * Clear only access token cookie
 *
 * Useful when refreshing tokens but keeping session active.
 *
 * @param req - Express Request object (for origin-based domain detection)
 * @param res - Express Response object
 */
export function clearAccessTokenCookie(req: Request, res: Response): void {
  const { cookieDomain } = getCookieConfig(req);

  const clearOptions = cookieDomain ? { domain: cookieDomain } : {};

  res.clearCookie('accessToken', clearOptions);
}

/**
 * Clear only refresh token cookie
 *
 * Useful when revoking refresh token but allowing current session to finish.
 *
 * @param req - Express Request object (for origin-based domain detection)
 * @param res - Express Response object
 */
export function clearRefreshTokenCookie(req: Request, res: Response): void {
  const { cookieDomain } = getCookieConfig(req);

  const clearOptions = cookieDomain ? { domain: cookieDomain } : {};

  res.clearCookie('refreshToken', clearOptions);
}

/**
 * Set authentication tokens and session
 *
 * Convenience method that sets both auth tokens and session ID.
 *
 * @param req - Express Request object (for origin-based domain detection)
 * @param res - Express Response object
 * @param tokens - AuthTokens object
 * @param sessionId - Session ID string
 */
export function setAuthSession(req: Request, res: Response, tokens: AuthTokens, sessionId: string): void {
  setAuthCookies(req, res, tokens);
  setSessionCookie(req, res, sessionId);
}

/**
 * Get cookie configuration for client
 *
 * Returns configuration info that can be sent to client for debugging.
 *
 * @param req - Express Request object (optional, for origin-based domain detection)
 * @returns Cookie configuration object
 */
export function getCookieConfigInfo(req?: Request) {
  const { isProduction, cookieDomain } = getCookieConfig(req);

  return {
    isProduction,
    cookieDomain: cookieDomain || 'not set',
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true
  };
}

/**
 * Hospital Pharmacy — Device credential cookie
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §4
 *
 * 병원약국 공용 PC 의 device credential 을 담는 쿠키다. **auth token 과 별개다**(원내 업무
 * 컨텍스트는 브라우저 localStorage, 서비스 접근 credential 은 이 HttpOnly 쿠키 — §13).
 * `getCookieConfig` 를 그대로 재사용해 도메인·Secure·SameSite 정책을 auth 쿠키와 일치시킨다:
 *   httpOnly=true (JS 가 읽지 못함 §4), secure=프로덕션, sameSite=프로덕션 'none'(크로스
 *   서브도메인 neture.co.kr ↔ api.neture.co.kr), domain=`.neture.co.kr`(origin 기반).
 * 값은 서버가 만든 random device token 평문 — 저장은 해시로만, 전달은 이 쿠키로만 한다.
 */
export const HOSPITAL_DEVICE_COOKIE = 'hospitalDeviceToken';

/** device token 을 HttpOnly 쿠키로 심는다. maxAge=1년(로그인리스 공용 PC 는 장수 세션이 정상). */
export function setHospitalDeviceCookie(req: Request, res: Response, token: string): void {
  const { baseOptions } = getCookieConfig(req);
  res.cookie(HOSPITAL_DEVICE_COOKIE, token, {
    ...baseOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1년 — revoke 는 서버 status 로 즉시 무효화한다(§16)
  });
}

/** device 쿠키 제거(예: revoke 통지 후 클라이언트 정리 또는 재연결 유도). */
export function clearHospitalDeviceCookie(req: Request, res: Response): void {
  const { cookieDomain } = getCookieConfig(req);
  const clearOptions = cookieDomain ? { domain: cookieDomain } : {};
  res.clearCookie(HOSPITAL_DEVICE_COOKIE, clearOptions);
}

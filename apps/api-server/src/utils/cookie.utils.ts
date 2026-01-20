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
 * - glycopharm.co.kr
 * - kpa-society.co.kr
 * - glucoseview.co.kr
 * - k-cosmetics.site
 */

/**
 * Supported service domains for cookie setting
 * Each domain gets its own cookie scope
 */
const SERVICE_DOMAINS = [
  '.neture.co.kr',
  '.glycopharm.co.kr',
  '.kpa-society.co.kr',
  '.glucoseview.co.kr',
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
  const origin = req.get('origin');

  // Debug log for cookie configuration
  console.log('[Cookie.setAuthCookies] Setting auth cookies:', {
    origin,
    domain: baseOptions.domain,
    secure: baseOptions.secure,
    sameSite: baseOptions.sameSite,
    httpOnly: baseOptions.httpOnly,
    nodeEnv: process.env.NODE_ENV,
  });

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

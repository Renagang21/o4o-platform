import { Response } from 'express';
import { AuthTokens } from '../types/auth.js';

/**
 * Cookie Utility Module
 *
 * Centralized cookie management for authentication tokens.
 * Ensures consistent cookie configuration across all auth services.
 */

/**
 * Get cookie configuration based on environment
 */
function getCookieConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN; // e.g., '.neture.co.kr'

  return {
    isProduction,
    cookieDomain,
    baseOptions: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      ...(cookieDomain && { domain: cookieDomain })
    }
  };
}

/**
 * Set authentication cookies
 *
 * Sets both access token and refresh token as httpOnly cookies.
 *
 * @param res - Express Response object
 * @param tokens - AuthTokens object containing accessToken and refreshToken
 */
export function setAuthCookies(res: Response, tokens: AuthTokens): void {
  const { baseOptions } = getCookieConfig();

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
 * @param res - Express Response object
 * @param sessionId - Session ID string
 */
export function setSessionCookie(res: Response, sessionId: string): void {
  const { baseOptions } = getCookieConfig();

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
 * @param res - Express Response object
 */
export function clearAuthCookies(res: Response): void {
  const { cookieDomain } = getCookieConfig();

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
 * @param res - Express Response object
 */
export function clearAccessTokenCookie(res: Response): void {
  const { cookieDomain } = getCookieConfig();

  const clearOptions = cookieDomain ? { domain: cookieDomain } : {};

  res.clearCookie('accessToken', clearOptions);
}

/**
 * Clear only refresh token cookie
 *
 * Useful when revoking refresh token but allowing current session to finish.
 *
 * @param res - Express Response object
 */
export function clearRefreshTokenCookie(res: Response): void {
  const { cookieDomain } = getCookieConfig();

  const clearOptions = cookieDomain ? { domain: cookieDomain } : {};

  res.clearCookie('refreshToken', clearOptions);
}

/**
 * Set authentication tokens and session
 *
 * Convenience method that sets both auth tokens and session ID.
 *
 * @param res - Express Response object
 * @param tokens - AuthTokens object
 * @param sessionId - Session ID string
 */
export function setAuthSession(res: Response, tokens: AuthTokens, sessionId: string): void {
  setAuthCookies(res, tokens);
  setSessionCookie(res, sessionId);
}

/**
 * Get cookie configuration for client
 *
 * Returns configuration info that can be sent to client for debugging.
 *
 * @returns Cookie configuration object
 */
export function getCookieConfigInfo() {
  const { isProduction, cookieDomain } = getCookieConfig();

  return {
    isProduction,
    cookieDomain: cookieDomain || 'not set',
    secure: isProduction,
    sameSite: 'lax',
    httpOnly: true
  };
}

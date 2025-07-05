import { AuthUser } from '../types';

/**
 * JWT 토큰 유틸리티 함수들
 */

/**
 * JWT 토큰 유효성 검증
 */
export function validateToken(token: string): boolean {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    return payload.exp > currentTime;
  } catch (error) {
    return false;
  }
}

/**
 * JWT 토큰에서 페이로드 추출
 */
export function parseTokenPayload(token: string): any | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    return JSON.parse(atob(parts[1]));
  } catch (error) {
    return null;
  }
}

/**
 * 토큰에서 사용자 정보 추출
 */
export function extractUserFromToken(token: string): AuthUser | null {
  const payload = parseTokenPayload(token);
  if (!payload) return null;

  try {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions || [],
      isApproved: payload.isApproved !== false,
      isLocked: payload.isLocked === true,
      lockReason: payload.lockReason,
      lastLogin: payload.lastLogin,
      createdAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : '',
      updatedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : '',
      metadata: payload.metadata
    };
  } catch (error) {
    return null;
  }
}

/**
 * 토큰 만료 시간 계산
 */
export function getTokenExpiryTime(token: string): number | null {
  const payload = parseTokenPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}

/**
 * 토큰 남은 시간 계산 (밀리초)
 */
export function getTokenRemainingTime(token: string): number {
  const expiryTime = getTokenExpiryTime(token);
  if (!expiryTime) return 0;
  
  return Math.max(0, expiryTime - Date.now());
}

/**
 * 토큰이 곧 만료되는지 확인
 */
export function isTokenExpiringSoon(token: string, warningThreshold: number = 5 * 60 * 1000): boolean {
  const remainingTime = getTokenRemainingTime(token);
  return remainingTime > 0 && remainingTime <= warningThreshold;
}
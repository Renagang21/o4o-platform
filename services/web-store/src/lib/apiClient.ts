import { AuthClient } from '@o4o/auth-client';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
// per-origin localStorage SSOT — 다른 서비스와 같은 전략(handoff 수신 시 storeTokens 로 저장)
export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, { strategy: 'localStorage' });
export const api = authClient.api;

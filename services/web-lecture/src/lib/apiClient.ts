import { AuthClient } from '@o4o/auth-client';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, { strategy: 'localStorage' });
export const api = authClient.api;

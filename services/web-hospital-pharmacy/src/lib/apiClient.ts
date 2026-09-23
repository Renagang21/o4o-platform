import { AuthClient } from '@o4o/auth-client';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

/**
 * 관리자(별도 역할) 전용 인증 클라이언트 — /manage 에서 super_admin Google 로그인에만 쓴다.
 * 일반 사용자(홈·병동·약제부)는 로그인하지 않는다: device credential(HttpOnly 쿠키)로 접근한다.
 */
export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, { strategy: 'localStorage' });
export const api = authClient.api;

/**
 * Hospital device 엔드포인트 호출 — **credentials:'include'** 로 HttpOnly device 쿠키를 보낸다
 * (WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §4). Bearer 토큰을 쓰지 않는다.
 * 반환: { ok, status, body } — body 는 서버 { success, data|error, code } JSON.
 */
export interface HospitalApiResult<T = unknown> {
  ok: boolean;
  status: number;
  body: { success?: boolean; data?: T; error?: string; code?: string } | null;
}

export async function hospitalFetch<T = unknown>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<HospitalApiResult<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let body: HospitalApiResult<T>['body'] = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

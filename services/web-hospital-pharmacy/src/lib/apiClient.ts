export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

/**
 * Hospital 전용 엔드포인트 호출 — **무로그인**(WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION §1).
 * 개인 계정 · device credential 이 없으므로 쿠키도 Bearer 토큰도 보내지 않는다(credentials:'omit').
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
    credentials: 'omit',
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

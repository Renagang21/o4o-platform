/**
 * API base URL 해석 — WO-O4O-COLLABORATOR-LOCAL-DEV-SAFETY-AND-SETUP-ALIGNMENT-V1
 *
 * 우선순위: VITE_API_BASE_URL → VITE_API_URL → 모드별 기본값.
 * - dev server (`vite`, DEV=true): 로컬 API. env 를 빠뜨려도 운영 API 로 가지 않는다.
 * - production build (`vite build`, DEV=false): 운영 API. 배포 빌드는 Dockerfile ARG 로 명시 주입한다.
 *
 * 로컬 API 포트는 apps/api-server/.env.example 의 PORT 와 같다 (SETUP.md §3).
 */
export const LOCAL_DEV_API_BASE_URL = 'http://localhost:3002';
export const PRODUCTION_API_BASE_URL = 'https://api.neture.co.kr';

export interface ApiBaseUrlEnv {
  VITE_API_BASE_URL?: string;
  VITE_API_URL?: string;
  DEV?: boolean;
}

export function resolveApiBaseUrl(env: ApiBaseUrlEnv): string {
  return (
    env.VITE_API_BASE_URL ||
    env.VITE_API_URL ||
    (env.DEV ? LOCAL_DEV_API_BASE_URL : PRODUCTION_API_BASE_URL)
  );
}

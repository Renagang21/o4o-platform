/**
 * Unified Store Workspace (store.neture.co.kr) — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-2
 *
 * Store Workspace 는 O4O 서비스가 아니다 (service-catalog 에 없고 serviceKey 도 없다).
 * 접근 판단 축은 organization(접근 가능 매장) 이며, 이 파일은 handoff 대상 origin 만 고정한다.
 */

export const STORE_WORKSPACE_KEY = 'store' as const;
export const STORE_WORKSPACE_HOST = 'store.neture.co.kr';
export const STORE_WORKSPACE_ORIGIN = `https://${STORE_WORKSPACE_HOST}`;

/** 로컬 개발(store-web vite 4210)에서만 허용하는 exchange origin host. 프로덕션은 정확 host 1개뿐. */
const DEV_EXCHANGE_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Workspace handoff exchange 를 허용하는 origin 인지 판정한다.
 * 프로덕션: `store.neture.co.kr` 정확 일치만. 비프로덕션: localhost 계열 추가 허용.
 */
export function isStoreWorkspaceExchangeOrigin(
  origin: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === STORE_WORKSPACE_HOST) return true;
  return nodeEnv !== 'production' && DEV_EXCHANGE_HOSTS.has(host);
}

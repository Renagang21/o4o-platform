/**
 * O4O 대표 진입(neture.co.kr) 복귀 handoff — WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1
 *
 * 서비스 → neture.co.kr 로 "O4O 홈" 복귀할 때는 neture membership 을 요구하지 않는다
 * (O4O 계정 인증 ≠ Neture 서비스 회원권). 그 대신 교환(exchange) 수신 origin 을 대표 진입 host 로 고정해
 * 이 예외 토큰이 다른 origin 에서 소비되지 않게 한다. 대상 판정은 `REPRESENTATIVE_ENTRY_SERVICE_KEY` 하나뿐이다.
 */
import { REPRESENTATIVE_ENTRY_SERVICE_KEY, getService } from './service-catalog.js';

/** 대표 진입 host (catalog domain) + neture-web 이 같이 서빙하는 www host. */
function representativeEntryHosts(): Set<string> {
  const domain = getService(REPRESENTATIVE_ENTRY_SERVICE_KEY)?.domain.toLowerCase();
  return new Set(domain ? [domain, `www.${domain}`] : []);
}

/** 로컬 개발에서만 허용하는 exchange origin host. 프로덕션은 대표 진입 host 만. */
const DEV_EXCHANGE_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isRepresentativeEntryTarget(targetServiceKey: unknown): boolean {
  return targetServiceKey === REPRESENTATIVE_ENTRY_SERVICE_KEY;
}

/**
 * 대표 진입 복귀 토큰을 교환해도 되는 origin 인지 판정한다.
 * 프로덕션: neture.co.kr / www.neture.co.kr 정확 일치만. 비프로덕션: localhost 계열 추가 허용.
 */
export function isRepresentativeEntryExchangeOrigin(
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
  if (representativeEntryHosts().has(host)) return true;
  return nodeEnv !== 'production' && DEV_EXCHANGE_HOSTS.has(host);
}

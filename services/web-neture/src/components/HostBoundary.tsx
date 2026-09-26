/**
 * HostBoundary — 서브도메인(supplier · funding · community) 경계에서 경로를 판정한다.
 *   판정 규칙은 lib/hostProfile.ts (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-8 · §21-10).
 *   - 새 호스트가 소유하지 않은 경로 → 대표 호스트 같은 경로로 이동(내부 링크를 그대로 두기 위함)
 *   - 대표 호스트 → cutover 플래그가 켜진 호스트만 새 호스트로
 *   (새 호스트의 `/` 대표 화면은 App 의 route 가 직접 렌더한다.)
 */
import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CURRENT_HOST_PROFILE, decideHost, readCutoverFlags } from '../lib/hostProfile';

const cutover = readCutoverFlags(import.meta.env as Record<string, unknown>);

export default function HostBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const decision = decideHost(CURRENT_HOST_PROFILE, location, cutover);
  const externalHref = decision.kind === 'external' ? decision.href : null;

  useEffect(() => {
    if (externalHref) window.location.replace(externalHref);
  }, [externalHref]);

  if (externalHref) return null;
  return <>{children}</>;
}

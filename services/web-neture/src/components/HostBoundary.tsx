/**
 * HostBoundary — 서브도메인(supplier · funding) 경계에서 경로를 판정한다.
 *   판정 규칙은 lib/hostProfile.ts (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-8).
 *   - 새 호스트 `/` → 그 호스트 첫 화면
 *   - 새 호스트가 소유하지 않은 경로 → 대표 호스트 같은 경로로 이동(내부 링크를 그대로 두기 위함)
 *   - 대표 호스트 → cutover 플래그가 켜진 호스트만 새 호스트로
 */
import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { decideHost, getHostProfile, readCutoverFlags } from '../lib/hostProfile';

const profile = typeof window !== 'undefined' ? getHostProfile(window.location.hostname) : 'main';
const cutover = readCutoverFlags(import.meta.env as Record<string, unknown>);

export default function HostBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const decision = decideHost(profile, location, cutover);
  const externalHref = decision.kind === 'external' ? decision.href : null;

  useEffect(() => {
    if (externalHref) window.location.replace(externalHref);
  }, [externalHref]);

  if (decision.kind === 'home') return <Navigate to={decision.to} replace />;
  if (decision.kind === 'external') return null;
  return <>{children}</>;
}

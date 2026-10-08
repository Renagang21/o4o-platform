/**
 * HostBoundary — 서브도메인(supplier · funding · community) 경계에서 경로를 판정한다.
 *   판정 규칙은 lib/hostProfile.ts (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-8 · §21-10).
 *   - 새 호스트가 소유하지 않은 경로 → 대표 호스트 같은 경로로 이동(내부 링크를 그대로 두기 위함)
 *   - 대표 호스트 → cutover 플래그가 켜진 호스트만 새 호스트로
 *   (새 호스트의 `/` 대표 화면은 App 의 route 가 직접 렌더한다.)
 */
import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts';
import { api } from '../lib/apiClient';
import { CURRENT_HOST_PROFILE, decideHost, readCutoverFlags } from '../lib/hostProfile';

const cutover = readCutoverFlags(import.meta.env as Record<string, unknown>);

export default function HostBoundary({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const decision = decideHost(CURRENT_HOST_PROFILE, location, cutover);
  const externalHref = decision.kind === 'external' ? decision.href : null;

  useEffect(() => {
    if (!externalHref || isLoading) return;
    let active = true;
    setError('');
    const target = new URL(externalHref);
    const serviceKeys: Record<string, string> = {
      'supplier.neture.co.kr': 'supplier', 'funding.neture.co.kr': 'funding',
      'community.neture.co.kr': 'community', 'pharmacy.neture.co.kr': 'kpa-society',
    };
    const serviceKey = serviceKeys[target.hostname];
    const workspace = target.hostname === 'store.neture.co.kr';
    if (target.origin === window.location.origin || !isAuthenticated || (!serviceKey && !workspace)) {
      window.location.replace(externalHref);
      return;
    }
    api.post('/auth/handoff', {
      ...(workspace ? { targetWorkspace: 'store' } : { targetServiceKey: serviceKey }),
      returnPath: `${target.pathname}${target.search}${target.hash}`,
    }).then((r: { data: { data?: { targetUrl?: string } } }) => {
      if (!active) return;
      const href = r.data?.data?.targetUrl;
      if (!href) throw new Error('Missing target');
      const issued = new URL(href);
      if (issued.origin !== target.origin || issued.pathname !== '/handoff') throw new Error('Invalid target');
      window.location.replace(href);
    }).catch(() => { if (active) setError('로그인 상태를 전달하지 못했습니다. 다시 시도해 주세요.'); });
    return () => { active = false; };
  }, [externalHref, isLoading, isAuthenticated, attempt]);

  if (externalHref) return error ? <main className="p-8"><p role="alert">{error}</p><button onClick={() => setAttempt(v => v + 1)}>다시 시도</button></main> : <p className="p-8">서비스로 이동하는 중입니다…</p>;
  return <>{children}</>;
}

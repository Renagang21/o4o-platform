/**
 * Workspace handoff 수신 — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §3-④
 *
 * 기존 서비스 HandoffPage 패턴 그대로(토큰 교환 → per-origin localStorage 저장 · `useLayoutEffect clearStoredTokens` stale guard).
 * 교환 API 는 기존 `POST /auth/handoff/exchange` 를 그대로 부른다. 발급 측은 §8-2(DDL 승인 2026-09-21)로 완성:
 * 세 서비스가 `POST /auth/handoff { targetWorkspace: 'store' }` 로 발급한 WORKSPACE 토큰을 이 페이지가 받는다.
 * 서버는 이 origin(store.neture.co.kr)에서만 workspace 토큰을 교환하며, 판정 축은 서비스 membership 이 아니라
 * "접근 가능한 매장(organization)" 이다. 가짜 serviceKey 로 우회하지 않는다.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { clearStoredTokens, storeTokens } from '@o4o/auth-client';
import { API_BASE_URL } from '../lib/apiClient';
import { BRAND, PLATFORM_ORIGIN } from '../config/workspace';

function resolveReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}
const ERROR_MESSAGES: Record<string, string> = {
  HANDOFF_TOKEN_INVALID: '이동 링크가 만료되었거나 이미 사용되었습니다.',
  HANDOFF_TARGET_NO_MEMBERSHIP: '접근 가능한 매장이 없습니다.',
  HANDOFF_TARGET_WITHDRAWN: '탈퇴한 계정은 이동할 수 없습니다.',
  HANDOFF_TARGET_NOT_ACTIVE: '매장 이용이 아직 승인되지 않았습니다.',
  INVALID_USER: '계정을 확인할 수 없습니다.',
};
export default function HandoffPage() {
  const [error, setError] = useState('');
  useLayoutEffect(() => { clearStoredTokens(); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const returnTo = resolveReturnTo(params.get('returnTo'));
    if (!token) { setError('이동 정보가 없습니다.'); return; }
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/handoff/exchange`, {
          // credentials 를 보내지 않는다 — 세션은 body 토큰(localStorage)으로만 복원한다.
          // 쿠키를 받으면 `.neture.co.kr` 쿠키를 쓰는 admin 세션을 덮어쓴다 (CHECK-O4O-URL-FIRST-CENSUS-V1 §19-1).
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => null);
        const tokens = data?.data?.tokens;
        if (response.ok && data?.success && tokens?.accessToken) {
          storeTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          window.location.replace(returnTo);
          return;
        }
        setError(ERROR_MESSAGES[data?.code] || data?.error || '매장 업무공간 이동에 실패했습니다.');
      } catch { setError('네트워크 오류가 발생했습니다.'); }
    })();
  }, []);
  if (!error) return <main className="center-card"><section className="card"><h1>{BRAND.name}</h1><p>매장 업무공간으로 이동 중...</p></section></main>;
  return <main className="center-card"><section className="card"><h1>이동 실패</h1><p>{error}</p><a className="button-link" href={PLATFORM_ORIGIN}>Neture로 돌아가기</a></section></main>;
}

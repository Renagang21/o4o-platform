import { useEffect, useLayoutEffect, useState } from 'react';
import { clearStoredTokens, storeTokens } from '@o4o/auth-client';
import { API_BASE_URL } from '../lib/apiClient';

function resolveReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}
const ERROR_MESSAGES: Record<string, string> = {
  HANDOFF_TOKEN_INVALID: '이동 링크가 만료되었거나 이미 사용되었습니다.',
  HANDOFF_TARGET_NO_MEMBERSHIP: 'O4O 강의 서비스에 가입되어 있지 않습니다.',
  HANDOFF_TARGET_WITHDRAWN: '탈퇴한 서비스는 이동할 수 없습니다.',
  HANDOFF_TARGET_NOT_ACTIVE: '강의 서비스 이용이 아직 승인되지 않았습니다.',
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
        setError(ERROR_MESSAGES[data?.code] || data?.error || '서비스 이동에 실패했습니다.');
      } catch { setError('네트워크 오류가 발생했습니다.'); }
    })();
  }, []);
  if (!error) return <main className="center-card"><section className="card"><h1>O4O 강의</h1><p>서비스 이동 중...</p></section></main>;
  return <main className="center-card"><section className="card"><h1>서비스 이동 실패</h1><p>{error}</p><a className="button-link" href="https://neture.co.kr">Neture로 돌아가기</a></section></main>;
}

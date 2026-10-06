import { useEffect, useLayoutEffect, useState } from 'react';
import { clearStoredTokens, storeTokens } from '@o4o/auth-client';
import { API_BASE_URL } from '../lib/apiClient';
import { INQUIRY_URL, isPublicLecturePath } from '../config/service';

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
/** 로그인은 됐지만 강의 서비스 이용 자격이 없는 거절 — 인증 실패와 구분해 공개 강의 · 문의로 안내 (WO-O4O-LECTURE-HANDOFF-NONMEMBER-UX-V1) */
const MEMBERSHIP_CODES = new Set(['HANDOFF_TARGET_NO_MEMBERSHIP', 'HANDOFF_TARGET_WITHDRAWN', 'HANDOFF_TARGET_NOT_ACTIVE']);

export default function HandoffPage() {
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [returnTo] = useState(() => resolveReturnTo(new URLSearchParams(window.location.search).get('returnTo')));
  useLayoutEffect(() => { clearStoredTokens(); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
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
        setCode(typeof data?.code === 'string' ? data.code : '');
        setError(ERROR_MESSAGES[data?.code] || data?.error || '서비스 이동에 실패했습니다.');
      } catch { setError('네트워크 오류가 발생했습니다.'); }
    })();
  }, [returnTo]);
  if (!error) return <main className="center-card"><section className="card"><h1>O4O 강의</h1><p>서비스 이동 중...</p></section></main>;
  if (MEMBERSHIP_CODES.has(code)) {
    const backToPublic = isPublicLecturePath(returnTo);
    return <main className="center-card"><section className="card">
      <h1>강의 서비스 이용 자격이 필요합니다</h1>
      <p>O4O 계정 로그인은 완료되었습니다. {error}</p>
      <p className="muted">공개 강의는 회원이 아니어도 볼 수 있습니다. 이용 신청은 문의하기로 남겨 주세요.</p>
      <div className="actions">
        <a className="button-link" href={backToPublic ? returnTo : '/courses'}>{backToPublic ? '보던 화면으로 돌아가기' : '공개 강의 둘러보기'}</a>
        <a className="secondary-link" href={INQUIRY_URL}>이용 문의하기</a>
      </div>
    </section></main>;
  }
  return <main className="center-card"><section className="card"><h1>서비스 이동 실패</h1><p>{error}</p>
    <div className="actions">
      {code === 'HANDOFF_TOKEN_INVALID' && <a className="button-link" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>다시 로그인</a>}
      <a className={code === 'HANDOFF_TOKEN_INVALID' ? 'secondary-link' : 'button-link'} href="https://neture.co.kr">Neture로 돌아가기</a>
    </div>
  </section></main>;
}

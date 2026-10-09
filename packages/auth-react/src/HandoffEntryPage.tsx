/** Shared localStorage handoff receiver; clear stale tokens before parent session restore. */
import { useEffect, useLayoutEffect, useState } from 'react';
import { clearStoredTokens, storeTokens } from '@o4o/auth-client';
import { resolveHandoffReturnTo, buildHandoffDestination } from '@o4o/auth-utils';

type HandoffStatus = 'loading' | 'success' | 'error';



export interface HandoffEntryPageProps {
  apiBaseUrl: string;
  basename?: string;
  errorMessages: Record<string, string>;
}

export function HandoffEntryPage({ apiBaseUrl, basename = '', errorMessages }: HandoffEntryPageProps) {
  const [status, setStatus] = useState<HandoffStatus>('loading');
  const [error, setError] = useState<string>('');

  // 낡은 토큰 선제 제거 — AuthProvider 의 passive effect(/auth/me) 보다 먼저 실행된다 (상단 주석).
  useLayoutEffect(() => {
    clearStoredTokens();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const returnTo = resolveHandoffReturnTo(params.get('returnTo'), window.location.origin);

    if (!token) {
      setStatus('error');
      setError('이동 정보가 없습니다. 다시 시도해 주세요.');
      return;
    }

    const exchange = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/handoff/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // credentials 를 보내지 않는다 — 세션은 body 토큰(localStorage)으로만 복원한다.
          // 쿠키를 받으면 `.neture.co.kr` 쿠키를 쓰는 admin 세션을 덮어쓴다 (CHECK-O4O-URL-FIRST-CENSUS-V1 §19-1).
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => null);

        const tokens = data?.data?.tokens;
        if (response.ok && data?.success && tokens?.accessToken) {
          storeTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          setStatus('success');
          // 전체 리로드 — AuthProvider 가 저장된 토큰으로 /auth/me 를 다시 읽게 한다.
          window.location.replace(buildHandoffDestination(returnTo, window.location.origin, basename));
        } else {
          setStatus('error');
          setError(errorMessages[data?.code] || data?.error || '서비스 이동에 실패했습니다.');
        }
      } catch {
        setStatus('error');
        setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    };

    exchange();
  }, [apiBaseUrl, basename, errorMessages]);

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.text}>서비스 이동 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.errorText}>{error}</p>
          <a href={`${basename}/login`} style={styles.link}>로그인 페이지로 이동</a>
          <p><a href="https://neture.co.kr/" style={styles.link}>O4O 메인으로</a></p>
        </div>
      </div>
    );
  }

  return null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  card: {
    textAlign: 'center' as const,
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #1976d2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  text: {
    fontSize: '16px',
    color: '#333',
  },
  errorText: {
    fontSize: '16px',
    color: '#d32f2f',
    marginBottom: '16px',
  },
  link: {
    color: '#1976d2',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

/**
 * Service Handoff Page
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1 (수신 정합):
 *   - 이 앱은 `@o4o/auth-client` localStorage 전략이므로 exchange 응답 body 의
 *     `data.tokens.{accessToken,refreshToken}` 를 SSOT key 로 저장한다 (쿠키만으로는 세션 복원 불가).
 *   - `returnTo`(상대 경로) 가 있으면 교환 후 그 화면으로, 없으면 홈으로 이동한다.
 *   - exchange 는 공개 endpoint 라 `fetch` 로 직접 호출한다 — authClient 인터셉터가
 *     401(만료·무효 토큰)을 refresh 시도로 오해해 기존 세션을 지우는 일을 막는다.
 *   - 토큰 값은 어떤 로그·화면에도 남기지 않는다.
 *
 * URL: /kpa/handoff?token={handoffToken}[&returnTo=/relative/path]
 */

import { useEffect, useState } from 'react';
import { storeTokens } from '@o4o/auth-client';
import { API_BASE_URL } from '../lib/apiClient';
import { detectBasename } from '../lib/tenant';

type HandoffStatus = 'loading' | 'success' | 'error';

/** '/' 로 시작하는 단일 슬래시 상대 경로만 허용 (open redirect 차단). 그 외는 홈. */
function resolveReturnTo(raw: string | null): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

const ERROR_MESSAGES: Record<string, string> = {
  HANDOFF_TOKEN_INVALID: '이동 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.',
  HANDOFF_TARGET_NO_MEMBERSHIP: '이 서비스에 가입되어 있지 않습니다.',
  HANDOFF_TARGET_WITHDRAWN: '탈퇴한 서비스는 이동할 수 없습니다.',
  HANDOFF_TARGET_NOT_ACTIVE: '이 서비스 이용이 아직 승인되지 않았거나 정지 상태입니다.',
  INVALID_USER: '계정을 확인할 수 없습니다. 다시 로그인해 주세요.',
};

export default function HandoffPage() {
  const [status, setStatus] = useState<HandoffStatus>('loading');
  const [error, setError] = useState<string>('');
  // 공용 host 에서는 /kpa prefix, 분회 자체 도메인에서는 '' (App 의 BrowserRouter basename 과 동일 규칙)
  const basename = detectBasename();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const returnTo = resolveReturnTo(params.get('returnTo'));

    if (!token) {
      setStatus('error');
      setError('이동 정보가 없습니다. 다시 시도해 주세요.');
      return;
    }

    const exchange = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/handoff/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => null);

        const tokens = data?.data?.tokens;
        if (response.ok && data?.success && tokens?.accessToken) {
          storeTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          setStatus('success');
          // 전체 리로드 — AuthProvider 가 저장된 토큰으로 /auth/me 를 다시 읽게 한다.
          window.location.replace(`${basename}${returnTo}`);
        } else {
          setStatus('error');
          setError(ERROR_MESSAGES[data?.code] || data?.error || '서비스 이동에 실패했습니다.');
        }
      } catch {
        setStatus('error');
        setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    };

    exchange();
  }, []);

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

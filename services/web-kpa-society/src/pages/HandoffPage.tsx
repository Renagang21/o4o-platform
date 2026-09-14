/**
 * Service Handoff Page
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * Receives a handoff token from another O4O service and exchanges it
 * for authentication tokens on this domain (localStorage-based).
 *
 * URL: /handoff?token={handoffToken}
 */

import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// @o4o/auth-client SSOT token keys (token-storage.ts)
const ACCESS_TOKEN_KEY = 'o4o_accessToken';
const REFRESH_TOKEN_KEY = 'o4o_refreshToken';

type HandoffStatus = 'loading' | 'success' | 'error';

/** WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1: 만료·실패 코드를 사용자 문구로 (다른 수신 페이지와 동일 표) */
const ERROR_MESSAGES: Record<string, string> = {
  HANDOFF_TOKEN_INVALID: '이동 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.',
  HANDOFF_TARGET_NO_MEMBERSHIP: '이 서비스에 가입되어 있지 않습니다.',
  HANDOFF_TARGET_WITHDRAWN: '탈퇴한 서비스는 이동할 수 없습니다.',
  HANDOFF_TARGET_NOT_ACTIVE: '이 서비스 이용이 아직 승인되지 않았거나 정지 상태입니다.',
  INVALID_USER: '계정을 확인할 수 없습니다. 다시 로그인해 주세요.',
};

/**
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1: `returnTo` 상대 경로 지원.
 * '/' 로 시작하는 단일 슬래시 경로만 허용 (open redirect 차단). 그 외는 홈.
 */
function resolveReturnTo(raw: string | null): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

export default function HandoffPage() {
  const [status, setStatus] = useState<HandoffStatus>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const returnTo = resolveReturnTo(params.get('returnTo'));

    if (!token) {
      setStatus('error');
      setError('핸드오프 토큰이 없습니다.');
      return;
    }

    const exchange = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/handoff/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data?.success && data.data?.tokens) {
          // Store tokens in localStorage (KPA Society uses localStorage strategy)
          localStorage.setItem(ACCESS_TOKEN_KEY, data.data.tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, data.data.tokens.refreshToken);
          setStatus('success');
          window.location.replace(returnTo);
        } else {
          setStatus('error');
          setError(ERROR_MESSAGES[data?.code] || data?.error || '서비스 이동에 실패했습니다.');
        }
      } catch {
        setStatus('error');
        setError('네트워크 오류가 발생했습니다.');
      }
    };

    exchange();
  }, []);

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
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
          <a href="/login" style={styles.link}>로그인 페이지로 이동</a>
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

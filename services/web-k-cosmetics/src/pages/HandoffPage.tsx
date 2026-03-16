/**
 * Service Handoff Page
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * Receives a handoff token from another O4O service and exchanges it
 * for authentication tokens on this domain (cookie-based).
 *
 * URL: /handoff?token={handoffToken}
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/apiClient';

type HandoffStatus = 'loading' | 'success' | 'error';

export default function HandoffPage() {
  const [status, setStatus] = useState<HandoffStatus>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setError('핸드오프 토큰이 없습니다.');
      return;
    }

    const exchange = async () => {
      try {
        const response = await api.post('/auth/handoff/exchange', { token });

        if (response.data.success) {
          const d = response.data.data;
          if (d?.accessToken) localStorage.setItem('o4o_accessToken', d.accessToken);
          if (d?.refreshToken) localStorage.setItem('o4o_refreshToken', d.refreshToken);
          setStatus('success');
          window.location.href = '/';
        } else {
          setStatus('error');
          setError(response.data.error || '서비스 이동에 실패했습니다.');
        }
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.error || '네트워크 오류가 발생했습니다.');
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

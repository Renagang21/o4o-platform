import { exchangeHandoffToken } from '@o4o/auth-client';
/** Shared localStorage handoff receiver; clear stale tokens before parent session restore. */
import { useEffect, useLayoutEffect, useState } from 'react';
import { clearStoredTokens, storeTokens } from '@o4o/auth-client';
import { resolveHandoffReturnTo, buildHandoffDestination } from '@o4o/auth-utils';
import './HandoffEntryPage.css';

export interface HandoffFailure {
  message: string;
  link?: { href: string; label: string };
}

type HandoffStatus = 'loading' | 'success' | 'error';



export interface HandoffEntryPageProps {
  apiBaseUrl: string;
  basename?: string;
  errorMessages: Record<string, string>;
  resolveFailure?: (data: unknown) => HandoffFailure | null;
  showSpinner?: boolean;
  missingTokenMessage?: string;
  networkErrorMessage?: string;
}

export function HandoffEntryPage({ apiBaseUrl, basename = '', errorMessages, resolveFailure, showSpinner = true, missingTokenMessage = '이동 정보가 없습니다. 다시 시도해 주세요.', networkErrorMessage = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }: Readonly<HandoffEntryPageProps>) {
  const [status, setStatus] = useState<HandoffStatus>('loading');
  const [error, setError] = useState<string>('');
  const [failureLink, setFailureLink] = useState<HandoffFailure['link']>();

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
      setError(missingTokenMessage);
      return;
    }

    const exchange = async () => {
      try {
        const response = await exchangeHandoffToken(apiBaseUrl, token);
        const data = await response.json().catch(() => null);

        const tokens = data?.data?.tokens;
        if (response.ok && data?.success && tokens?.accessToken) {
          storeTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          setStatus('success');
          // 전체 리로드 — AuthProvider 가 저장된 토큰으로 /auth/me 를 다시 읽게 한다.
          window.location.replace(buildHandoffDestination(returnTo, window.location.origin, basename));
        } else {
          setStatus('error');
          const failure = resolveFailure?.(data);
          setError(failure?.message || errorMessages[data?.code] || data?.error || '서비스 이동에 실패했습니다.');
          setFailureLink(failure?.link);
        }
      } catch {
        setStatus('error');
        setError(networkErrorMessage);
      }
    };

    void exchange();
  }, [apiBaseUrl, basename, errorMessages, resolveFailure, missingTokenMessage, networkErrorMessage]);

  if (status === 'loading') {
    return (
      <div className="o4o-handoff-container">
        <div className="o4o-handoff-card">
          {showSpinner && <div className="o4o-handoff-spinner" />}
          <p className="o4o-handoff-text">서비스 이동 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="o4o-handoff-container">
        <div className="o4o-handoff-card">
          <p className="o4o-handoff-errorText">{error}</p>
          {failureLink && <p><a href={failureLink.href} className="o4o-handoff-link">{failureLink.label}</a></p>}
          <a href={`${basename}/login`} className="o4o-handoff-link">로그인 페이지로 이동</a>
          <p><a href="https://neture.co.kr/" className="o4o-handoff-link">O4O 메인으로</a></p>
        </div>
      </div>
    );
  }

  return null;
}

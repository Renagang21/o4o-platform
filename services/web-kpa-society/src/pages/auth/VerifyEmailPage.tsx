/**
 * VerifyEmailPage - 이메일 인증
 * WO-O4O-AUTH-VERIFY-EMAIL-FRONTEND-PAGE-V1
 *
 * 이메일 링크에서 진입: /auth/verify-email?token=xxx
 * 패턴은 ResetPasswordPage 와 동일. 사용자 입력 없이 자동 검증 후 결과만 표시.
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

type VerifyState = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerifyState>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  // React StrictMode 의 dev 시 useEffect 이중 실행 방어 — token 은 1회 소비이므로 보호 필요
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setState('success');
          return;
        }
        // 이미 인증된 경우는 사용자 관점에서 성공으로 처리
        const code = data.code || data.data?.code;
        const message = String(data.error || data.message || '');
        if (code === 'ALREADY_VERIFIED' || /already\s*verified/i.test(message)) {
          setState('success');
          return;
        }
        if (code === 'TOKEN_EXPIRED' || /expired/i.test(message)) {
          setErrorMsg('인증 링크가 만료되었습니다. 로그인 후 마이페이지에서 인증 메일을 재발송할 수 있습니다.');
        } else {
          setErrorMsg(data.error || data.message || '인증에 실패했습니다.');
        }
        setState('error');
      } catch {
        setErrorMsg('서버와의 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        setState('error');
      }
    })();
  }, [token]);

  // Token 없음
  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-slate-900">인증 토큰이 없습니다</h2>
          <p className="text-sm text-slate-600">
            이메일에 받은 인증 링크를 다시 확인해주세요.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  // 인증 처리 중
  if (state === 'verifying') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
          <h2 className="text-xl font-bold text-slate-900">이메일 인증 중...</h2>
          <p className="text-sm text-slate-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  // 성공
  if (state === 'success') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="text-xl font-bold text-slate-900">이메일 인증 완료</h2>
          <p className="text-sm text-slate-600">
            이메일이 정상적으로 인증되었습니다.
            <br />
            로그인 후 서비스를 이용해주세요.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  // 실패
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900">인증 링크가 유효하지 않습니다</h2>
        <p className="text-sm text-slate-600">
          {errorMsg || '인증 링크가 만료되었거나 유효하지 않습니다.'}
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          로그인으로 이동
        </Link>
      </div>
    </div>
  );
}

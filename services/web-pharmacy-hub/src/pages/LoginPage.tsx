/**
 * LoginPage — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 공통 users 인증을 재사용하고 serviceKey='pharmacy-hub' 를 명시한다.
 * Pharmacy-Hub 미가입자는 backend 에서 401 SERVICE_NOT_MEMBER 로 차단된다
 * (다른 서비스 회원 자동 편입 없음).
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/service';

/**
 * 공개 데모용 테스트 계정 (매장 경영자).
 * O4O 를 처음 접하는 참여자가 바로 체험할 수 있도록 의도적으로 공개한 공용 계정이며,
 * 실제 운영 계정이 아니다. 값 변경 시 docs/local/TEST-ACCOUNTS.local.md (SSOT) 도 함께 갱신한다.
 */
const DEMO_ACCOUNT = {
  label: '테스트 매장 경영자',
  email: 'renagang21@gmail.com',
  password: 'o4otestID',
} as const;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1:
  //   guard 가 `state.from` 에 원래 가려던 경로를 담아 보낸다(4개 서비스 공통 계약).
  //   Pharmacy-Hub 만 이를 버리고 항상 '/' 로 보내고 있었다 → 복원 경로를 사용한다.
  const returnUrl = (useLocation().state as { from?: string } | null)?.from;
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1: result object 계약
      const result = await login(email, password);
      if (!result.success) {
        setError(
          result.code === 'SERVICE_NOT_MEMBER'
            ? `${BRAND.nameKo} 가입 회원이 아닙니다. 가입 신청 후 운영자 승인을 받아 주세요.`
            : (result.error ?? '로그인에 실패했습니다.'),
        );
        return;
      }
      // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1 §5-F:
      //   제한 로그인 계정(users.status=pending)은 가입 상태 확인 화면으로만 보낸다.
      //   상품·주문·콘텐츠 진입점은 노출하지 않는다.
      const accountAccess = (result.user as { accountAccess?: string } | undefined)?.accountAccess;
      if (accountAccess === 'restricted') {
        navigate('/join/status');
      } else {
        navigate(returnUrl || '/');
      }
    } catch (err) {
      console.error('[Login] Post-login error:', err);
      setError('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-xl font-bold">{BRAND.name} 로그인</h1>
      <p className="mb-6 text-sm text-gray-500">{BRAND.nameKo}</p>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <label className="block text-sm">
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          비밀번호
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              title={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center p-1 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-primary-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {submitting ? '로그인 중…' : '로그인'}
        </button>

        {/* 체험용 계정 자동 입력 — 클릭하면 이메일·비밀번호가 위 입력란에 채워진다. */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO_ACCOUNT.email);
              setPassword(DEMO_ACCOUNT.password);
              setShowPassword(true);
              setError(null);
            }}
            className="w-full rounded border border-dashed border-primary-100 px-3 py-2 text-sm text-primary-700 hover:bg-primary-50"
          >
            {DEMO_ACCOUNT.label} 계정으로 채우기
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            체험용 공용 계정입니다. 입력 후 로그인 버튼을 눌러 주세요.
          </p>
        </div>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-primary-600 underline">
          비밀번호를 잊으셨나요?
        </Link>
      </p>

      <p className="mt-2 text-center text-sm">
        <Link to="/join" className="text-primary-600 underline">
          가입 신청
        </Link>
        {' · '}
        <Link to="/join/status" className="text-primary-600 underline">
          신청 상태 확인
        </Link>
        {' · '}
        <Link to="/" className="text-gray-500 underline">
          처음으로
        </Link>
      </p>
    </div>
  );
}

/**
 * LoginPage — KPA Branch
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기 = 기본 진입 · email/password = 임시 테스트/전환용
 *
 * 기존 O4O 로그인 계약 그대로. serviceKey 는 config/service.ts 한 곳에서만 온다
 * (로그인 API 는 serviceKey 가 없으면 다른 축으로 검증돼 정상 계정도 401 이 된다).
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth, type BranchUser } from '../contexts/AuthContext';
import { BRAND } from '../config/service';

/** 분회 서비스는 자체 약관/개인정보 화면이 없다 — 대표 도메인의 게시본으로 연결한다. */
const PLATFORM_TERMS_URL = 'https://neture.co.kr/terms';
const PLATFORM_PRIVACY_URL = 'https://neture.co.kr/privacy';

export default function LoginPage() {
  const { login, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/me');
      } else {
        setError(result.error ?? '로그인에 실패했습니다.');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-gray-900">{BRAND.nameKo} 로그인</h1>

      {/* WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기(기본) — 미등록이면 약관 동의 → 계정 생성 */}
      <div className="mt-6">
        <GoogleContinue<BranchUser>
          getConfig={getGoogleAuthConfig}
          loginWithGoogle={loginWithGoogle}
          signupWithGoogle={signupWithGoogle}
          onSuccess={() => { setError(null); navigate('/me'); }}
          onStart={() => setError(null)}
          onError={(e) => setError(e.message)}
          termsHref={PLATFORM_TERMS_URL}
          privacyHref={PLATFORM_PRIVACY_URL}
        />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">임시 테스트 · 전환용 이메일 로그인</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="username"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-primary-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? '로그인 중…' : '이메일로 로그인 (임시)'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        아직 회원이 아니신가요?{' '}
        <Link to="/join" className="font-medium text-primary-600 underline">
          가입 신청
        </Link>
      </p>
    </div>
  );
}

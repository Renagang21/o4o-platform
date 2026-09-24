/**
 * JoinPage — KPA Branch 가입 신청
 * WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   계정은 Google 로그인으로 먼저 만들어진다. 이 화면은 그 세션에 분회 서비스 가입 신청만 붙인다
 *   (이메일·비밀번호·이름 입력 없음 — Identity 는 Google sub → users.id).
 *
 * `POST /kpa-branch/join` 하나로 끝난다. 분회 소속(branch_memberships)은 여기서 만들지 않는다 —
 * 가입 승인 후 운영자가 분회에 등록한다. 면허번호·직역은 가입 시점에 canonical 약사 프로필로 승격되며,
 * 이후 회원콘솔·신상신고 prefill 이 같은 값을 읽는다.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { GoogleContinue } from '@o4o/auth-react';
import { BRAND } from '../config/service';
import { useAuth, type BranchUser } from '../contexts/AuthContext';
import { applyBranchJoin, toJoinFailure, JOIN_ACTIVITY_TYPE_OPTIONS } from '../lib/api/join';

const inputCls = 'w-full rounded border border-gray-300 px-3 py-2 text-sm';

/** 분회 서비스는 자체 약관/개인정보 화면이 없다 — 대표 도메인의 게시본으로 연결한다. */
const PLATFORM_TERMS_URL = 'https://neture.co.kr/terms';
const PLATFORM_PRIVACY_URL = 'https://neture.co.kr/privacy';

export default function JoinPage() {
  const { user, isLoading, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [activityType, setActivityType] = useState('');
  const [tos, setTos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tos) {
      setError('이용약관에 동의해야 가입 신청할 수 있습니다.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await applyBranchJoin({
        ...(licenseNumber.trim() ? { licenseNumber: licenseNumber.trim() } : {}),
        ...(activityType ? { activityType } : {}),
        tos: true,
      });
      setDone(true);
    } catch (err) {
      const f = toJoinFailure(err);
      setError(f.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-xl font-bold text-gray-900">가입 신청이 접수되었습니다</h1>
        <p className="mt-3 text-sm text-gray-600">
          분회 운영자의 승인 후 이용할 수 있습니다. 승인되면 같은 Google 계정으로 로그인해 주세요.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-primary-600 underline">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="mx-auto max-w-sm px-4 py-16 text-sm text-gray-500">확인 중…</div>;
  }

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 계정 생성은 Google 하나 — 먼저 로그인한다.
  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-xl font-bold text-gray-900">{BRAND.nameKo} 가입 신청</h1>
        <p className="mt-2 text-sm text-gray-500">
          먼저 Google 계정으로 로그인해 주세요. 계정이 없으면 같은 버튼에서 약관 동의 후 만들어집니다.
        </p>
        <div className="mt-6">
          <GoogleContinue<BranchUser>
            getConfig={getGoogleAuthConfig}
            loginWithGoogle={loginWithGoogle}
            signupWithGoogle={signupWithGoogle}
            onSuccess={() => setError(null)}
            onStart={() => setError(null)}
            onError={(e) => setError(e.message)}
            termsHref={PLATFORM_TERMS_URL}
            privacyHref={PLATFORM_PRIVACY_URL}
          />
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-gray-900">{BRAND.nameKo} 가입 신청</h1>
      <p className="mt-2 text-sm text-gray-500">
        신청 후 분회 운영자의 승인을 거쳐 회원이 됩니다.
      </p>
      <p className="mt-2 text-sm text-gray-600">
        로그인 계정: <span className="font-medium">{user.email ?? user.name ?? '내 Google 계정'}</span>
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="text"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="약사 면허번호"
          className={inputCls}
          maxLength={100}
        />
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className={inputCls}
          aria-label="직역 구분"
        >
          <option value="">직역 구분 (선택)</option>
          {JOIN_ACTIVITY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} className="mt-0.5" />
          <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-primary-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? '신청 중…' : '가입 신청'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        이미 회원이신가요?{' '}
        <Link to="/login" className="font-medium text-primary-600 underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

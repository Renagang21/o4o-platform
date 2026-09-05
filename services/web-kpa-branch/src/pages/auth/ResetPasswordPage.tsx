/**
 * ResetPasswordPage — KPA Branch
 * WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1
 *
 * 비밀번호 재설정 메일의 착지점이다.
 *   base URL: getServiceOrigin('kpa-branch') = https://kpa-society.co.kr/kpa
 *   링크    : {base}/reset-password?token=...
 *
 * 이 경로는 **분회 축이 아니다**. 토큰은 사용자 계정에 묶이고 분회 소속은 로그인 후
 * branch_memberships 가 판정하므로 branchSlug 를 요구하지 않는다
 * (`/login` · `/me` 와 같은 공용 fallback 계층).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PASSWORD_POLICY_RULES, checkPasswordPolicy } from '@o4o/auth-utils';
import { API_BASE_URL } from '../../lib/apiClient';
import { SERVICE_KEY, BRAND } from '../../config/service';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policy = checkPasswordPolicy(password);
  const matched = password.length > 0 && password === confirmPassword;
  const canSubmit = policy.valid && matched && !busy;

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => navigate('/login'), 3000);
    return () => clearTimeout(timer);
  }, [done, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      // serviceKey 를 함께 보낸다 — 토큰의 serviceKey 와 일치할 때만 통과한다
      // (WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1: 다른 서비스 토큰 재사용 방지).
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, serviceKey: SERVICE_KEY }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success !== false) {
        setDone(true);
      } else {
        setError(body?.error ?? '비밀번호를 변경하지 못했습니다. 링크가 만료되었을 수 있습니다.');
      }
    } catch {
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-gray-900">유효하지 않은 링크입니다</h1>
        <p className="mt-2 text-sm text-gray-500">비밀번호 재설정 링크가 올바르지 않습니다.</p>
        <Link to="/login" className="mt-4 inline-block text-sm text-primary-700 hover:underline">
          로그인으로 이동
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-gray-900">비밀번호를 변경했습니다</h1>
        <p className="mt-2 text-sm text-gray-500">3초 후 로그인 화면으로 이동합니다.</p>
        <Link to="/login" className="mt-4 inline-block text-sm text-primary-700 hover:underline">
          바로 로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-gray-900">{BRAND.nameKo} 비밀번호 재설정</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호"
          autoComplete="new-password"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="새 비밀번호 확인"
          autoComplete="new-password"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          required
        />
        <ul className="space-y-1 text-xs text-gray-500">
          {PASSWORD_POLICY_RULES.map((rule) => (
            <li key={rule.key} className={policy[rule.key] ? 'text-green-600' : ''}>
              · {rule.label}
            </li>
          ))}
          <li className={matched ? 'text-green-600' : ''}>· 두 비밀번호가 일치</li>
        </ul>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded bg-primary-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  );
}

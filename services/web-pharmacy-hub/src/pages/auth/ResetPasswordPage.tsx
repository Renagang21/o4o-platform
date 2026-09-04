/**
 * ResetPasswordPage — 비밀번호 재설정 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-PASSWORD-RECOVERY-UI-FIX-V1
 *
 * 이메일 링크 진입: /reset-password?token=xxx
 *   POST /api/v1/auth/reset-password { token, password, serviceKey }
 *
 * serviceKey 를 함께 보내면 backend 가 토큰의 serviceKey 와 일치를 검증하고
 * Identity V2 계약대로 service_credentials(service_key='pharmacy-hub') 만 갱신한다
 * (users.password 는 건드리지 않는다).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PASSWORD_POLICY_RULES, checkPasswordPolicy } from '@o4o/auth-utils';
import { api } from '../../lib/apiClient';
import { BRAND, SERVICE_KEY } from '../../config/service';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policy = checkPasswordPolicy(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = policy.valid && passwordsMatch && !submitting;

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate('/login'), 3000);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12">
        <h1 className="mb-1 text-xl font-bold">유효하지 않은 링크</h1>
        <p className="mb-6 text-sm text-gray-600">
          비밀번호 재설정 링크가 올바르지 않거나 만료되었습니다. 다시 요청해 주세요.
        </p>
        <Link
          to="/forgot-password"
          className="inline-block rounded bg-primary-600 px-3 py-2 text-sm text-white"
        >
          비밀번호 찾기로 이동
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12">
        <h1 className="mb-1 text-xl font-bold">비밀번호 변경 완료</h1>
        <p className="mb-6 text-sm text-gray-600">
          새 비밀번호로 로그인해 주세요. 3초 후 로그인 화면으로 이동합니다.
        </p>
        <Link to="/login" className="inline-block rounded bg-primary-600 px-3 py-2 text-sm text-white">
          로그인하기
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password,
        serviceKey: SERVICE_KEY,
      });
      if (response.data?.success) {
        setSuccess(true);
      } else {
        setError(
          response.data?.error ||
            response.data?.message ||
            '비밀번호 재설정에 실패했습니다. 링크가 만료되었을 수 있습니다.',
        );
      }
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string; message?: string } } }).response?.data;
      setError(
        data?.error ||
          data?.message ||
          '서버와의 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-xl font-bold">비밀번호 재설정</h1>
      <p className="mb-6 text-sm text-gray-500">{BRAND.nameKo}</p>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <label className="block text-sm">
          새 비밀번호
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          비밀번호 확인
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          비밀번호 표시
        </label>

        {/* 공용 비밀번호 정책 (WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1) */}
        <ul className="space-y-1 rounded bg-gray-50 p-3 text-xs">
          {PASSWORD_POLICY_RULES.map((rule) => (
            <li key={rule.key} className={policy[rule.key] ? 'text-green-700' : 'text-gray-500'}>
              {policy[rule.key] ? '✓' : '·'} {rule.label}
            </li>
          ))}
          <li className={passwordsMatch ? 'text-green-700' : 'text-gray-500'}>
            {passwordsMatch ? '✓' : '·'} 비밀번호 일치
          </li>
        </ul>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded bg-primary-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {submitting ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-primary-600 underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}

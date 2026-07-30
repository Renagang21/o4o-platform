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
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/service';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const wrapped = err as Error & { code?: string };
      setError(
        wrapped.code === 'SERVICE_NOT_MEMBER'
          ? `${BRAND.nameKo} 가입 회원이 아닙니다. 가입 신청 후 운영자 승인을 받아 주세요.`
          : wrapped.message,
      );
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-primary-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
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

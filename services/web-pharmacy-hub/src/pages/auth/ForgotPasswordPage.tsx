/**
 * ForgotPasswordPage — 비밀번호 찾기 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-PASSWORD-RECOVERY-UI-FIX-V1
 *
 * 공통 auth backend 를 그대로 사용한다 — 신규 API/인증 구조를 만들지 않는다.
 *   POST /api/v1/auth/forgot-password { email, serviceKey, serviceUrl }
 *
 * serviceKey 는 config/service.ts (프론트 SSOT) 에서만 읽는다.
 * serviceUrl 은 backend ALLOWED_ORIGINS 화이트리스트 검증을 통과해야 하며,
 * 통과 실패 시에도 backend 가 serviceKey 로 production origin 을 도출한다.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { BRAND, SERVICE_KEY } from '../../config/service';

const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || `https://${BRAND.domain}`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', {
        email,
        serviceKey: SERVICE_KEY,
        serviceUrl: SERVICE_URL,
      });
      // backend 는 이메일 열거 방지를 위해 계정 존재 여부와 무관하게 성공을 반환한다.
      setSubmitted(true);
    } catch {
      setError('서버와의 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-xl font-bold">비밀번호 찾기</h1>
      <p className="mb-6 text-sm text-gray-500">{BRAND.nameKo}</p>

      {submitted ? (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-900">
            비밀번호 재설정 안내 메일을 보냈습니다.
          </p>
          <p className="text-sm text-gray-600">
            가입된 계정이면 메일이 도착합니다. 링크는 1시간 동안만 유효합니다.
            메일이 보이지 않으면 스팸함도 확인해 주세요.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setEmail('');
            }}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            다른 이메일로 다시 보내기
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">
            가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>
          <label className="block text-sm">
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full rounded bg-primary-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {submitting ? '전송 중…' : '재설정 링크 보내기'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-primary-600 underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}

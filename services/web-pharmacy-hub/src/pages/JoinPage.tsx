/**
 * JoinPage — Pharmacy-Hub 가입 신청
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-B
 *
 * 흐름: 최소 정보 입력 → 신청 → 승인 대기 안내.
 *   - serviceKey 는 클라이언트가 보내지 않는다. 서버가 'pharmacy-hub' 로 강제한다.
 *   - 가입 역할은 약국 경영자 하나뿐이라 선택 단계가 없다
 *     (WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1).
 *     공급자는 Pharmacy-Hub 회원이 아니고, 운영자·강사는 자가 신청이 아니라 사후 부여다.
 *   - 신규 사용자·기존 O4O 사용자 모두 동일 폼을 사용한다 (백엔드가 이메일로 분기).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { BRAND } from '../config/service';

/** 유일한 가입 역할 — 백엔드 `ALLOWED_ROLE_TYPES` 와 같은 표다. */
const ROLE_TYPE = 'store_owner' as const;

const FIELD_LABEL: Record<string, string> = {
  name: '이름',
  phone: '연락처',
  businessName: '약국명',
  email: '이메일',
  password: '비밀번호',
};

export default function JoinPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    businessName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMissing([]);
    setSubmitting(true);
    try {
      await api.post('/pharmacy-hub/join', {
        roleType: ROLE_TYPE,
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        businessName: form.businessName,
        tos: true,
        privacyAccepted: true,
      });
      navigate('/join/status?submitted=1');
    } catch (err) {
      const res = (err as { response?: { data?: { error?: string; missingFields?: string[] } } }).response;
      setError(res?.data?.error ?? '가입 신청에 실패했습니다.');
      setMissing(res?.data?.missingFields ?? []);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">{BRAND.name} 가입 신청</h1>
      <p className="mb-6 text-sm text-gray-500">
        {BRAND.nameKo} — 신청 후 서비스 운영자의 승인이 필요합니다.
      </p>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700">약국 경영자 정보</h2>

          <label className="block text-sm">
            이메일
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            비밀번호
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-gray-400">
              기존 O4O 계정이 있어도 파머시 허브 전용 비밀번호로 신청할 수 있습니다.
            </span>
          </label>
          <label className="block text-sm">
            이름
            <input
              value={form.name}
              onChange={set('name')}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            연락처
            <input
              value={form.phone}
              onChange={set('phone')}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            약국명
            <input
              value={form.businessName}
              onChange={set('businessName')}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>

          {error && (
            <div className="text-sm text-red-600">
              <p>{error}</p>
              {missing.length > 0 && (
                <p className="mt-1 text-xs">
                  누락 항목: {missing.map((f) => FIELD_LABEL[f] ?? f).join(', ')}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-primary-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {submitting ? '신청 중…' : '가입 신청'}
          </button>
      </form>

      <p className="mt-4 text-center text-sm">
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

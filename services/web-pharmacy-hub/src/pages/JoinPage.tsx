/**
 * JoinPage — Pharmacy-Hub 가입 신청
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-B
 *
 * 흐름: 최소 정보 입력 → 신청 → 승인 대기 안내.
 *   - serviceKey 는 클라이언트가 보내지 않는다. 서버가 'pharmacy-hub' 로 강제한다.
 *   - 가입 유형은 **약사 회원 / 약국 경영자** 둘뿐이다
 *     (WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1).
 *     차이는 매장 경영 capability 하나뿐이며, 약사 회원에게는 약국 경영 정보를 묻지 않는다.
 *     공급자는 Pharmacy-Hub 회원이 아니고(REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1),
 *     운영자·관리자·강사·커뮤니티 운영자는 자가 신청이 아니라 사후 부여다.
 *   - 신규 사용자·기존 O4O 사용자 모두 동일 폼을 사용한다 (백엔드가 이메일로 분기).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublishedPolicyDocument } from '@o4o/shared-space-ui';
import { api } from '../lib/apiClient';
import { BRAND, SERVICE_KEY } from '../config/service';
import { loadPolicy } from './legal/PolicyDocumentPage';

/** 가입 유형 — 백엔드 `ALLOWED_ROLE_TYPES` 와 같은 표다. */
const ROLE_TYPES = [
  {
    value: 'member' as const,
    label: '약사 회원',
    description: '커뮤니티·교육·콘텐츠를 이용합니다. 약국 경영 정보는 입력하지 않습니다.',
  },
  {
    value: 'store_owner' as const,
    label: '약국 경영자',
    description: '위 회원 기능에 더해 매장 허브·매장 경영 기능을 이용합니다.',
  },
];
type RoleType = (typeof ROLE_TYPES)[number]['value'];

const FIELD_LABEL: Record<string, string> = {
  name: '이름',
  phone: '연락처',
  businessName: '약국명',
  email: '이메일',
  password: '비밀번호',
};

export default function JoinPage() {
  const navigate = useNavigate();
  const [roleType, setRoleType] = useState<RoleType>('member');
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
  // WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §11:
  //   약관·개인정보 처리방침 동의는 사용자가 직접 체크한다(하드코딩 제거). 이용약관은 published 문서의
  //   id/version 을 payload 에 실어 "보여준 약관 그대로" 승낙이 기록되게 한다(서버 재검증).
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const terms = usePublishedPolicyDocument(SERVICE_KEY, 'terms', loadPolicy);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMissing([]);
    if (!agreeTerms || !agreePrivacy) {
      setError('이용약관과 개인정보 처리방침에 동의해야 가입 신청할 수 있습니다.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/pharmacy-hub/join', {
        roleType,
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        // 약국명은 약국 경영자 신청에만 보낸다 (백엔드 검증 축과 같은 표).
        ...(roleType === 'store_owner' ? { businessName: form.businessName } : {}),
        tos: agreeTerms,
        privacyAccepted: agreePrivacy,
        // published 이용약관 식별자 (게시 전에는 비어 있고 서버도 요구하지 않는다)
        ...terms.signupFields,
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
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-gray-700">가입 유형</legend>
            {ROLE_TYPES.map((r) => (
              <label
                key={r.value}
                className={`flex cursor-pointer gap-3 rounded border p-3 text-sm ${
                  roleType === r.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="roleType"
                  value={r.value}
                  checked={roleType === r.value}
                  onChange={() => setRoleType(r.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-gray-800">{r.label}</span>
                  <span className="block text-xs text-gray-500">{r.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <h2 className="pt-2 text-sm font-semibold text-gray-700">
            {roleType === 'store_owner' ? '약국 경영자 정보' : '약사 회원 정보'}
          </h2>

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

          {roleType === 'store_owner' && (
            <label className="block text-sm">
              약국명
              <input
                value={form.businessName}
                onChange={set('businessName')}
                required
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
          )}

          <fieldset className="space-y-2 rounded border border-gray-200 p-3">
            <legend className="text-sm font-semibold text-gray-700">약관 동의</legend>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="text-red-600">*</span>{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
                  이용약관
                </Link>
                에 동의합니다
                {terms.status === 'ok' && terms.doc ? (
                  <span className="ml-1 text-xs text-gray-400">(v{terms.doc.version})</span>
                ) : null}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="text-red-600">*</span>{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
                  개인정보 처리방침
                </Link>
                에 동의합니다
              </span>
            </label>
            {terms.status === 'error' && (
              <p className="text-xs text-red-600">이용약관을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</p>
            )}
          </fieldset>

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
            disabled={submitting || !agreeTerms || !agreePrivacy}
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

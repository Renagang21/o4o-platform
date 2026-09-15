/**
 * ServiceApplyPanel — 로그인 회원의 공급자 · 파트너 서비스 신청 · 상태 패널 (랜딩 페이지용)
 *
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * O4O 계정이 이미 있는 회원은 "회원가입" 이 아니라 **서비스 신청** 을 한다.
 *   none      → 신청 폼 (POST /supplier/register · POST /partner/register — 기존 신청 API 재사용)
 *   pending   → 신청 중 (승인 대기)
 *   active    → 업무 공간 진입
 *   rejected  → 반려 안내 (파트너는 다시 신청 가능 · 공급자는 운영자 문의)
 *   suspended / withdrawn → 안내만
 * 상태 출처는 서버 serviceStates 뿐이다 (role 문자열로 판정하지 않는다).
 */

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import { ADMIN_ROLES } from '../../lib/role-constants';
import { NETURE_SERVICE_INFO, SERVICE_STATUS_LABELS } from '../../lib/home-entry';
import { useNetureServiceStates } from '../../lib/neture-service-state';

type ServiceKey = 'supplier' | 'partner';

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_NAME: '이름(회사명)을 입력해 주세요.',
  INVALID_SLUG: '식별자는 영문 소문자 · 숫자 · 하이픈(-)만 사용할 수 있습니다.',
  SLUG_ALREADY_EXISTS: '이미 사용 중인 식별자입니다. 다른 값을 입력해 주세요.',
  USER_ALREADY_HAS_SUPPLIER: '이미 공급자 서비스 신청 이력이 있습니다. 운영자에게 문의해 주세요.',
  USER_ALREADY_HAS_PARTNER: '이미 파트너 서비스 신청 이력이 있습니다.',
};

export function ServiceApplyPanel({ service }: { service: ServiceKey }) {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = (user?.roles ?? []).some((r) => ADMIN_ROLES.includes(r));
  const { states, loading, error, reload } = useNetureServiceStates(isAuthenticated && !isAdmin);
  const info = NETURE_SERVICE_INFO[service];

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isAuthenticated) return null;

  const box = 'bg-white/95 text-gray-900 rounded-xl p-6 text-left max-w-lg mx-auto shadow-lg';

  if (isAdmin) {
    return (
      <div className={box} data-testid={`service-apply-${service}-admin`}>
        <p className="text-sm text-gray-600 mb-3">관리자 계정입니다. 운영 목적으로 {info.workLabel} 공간에 들어갈 수 있습니다.</p>
        <Link to={info.work} className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800">
          {info.workLabel}로 이동 <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (loading || (!states && !error)) {
    return <div className={box}><p className="text-sm text-gray-500">서비스 이용 상태를 확인하는 중...</p></div>;
  }

  if (error || !states) {
    return (
      <div className={box} data-testid={`service-apply-${service}-error`}>
        <p className="text-sm text-red-600 mb-3">{error ?? '서비스 이용 상태를 불러오지 못했습니다.'}</p>
        <button type="button" onClick={reload} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium">다시 시도</button>
      </div>
    );
  }

  const status = states[service].status;
  const header = (
    <p className="text-xs font-medium text-gray-500 mb-2">
      {info.name} · {SERVICE_STATUS_LABELS[status]}
    </p>
  );

  if (status === 'active') {
    return (
      <div className={box} data-testid={`service-apply-${service}-active`}>
        {header}
        <p className="text-sm text-gray-700 mb-4">{info.name}를 이용 중입니다.</p>
        <Link to={info.work} className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800">
          {info.workLabel}로 이동 <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className={box} data-testid={`service-apply-${service}-pending`}>
        {header}
        <p className="text-sm text-gray-700">신청이 접수되어 운영자 승인을 기다리고 있습니다. 승인되면 대표 홈의 <b>내가 이용하는 서비스</b>에 나타납니다.</p>
      </div>
    );
  }

  const supplierClosed = service === 'supplier' && (status === 'rejected' || status === 'withdrawn');
  if (status === 'suspended' || supplierClosed) {
    return (
      <div className={box} data-testid={`service-apply-${service}-${status}`}>
        {header}
        <p className="text-sm text-gray-700">
          {status === 'suspended'
            ? `${info.name} 이용이 정지된 상태입니다. 자세한 내용은 운영자에게 문의해 주세요.`
            : `${info.name} 신청이 ${status === 'rejected' ? '반려' : '종료'}된 상태입니다. 재신청은 운영자에게 문의해 주세요.`}
          {' '}O4O 계정과 다른 서비스 이용에는 영향이 없습니다.
        </p>
      </div>
    );
  }

  // none · (partner) rejected / withdrawn → 신청 폼
  const isReapply = status !== 'none';
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (service === 'supplier') {
        await api.post('/neture/supplier/register', { name: name.trim(), slug: slug.trim(), contactEmail: contactEmail.trim() || user?.email });
      } else {
        await api.post('/neture/partner/register', { name: name.trim() || user?.name || '', businessName: businessName.trim() || undefined });
      }
      reload();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      setSubmitError((code && ERROR_MESSAGES[code]) || '신청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <form onSubmit={submit} className={box} data-testid={`service-apply-${service}-${status}`}>
      {header}
      <p className="text-sm text-gray-700 mb-4">
        {isReapply
          ? `${info.name} 신청이 반려되었습니다. 내용을 확인한 뒤 다시 신청할 수 있습니다.`
          : `이미 O4O 계정으로 로그인되어 있습니다. 회원가입 없이 ${info.name}만 신청합니다.`}
      </p>
      {service === 'supplier' ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">회사명 *</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">식별자(slug) * <span className="text-gray-400">영문 소문자 · 숫자 · 하이픈</span></span>
            <input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9-]+" maxLength={60} />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">담당자 이메일</span>
            <input className={input} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={user?.email} />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">파트너 이름 *</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={user?.name} maxLength={100} />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">사업자명 (선택)</span>
            <input className={input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={100} />
          </label>
        </div>
      )}
      {submitError && <p className="text-sm text-red-600 mt-3">{submitError}</p>}
      <button type="submit" disabled={submitting} className="mt-4 inline-flex items-center px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50">
        {submitting ? '신청 중...' : isReapply ? '다시 신청하기' : `${info.name} 신청`}
      </button>
    </form>
  );
}

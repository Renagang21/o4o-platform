/**
 * Neture 가입 승인 상태 안내 — AI 입력창 자리 (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5)
 *
 * 메인 AI 는 Neture 가입 승인(active) 회원만 쓴다. 승인 전에는 입력창 대신 상태별 안내를 보인다.
 * 이 화면은 안내일 뿐이고 실제 판정은 서버 guard(`requireNetureMainMembership`)가 한다.
 *
 *   none      → "Neture 가입 승인이 필요합니다" + 가입 신청
 *   pending   → "가입 승인 대기 중입니다"
 *   rejected  → 반려 안내 + 다시 신청
 *   suspended → 정지 안내 (신청 버튼 없음 — 운영자 문의)
 *   withdrawn → 해지 안내 (신청 버튼 없음)
 */
import { useState } from 'react';
import { api } from '../../lib/apiClient';
import type { NetureServiceUsageStatus } from '../../lib/home-entry';

const COPY: Record<Exclude<NetureServiceUsageStatus, 'active'>, { title: string; body: string }> = {
  none: {
    title: 'Neture 가입 승인이 필요합니다',
    body: 'AI 업무 도우미는 Neture 가입 승인 후 이용할 수 있습니다. 가입을 신청하면 운영자 확인 후 승인됩니다.',
  },
  pending: {
    title: '가입 승인 대기 중입니다',
    body: '운영자가 Neture 가입 신청을 확인하고 있습니다. 승인되면 바로 AI 업무 도우미를 이용할 수 있습니다.',
  },
  rejected: {
    title: 'Neture 가입이 반려되었습니다',
    body: '가입 정보를 확인한 뒤 다시 신청할 수 있습니다.',
  },
  suspended: {
    title: 'Neture 이용이 정지된 상태입니다',
    body: '정지 기간에는 AI 업무 도우미를 이용할 수 없습니다. 자세한 내용은 운영자에게 문의해 주세요.',
  },
  withdrawn: {
    title: 'Neture 가입이 해지된 상태입니다',
    body: '해지된 가입은 이 화면에서 다시 신청할 수 없습니다. 운영자에게 문의해 주세요.',
  },
};

export function NetureMembershipNotice({
  status,
  onApplied,
}: {
  status: Exclude<NetureServiceUsageStatus, 'active'>;
  onApplied: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[status];
  const canApply = status === 'none' || status === 'rejected';

  const apply = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/services/neture/join');
      onApplied();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.error || '가입 신청을 접수하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="status"
      data-testid="home-neture-membership-notice"
      data-status={status}
      className="mt-5 w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left"
    >
      <p className="m-0 text-sm font-semibold text-slate-900">{copy.title}</p>
      <p className="m-0 mt-1 text-sm leading-relaxed text-slate-600">{copy.body}</p>
      {canApply && (
        <button
          type="button"
          onClick={apply}
          disabled={submitting}
          data-testid="home-neture-membership-apply"
          className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? '신청 중…' : status === 'rejected' ? '다시 신청하기' : 'Neture 가입 신청하기'}
        </button>
      )}
      {error && <p className="m-0 mt-2 text-xs text-rose-700" role="alert">{error}</p>}
    </div>
  );
}

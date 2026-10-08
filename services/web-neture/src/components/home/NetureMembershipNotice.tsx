/** Main eligibility guidance: email verification and account state, no manual approval. */
import type { NetureServiceUsageStatus } from '../../lib/home-entry';

const COPY: Record<Exclude<NetureServiceUsageStatus, 'active'>, { title: string; body: string }> = {
  none: {
    title: '이메일 확인이 필요합니다',
    body: '이메일 확인을 마치면 AI 업무 도우미를 이용할 수 있습니다. 연결 서비스는 별도로 가입합니다.',
  },
  pending: {
    title: '이메일 또는 계정 상태를 확인해 주세요',
    body: '이메일 확인을 완료해 주세요. 이미 확인했다면 계정 상태를 운영자에게 문의해 주세요.',
  },
  rejected: {
    title: 'Neture 가입이 반려되었습니다',
    body: '계정 상태를 운영자에게 문의해 주세요.',
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
}: {
  status: Exclude<NetureServiceUsageStatus, 'active'>;
}) {
  const copy = COPY[status];

  return (
    <div
      role="status"
      data-testid="home-neture-membership-notice"
      data-status={status}
      className="mt-5 w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left"
    >
      <p className="m-0 text-sm font-semibold text-slate-900">{copy.title}</p>
      <p className="m-0 mt-1 text-sm leading-relaxed text-slate-600">{copy.body}</p>
    </div>
  );
}

/** Guidance covers reviewed new signups and compatible legacy account states. */
import type { NetureServiceUsageStatus } from '../../lib/home-entry';

const COPY: Record<Exclude<NetureServiceUsageStatus, 'active'>, { title: string; body: string }> = {
  none: {
    title: '가입 정보와 계정 상태를 확인해 주시기 바랍니다',
    body: '가입 정보를 제출하고 회원 승인을 확인해 주시기 바랍니다. 기존 회원은 계정 상태를 확인해 주시기 바랍니다.',
  },
  pending: {
    title: '가입 정보·승인 및 계정 상태를 확인해 주시기 바랍니다',
    body: '제출한 가입 정보와 승인 상태를 확인해 주시기 바랍니다. 기존 이메일 가입자는 이메일 확인 여부도 확인해 주시기 바랍니다.',
  },
  rejected: {
    title: 'Neture 가입이 반려되었습니다',
    body: '가입 정보 화면에서 보완 사유를 확인해 주시기 바랍니다. 계정 이용 제한은 운영자에게 문의해 주시기 바랍니다.',
  },
  suspended: {
    title: 'Neture 이용이 정지된 상태입니다',
    body: '정지 기간에는 O4O 업무 도우미를 이용할 수 없습니다. 자세한 내용은 운영자에게 문의해 주시기 바랍니다.',
  },
  withdrawn: {
    title: 'Neture 가입이 해지된 상태입니다',
    body: '해지된 가입은 이 화면에서 다시 신청할 수 없습니다. 운영자에게 문의해 주시기 바랍니다.',
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
      {['none','pending','rejected'].includes(status)&&<a href="/signup" className="mt-2 inline-block text-sm underline">가입 정보 확인</a>}
    </div>
  );
}

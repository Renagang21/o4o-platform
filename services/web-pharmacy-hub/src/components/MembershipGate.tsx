/**
 * MembershipGate — Pharmacy-Hub
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-F
 *
 * 서비스별 가입/승인 경계를 프론트에서 강제한다 (backend membership-guard 와 동일 정책).
 * 상태 축은 service_memberships.status 와 1:1 이며, 상태별 다음 행동을 함께 안내한다.
 *   active            → 통과
 *   pending           → 승인 대기 안내 + 신청 상태 확인
 *   rejected          → 반려 안내 + 신청 상태(사유) 확인
 *   suspended/withdrawn → 상태 안내 (운영자 문의)
 *   none              → 미가입 안내 + 가입 신청 CTA (joinEnabled=true)
 *
 * platform:super_admin 만 예외로 통과한다.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getServiceMembershipStatus, isPlatformSuperAdmin } from '../lib/membershipGate';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/service';

const STATUS_MESSAGE: Record<string, string> = {
  pending: '가입 승인 대기 중입니다. 서비스 운영자의 승인 후 이용할 수 있습니다.',
  rejected: '가입 신청이 반려되었습니다. 반려 사유를 확인한 뒤 서비스 운영자에게 재검토를 요청해 주세요.',
  suspended: '이용이 정지된 계정입니다. 서비스 운영자에게 문의해 주세요.',
  withdrawn: '탈퇴 처리된 계정입니다. 서비스 운영자에게 문의해 주세요.',
  none: `${BRAND.nameKo} 가입 회원만 이용할 수 있습니다. 가입 신청 후 운영자 승인을 받아 주세요.`,
};

/** 상태별 다음 행동 링크 — 상태 축과 1:1 로 유지한다. */
const STATUS_ACTION: Record<string, { to: string; label: string } | undefined> = {
  pending: { to: '/join/status', label: '신청 상태 확인' },
  rejected: { to: '/join/status', label: '반려 사유 확인' },
  none: { to: '/join', label: '가입 신청' },
};

function Notice({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-gray-600">{message}</p>
      {action && (
        <p className="mb-3">
          <Link to={action.to} className="inline-block rounded bg-primary-600 px-3 py-2 text-sm text-white">
            {action.label}
          </Link>
        </p>
      )}
      <Link to="/" className="text-sm text-primary-600 underline">
        처음으로
      </Link>
    </div>
  );
}

export function MembershipGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-500">확인 중…</div>;
  }

  if (!isAuthenticated) {
    return (
      <Notice
        title="로그인이 필요합니다"
        message={`${BRAND.nameKo} 이용을 위해 로그인해 주세요. 아직 회원이 아니라면 가입 신청을 진행해 주세요.`}
        action={{ to: '/join', label: '가입 신청' }}
      />
    );
  }

  if (isPlatformSuperAdmin(user)) return <>{children}</>;

  const status = getServiceMembershipStatus(user);
  if (status === 'active') return <>{children}</>;

  return (
    <Notice
      title="이용 권한 없음"
      message={STATUS_MESSAGE[status] ?? STATUS_MESSAGE.none}
      action={STATUS_ACTION[status]}
    />
  );
}

/**
 * MembershipGate — Pharmacy-Hub
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 서비스별 가입/승인 경계를 프론트에서 강제한다 (backend membership-guard 와 동일 정책).
 *   active            → 통과
 *   pending           → 승인 대기 안내
 *   rejected/suspended/withdrawn → 상태 안내
 *   none              → 미가입 안내 (가입 신청 CTA 는 후속 WO — joinEnabled=false)
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
  rejected: '가입 신청이 반려되었습니다. 서비스 운영자에게 문의해 주세요.',
  suspended: '이용이 정지된 계정입니다. 서비스 운영자에게 문의해 주세요.',
  withdrawn: '탈퇴 처리된 계정입니다.',
  none: `${BRAND.nameKo} 가입 회원만 이용할 수 있습니다. 가입 신청 기능은 준비 중입니다.`,
};

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-gray-600">{message}</p>
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
        message={`${BRAND.nameKo} 이용을 위해 로그인해 주세요.`}
      />
    );
  }

  if (isPlatformSuperAdmin(user)) return <>{children}</>;

  const status = getServiceMembershipStatus(user);
  if (status === 'active') return <>{children}</>;

  return <Notice title="이용 권한 없음" message={STATUS_MESSAGE[status] ?? STATUS_MESSAGE.none} />;
}

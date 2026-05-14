/**
 * MembershipGate — GlycoPharm 서비스 membership 진입 gate
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
 *
 * 인증 통과 후 service_memberships(glycopharm).status 검사 — active 가 아니면 상태별 안내.
 *   - 미인증: 본 gate 는 통과시킴 → 호출자(role guard) 가 /login redirect 처리
 *   - super_admin: 통과
 *   - active: 통과
 *   - 그 외: 상태별 안내 화면
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  SERVICE_KEY,
  getServiceMembershipStatus,
  isPlatformSuperAdmin,
  type MembershipStatus,
} from '../../lib/membershipGate';

interface MembershipGateProps {
  children: React.ReactNode;
  serviceKey?: string;
}

export function MembershipGate({ children, serviceKey = SERVICE_KEY }: MembershipGateProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-500 text-sm">이용 권한을 확인하는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  if (isPlatformSuperAdmin(user)) {
    return <>{children}</>;
  }

  const status = getServiceMembershipStatus(user, serviceKey);
  if (status === 'active') {
    return <>{children}</>;
  }

  return <MembershipStatusScreen status={status} serviceKey={serviceKey} />;
}

const STATUS_MESSAGES: Record<Exclude<MembershipStatus, 'active'>, { title: string; message: string }> = {
  none:      { title: '서비스 가입이 필요합니다',  message: '글라이코팜 서비스를 이용하려면 먼저 가입 신청을 해주세요.' },
  pending:   { title: '가입 승인 대기 중',         message: '가입 신청이 승인 대기 중입니다. 승인 완료 후 이용하실 수 있습니다.' },
  rejected:  { title: '가입 신청 반려',             message: '가입 신청이 반려되었습니다. 자세한 사항은 운영자에게 문의해주세요.' },
  suspended: { title: '서비스 이용 정지',          message: '서비스 이용이 정지되었습니다. 자세한 사항은 운영자에게 문의해주세요.' },
  withdrawn: { title: '탈퇴 처리된 서비스',         message: '이 서비스에서 탈퇴 처리되었습니다. 재가입을 원하시면 운영자에게 문의해주세요.' },
};

// GlycoPharm 가입 신청 경로 — 약국 owner 기준 (App.tsx 기준 /apply)
const APPLY_PATH: Partial<Record<string, string>> = {
  glycopharm: '/apply',
};

function MembershipStatusScreen({ status, serviceKey }: { status: Exclude<MembershipStatus, 'active'>; serviceKey: string }) {
  const navigate = useNavigate();
  const info = STATUS_MESSAGES[status];
  const applyPath = APPLY_PATH[serviceKey] ?? null;
  const canApply = status === 'none';
  const icon = status === 'pending' ? '⏳' : status === 'none' ? '📝' : '🚫';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-sm border border-slate-200">
        <div className="text-5xl mb-4">{icon}</div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2.5">{info.title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{info.message}</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {canApply && applyPath && (
            <button
              type="button"
              className="px-5 py-2.5 bg-primary-600 text-white border-none rounded-lg text-sm font-medium cursor-pointer"
              onClick={() => navigate(applyPath)}
            >
              가입 신청하기
            </button>
          )}
          <button
            type="button"
            className="px-5 py-2.5 bg-slate-100 text-slate-700 border-none rounded-lg text-sm font-medium cursor-pointer"
            onClick={() => navigate('/')}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

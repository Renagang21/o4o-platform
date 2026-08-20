/**
 * MembershipGate — Neture 서비스 membership 진입 gate
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §10
 *
 * 인증 통과 후 service_memberships(neture).status 검사 — active 가 아니면 상태별 안내.
 *   - 미인증: 본 gate 는 통과시킴 → 호출자(role guard) 가 /login redirect
 *   - super_admin: 통과
 *   - active: 통과
 *   - 그 외: 상태별 안내 화면 (공통 `MembershipStatusNotice`)
 *
 * ⚠️ Neture 는 다른 4 서비스와 달리 단일 가입 신청 화면 경로가 없다(역할별
 *    신청 동선이 분리돼 있다). 따라서 가입 신청 CTA 를 노출하지 않는다 —
 *    이 WO 범위에서 새 화면을 만들지 않는다(§23). 나머지 문구·마크업은 공통이다.
 */

import { useNavigate } from 'react-router-dom';
import {
  MembershipStatusNotice,
  buildMembershipViewModel,
  type MembershipStatusNoticeAction,
} from '@o4o/account-ui';
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

/** 안내 문구에 넣을 서비스 표시명 (공통 문구의 `{service}` 자리). */
const SERVICE_NAME = '네뚜레(Neture)';

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

  return <MembershipStatusScreen status={status} />;
}

function MembershipStatusScreen({ status }: { status: Exclude<MembershipStatus, 'active'> }) {
  const navigate = useNavigate();
  const membership = buildMembershipViewModel({ status, serviceName: SERVICE_NAME });

  const actions: MembershipStatusNoticeAction[] = [
    { key: 'home', label: '홈으로 돌아가기', onClick: () => navigate('/'), variant: 'secondary' },
  ];

  return (
    <MembershipStatusNotice
      icon={membership.icon}
      title={membership.title}
      message={membership.description}
      statusLabel={membership.statusLabel}
      statusTone={membership.statusTone}
      actions={actions}
    />
  );
}

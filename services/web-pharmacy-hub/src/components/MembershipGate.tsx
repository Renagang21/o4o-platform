/**
 * MembershipGate — Pharmacy-Hub
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-F
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §10
 *
 * 서비스별 가입/승인 경계를 프론트에서 강제한다 (backend membership-guard 와 동일 정책).
 * 상태 축은 service_memberships.status 와 1:1 이며, 상태별 다음 행동을 함께 안내한다.
 *   active            → 통과
 *   pending           → 승인 대기 안내 + 신청 상태 확인
 *   rejected          → 반려 안내 + 신청 상태(사유) 확인
 *   suspended/withdrawn → 상태 안내 (운영자 문의)
 *   none              → 미가입 안내 + 가입 신청 CTA
 *
 * platform:super_admin 만 예외로 통과한다.
 *
 * 안내 화면 마크업은 5 서비스 공통(`MembershipStatusNotice`) 이며, Pharmacy-Hub 는
 * 자체 가입 신청/상태 동선(`/join`, `/join/status`)을 갖고 있으므로 **문구 override 와
 * 상태별 다음 행동만** 이 파일에 남긴다.
 */

import type { ReactNode } from 'react';
import {
  MembershipStatusNotice,
  buildMembershipViewModel,
  type MembershipStatusNoticeAction,
  type MembershipStatusNoticeContent,
} from '@o4o/account-ui';
import { getServiceMembershipStatus, isPlatformSuperAdmin } from '../lib/membershipGate';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/service';

/** 공통 기본 문구와 다른 부분만 덮어쓴다 — 상태 축(enum) 은 그대로다. */
const STATUS_NOTICE_OVERRIDES: Record<string, Partial<MembershipStatusNoticeContent>> = {
  pending: { message: '가입 승인 대기 중입니다. 서비스 운영자의 승인 후 이용할 수 있습니다.' },
  rejected: {
    message:
      '가입 신청이 반려되었습니다. 반려 사유를 확인한 뒤 서비스 운영자에게 재검토를 요청해 주세요.',
  },
  suspended: { message: '이용이 정지된 계정입니다. 서비스 운영자에게 문의해 주세요.' },
  withdrawn: { message: '탈퇴 처리된 계정입니다. 서비스 운영자에게 문의해 주세요.' },
  none: { message: `${BRAND.nameKo} 가입 회원만 이용할 수 있습니다. 가입 신청 후 운영자 승인을 받아 주세요.` },
};

/** 상태별 다음 행동 링크 — 상태 축과 1:1 로 유지한다. */
const STATUS_ACTION: Record<string, MembershipStatusNoticeAction | undefined> = {
  pending: { key: 'status', label: '신청 상태 확인', href: '/join/status', variant: 'primary' },
  rejected: { key: 'status', label: '반려 사유 확인', href: '/join/status', variant: 'primary' },
  none: { key: 'join', label: '가입 신청', href: '/join', variant: 'primary' },
};

const HOME_ACTION: MembershipStatusNoticeAction = {
  key: 'home',
  label: '처음으로',
  href: '/',
  variant: 'secondary',
};

export function MembershipGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-500">확인 중…</div>;
  }

  if (!isAuthenticated) {
    return (
      <MembershipStatusNotice
        title="로그인이 필요합니다"
        message={`${BRAND.nameKo} 이용을 위해 로그인해 주세요. 아직 회원이 아니라면 가입 신청을 진행해 주세요.`}
        actions={[
          { key: 'login', label: '로그인', href: '/login', variant: 'primary' },
          { key: 'join', label: '가입 신청', href: '/join', variant: 'secondary' },
        ]}
      />
    );
  }

  if (isPlatformSuperAdmin(user)) return <>{children}</>;

  const status = getServiceMembershipStatus(user);
  if (status === 'active') return <>{children}</>;

  const membership = buildMembershipViewModel({
    status,
    serviceName: BRAND.nameKo,
    noticeOverrides: STATUS_NOTICE_OVERRIDES,
  });
  const next = STATUS_ACTION[membership.status];

  return (
    <MembershipStatusNotice
      icon={membership.icon}
      title={membership.title}
      message={membership.description}
      statusLabel={membership.statusLabel}
      statusTone={membership.statusTone}
      actions={next ? [next, HOME_ACTION] : [HOME_ACTION]}
    />
  );
}

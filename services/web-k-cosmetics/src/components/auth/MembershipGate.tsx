/**
 * MembershipGate — K-Cosmetics 서비스 membership 진입 gate
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §10
 *
 * 인증 통과 후 service_memberships(k-cosmetics).status 검사 — active 가 아니면 상태별 안내.
 *   - 미인증: 본 gate 는 통과시킴 → 호출자(role guard) 가 /login redirect
 *   - super_admin: 통과
 *   - active: 통과
 *   - 그 외: 상태별 안내 화면 (공통 `MembershipStatusNotice`)
 *
 * 안내 화면 마크업·문구는 5 서비스 공통이며, 이 파일에는 **서비스 고유 값
 * (서비스명 · 가입 신청 경로)** 만 남는다. CTA 색은 이 서비스 Tailwind theme 의
 * `primary`(Pink/Rose) 를 그대로 따르므로 공통 컴포넌트에서 그대로 브랜드가 유지된다.
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
const SERVICE_NAME = 'K-Cosmetics';

/**
 * 서비스별 "가입 신청" CTA 목적지.
 *
 * WO-O4O-PARTNER-APPLICATION-ENTITY-TABLE-CONTRACT-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1:
 *   기존 'k-cosmetics' → '/partners/apply' 항목을 제거했다.
 *   그 페이지의 제출 API(POST /api/v1/partner/applications)는 `/api/v1/partner` 마운트에 가려
 *   401/403('Partner role required')로만 응답했고, 대상 테이블 partner_applications 는
 *   migration 이 없어 프로덕션에 존재한 적이 없다. 즉 **한 번도 동작한 적 없는 CTA** 였다.
 *
 *   canonical 신청 축은 `POST /api/v1/cosmetics/stores/apply`
 *   → `cosmetics.cosmetics_store_applications` → 운영자 검수 콘솔(`/operator/applications`) 이다.
 *   다만 이 canonical 축에는 **아직 매장용 신청 UI 가 없다**. UI 가 생기면 여기에 그 경로를 넣는다.
 *   (동작하지 않는 CTA 를 남기는 것보다 노출하지 않는 편이 정확하다 — dead CTA 0.)
 */
const APPLY_PATH: Partial<Record<string, string>> = {};

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

function MembershipStatusScreen({
  status,
  serviceKey,
}: {
  status: Exclude<MembershipStatus, 'active'>;
  serviceKey: string;
}) {
  const navigate = useNavigate();
  const membership = buildMembershipViewModel({ status, serviceName: SERVICE_NAME });
  const applyPath = APPLY_PATH[serviceKey] ?? null;

  const actions: MembershipStatusNoticeAction[] = [];
  // 아직 가입 이력이 없을 때만 신청 CTA 를 노출한다.
  if (!membership.membershipExists && applyPath) {
    actions.push({ key: 'apply', label: '가입 신청하기', href: applyPath, variant: 'primary' });
  }
  actions.push({
    key: 'home',
    label: '홈으로 돌아가기',
    onClick: () => navigate('/'),
    variant: 'secondary',
  });

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

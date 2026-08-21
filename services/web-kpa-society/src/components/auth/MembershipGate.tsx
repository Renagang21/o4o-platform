/**
 * MembershipGate — KPA Society 서비스 membership 진입 gate
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §10
 *
 * 사용 위치: 인증 통과 직후 (RoleGuard / PharmacyGuard 등 기존 role guard 내부).
 *   - 미인증: 본 gate 는 통과시킴 → 호출자(role guard) 가 /login redirect 처리
 *   - super_admin: 통과
 *   - membership active: 통과
 *   - 그 외 (none / pending / rejected / suspended / withdrawn): 상태별 안내 화면
 *
 * 안내 화면 마크업·문구는 5 서비스 공통(`MembershipStatusNotice` +
 * `buildMembershipViewModel`)이며, 이 파일에는 **서비스 고유 값(서비스명 · 가입
 * 신청 경로)** 만 남는다. 상태 판정은 `@o4o/auth-utils` SSOT 를 그대로 쓴다.
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
  /** 기본 'kpa-society'. 다른 service key 로 gate 가 필요할 때만 override. */
  serviceKey?: string;
}

/** 안내 문구에 넣을 서비스 표시명 (공통 문구의 `{service}` 자리). */
const SERVICE_NAME = 'KPA-Society';

/**
 * 가입 신청 화면 경로. 값이 없으면 신청 CTA 를 노출하지 않는다.
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-VERIFICATION-CLOSURE-V1 §7:
 * KPA-Society 에는 `/member/apply` route 가 존재하지 않는다 (catch-all → NotFoundPage).
 * 살아있지 않은 경로를 CTA 로 노출하면 dead navigation 이므로 매핑을 비워 둔다.
 * KPA 가입 신청 화면이 실제로 생기면 그때 canonical 경로를 여기에 추가한다.
 */
const APPLY_PATH: Partial<Record<string, string>> = {};

export function MembershipGate({ children, serviceKey = SERVICE_KEY }: MembershipGateProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-slate-500 text-sm">이용 권한을 확인하는 중...</p>
      </div>
    );
  }

  // 미인증은 본 gate 의 책임이 아님 — 상위 role guard 가 /login 으로 보낸다.
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

// ─────────────────────────────────────────────────────
// Status Screen (조회/안내 전용 — 편집/관리 진입점 없음)
// ─────────────────────────────────────────────────────

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

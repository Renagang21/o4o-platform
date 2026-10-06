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
 *
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 이 호스트(pharmacy.neture.co.kr)는 kpa-society membership 이 active 가
 * 아니어도 **Neture 약국 기본 가입 active ∧ pharmacy 세미프랜차이즈 가입 active** 이면 이용한다 — 로그인 · handoff
 * 와 같은 서버 판정(`/neture/pharmacy/service-access/kpa-society`)을 조회해 통과시키고, 미충족이면 상태별 안내 ·
 * 신청 링크를 보인다. 기존 kpa-society 가입을 Neture 자격으로 재해석하지 않는다(판정은 서버의 Neture 원장).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MembershipStatusNotice,
  buildMembershipViewModel,
  type MembershipStatusNoticeAction,
} from '@o4o/account-ui';
import { authClient, useAuth } from '../../contexts/AuthContext';
import {
  SERVICE_KEY,
  getServiceMembershipStatus,
  isPlatformSuperAdmin,
  type MembershipStatus,
} from '../../lib/membershipGate';
import {
  fetchSemiFranchiseServiceAccess,
  semiFranchiseAccessLink,
  type SemiFranchiseServiceAccess,
} from '../../lib/semiFranchiseAccess';

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

/** membership 이 active 가 아닐 때만 세미프랜차이즈 자격을 조회한다(active · super_admin 은 조회 0). */
function useSemiFranchiseAccess(userId: string | undefined, needed: boolean, serviceKey: string) {
  const [state, setState] = useState<{ key: string; access: SemiFranchiseServiceAccess | null } | null>(null);
  const key = `${userId ?? ''}:${serviceKey}`;
  useEffect(() => {
    if (!needed) return;
    let cancelled = false;
    // fetchSemiFranchiseServiceAccess 는 reject 하지 않는다(실패 = null).
    void fetchSemiFranchiseServiceAccess(authClient.api, serviceKey).then((access) => {
      if (!cancelled) setState({ key, access });
    });
    return () => { cancelled = true; };
  }, [needed, key, serviceKey]);
  if (!needed) return { checking: false, access: null };
  if (!state || state.key !== key) return { checking: true, access: null };
  return { checking: false, access: state.access };
}

export function MembershipGate({ children, serviceKey = SERVICE_KEY }: MembershipGateProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const status = user ? getServiceMembershipStatus(user, serviceKey) : 'none';
  const needsSemiFranchiseCheck =
    !isLoading && isAuthenticated && !!user && !isPlatformSuperAdmin(user) && status !== 'active' && serviceKey === SERVICE_KEY;
  const semiFranchise = useSemiFranchiseAccess(user?.id, needsSemiFranchiseCheck, serviceKey);

  if (isLoading || semiFranchise.checking) {
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

  if (status === 'active') {
    return <>{children}</>;
  }

  if (semiFranchise.access?.allowed) {
    return <>{children}</>;
  }

  // kpa-society 가입 이력이 없는 사용자 = Neture 약국 경로 안내(상태별 문구 · 신청 링크)
  if (status === 'none' && semiFranchise.access?.next) {
    return <SemiFranchiseAccessScreen access={semiFranchise.access} />;
  }

  return <MembershipStatusScreen status={status} serviceKey={serviceKey} />;
}

function SemiFranchiseAccessScreen({ access }: { access: SemiFranchiseServiceAccess }) {
  const navigate = useNavigate();
  const link = semiFranchiseAccessLink(access.next);
  const actions: MembershipStatusNoticeAction[] = [];
  if (link) {
    // 가입 · 신청 화면은 내 매장 호스트(store.neture.co.kr) — 서비스 간 이동
    actions.push({ key: 'apply', label: link.label, onClick: () => window.location.assign(link.href), variant: 'primary' });
  }
  actions.push({ key: 'home', label: '홈으로 돌아가기', onClick: () => navigate('/'), variant: 'secondary' });
  return (
    <MembershipStatusNotice
      icon="🏥"
      title="Neture 약국 가입 후 이용할 수 있습니다"
      message={access.message ?? ''}
      actions={actions}
    />
  );
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

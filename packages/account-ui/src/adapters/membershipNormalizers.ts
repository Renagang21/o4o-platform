/**
 * Membership / Role 공통 adapter — 서비스 상태·역할 → 최소 공통 view model
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §9 / §10
 *
 * 원칙:
 *   - `service_memberships.status` enum 을 재설계하지 않는다 (F11 User/Operator Freeze).
 *     상태 축의 SSOT 는 `@o4o/auth-utils` 의 `getServiceMembershipStatus` 이며,
 *     이 adapter 는 **이미 판정된 상태 문자열의 표현(label/tone/문구)** 만 담당한다.
 *   - 역할 판정도 하지 않는다. 서비스가 보유한 role 목록과 라벨 사전을 받아
 *     **우선순위 규칙만** 공통으로 적용한다 (배열 순서 의존 버그 제거).
 *   - 서비스명·serviceKey·역할 문자열을 이 파일에 하드코딩하지 않는다 (§12).
 *     서비스 고유 값은 전부 인자로 주입한다.
 *
 * 이 파일의 상태 키 목록은 `service_memberships.status` canonical enum 과 1:1 이다:
 *   none | pending | active | rejected | suspended | withdrawn
 */

import type { RoleBadgeTone } from '../components/RoleBadge.js';
import type { RequestStatusConfig } from '../components/RequestStatusBadge.js';

/** 상태 배지 표현 — `RequestStatusBadge` 계약과 같은 모양을 유지한다. */
export type MembershipStatusConfig = RequestStatusConfig;

/** 서비스명 치환 자리표시자 — 공통 문구에 서비스 이름을 하드코딩하지 않기 위한 토큰. */
export const MEMBERSHIP_SERVICE_TOKEN = '{service}';

/**
 * 상태별 기본 배지 표현.
 * 5 서비스가 각자 갖고 있던 status label/tone 표를 하나로 모은 값이다.
 */
export const DEFAULT_MEMBERSHIP_STATUS_CONFIG: Record<string, MembershipStatusConfig> = {
  none: { label: '미가입', tone: 'slate' },
  pending: { label: '승인 대기', tone: 'amber' },
  active: { label: '승인됨', tone: 'emerald' },
  rejected: { label: '반려됨', tone: 'rose' },
  suspended: { label: '이용 정지', tone: 'rose' },
  withdrawn: { label: '탈퇴', tone: 'slate' },
};

/**
 * 상태 배지 표현 해석. 서비스 표현이 다르면 `overrides` 로만 바꾼다.
 * 알 수 없는 상태는 원문 그대로 중립 톤으로 표시한다(문구를 삼키지 않는다).
 */
export function resolveMembershipStatusConfig(
  status: string | null | undefined,
  overrides?: Record<string, MembershipStatusConfig>,
): MembershipStatusConfig {
  const key = status && status.length > 0 ? status : 'none';
  const fallback: MembershipStatusConfig = { label: key, tone: 'slate' as RoleBadgeTone };
  return overrides?.[key] ?? DEFAULT_MEMBERSHIP_STATUS_CONFIG[key] ?? fallback;
}

/** 상태 안내 화면(제목 · 문구 · 아이콘) 내용. */
export interface MembershipStatusNoticeContent {
  title: string;
  /** `{service}` 토큰이 있으면 `serviceName` 으로 치환된다. */
  message: string;
  icon?: string;
}

/**
 * 상태별 기본 안내 문구.
 * KPA / GlycoPharm / K-Cosmetics / Neture 의 `MembershipGate` 가 각자 갖고 있던
 * 동일 문구표를 하나로 모은 값이다.
 */
export const DEFAULT_MEMBERSHIP_STATUS_NOTICE: Record<string, MembershipStatusNoticeContent> = {
  none: {
    title: '서비스 가입이 필요합니다',
    message: `${MEMBERSHIP_SERVICE_TOKEN} 서비스를 이용하려면 먼저 가입 신청을 해주세요.`,
    icon: '📝',
  },
  pending: {
    title: '가입 승인 대기 중',
    message: '가입 신청이 승인 대기 중입니다. 승인 완료 후 이용하실 수 있습니다.',
    icon: '⏳',
  },
  active: {
    title: '서비스 이용 중',
    message: `${MEMBERSHIP_SERVICE_TOKEN} 서비스를 이용할 수 있습니다.`,
    icon: '✅',
  },
  rejected: {
    title: '가입 신청 반려',
    message: '가입 신청이 반려되었습니다. 자세한 사항은 운영자에게 문의해주세요.',
    icon: '🚫',
  },
  suspended: {
    title: '서비스 이용 정지',
    message: '서비스 이용이 정지되었습니다. 자세한 사항은 운영자에게 문의해주세요.',
    icon: '🚫',
  },
  withdrawn: {
    title: '탈퇴 처리된 서비스',
    message: '이 서비스에서 탈퇴 처리되었습니다. 재가입을 원하시면 운영자에게 문의해주세요.',
    icon: '🚫',
  },
};

export interface ResolveMembershipStatusNoticeOptions {
  /** `{service}` 치환에 쓸 서비스 표시명. 없으면 토큰을 제거한다. */
  serviceName?: string;
  overrides?: Record<string, Partial<MembershipStatusNoticeContent>>;
}

/** 상태 안내 문구 해석 (기본표 + 서비스 override 병합). */
export function resolveMembershipStatusNotice(
  status: string | null | undefined,
  options: ResolveMembershipStatusNoticeOptions = {},
): MembershipStatusNoticeContent {
  const key = status && status.length > 0 ? status : 'none';
  const base = DEFAULT_MEMBERSHIP_STATUS_NOTICE[key] ?? DEFAULT_MEMBERSHIP_STATUS_NOTICE.none;
  const override = options.overrides?.[key];
  const merged: MembershipStatusNoticeContent = {
    title: override?.title ?? base.title,
    message: override?.message ?? base.message,
    icon: override?.icon ?? base.icon,
  };
  const serviceName = options.serviceName ?? '';
  const message = merged.message
    .split(MEMBERSHIP_SERVICE_TOKEN)
    .join(serviceName)
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { ...merged, message };
}

// ---------------------------------------------------------------------------
// Role label
// ---------------------------------------------------------------------------

export interface ResolveRoleLabelOptions {
  /** role 문자열 → 표시 라벨 사전 (서비스 config 소관). */
  labels: Record<string, string>;
  /**
   * 우선순위 목록. 사용자가 복수 역할을 갖고 있을 때 **배열 순서가 아니라**
   * 이 목록 순서로 대표 역할을 정한다. 없으면 `labels` 에 매칭되는 첫 역할을 쓴다.
   */
  priority?: readonly string[];
  /** 매칭이 없을 때 라벨. */
  fallback?: string;
}

/**
 * 대표 역할 라벨 해석.
 *
 * 기존 결함: `ROLE_LABELS[user.roles[0]]` 은 backend 가 돌려주는 배열 순서에
 * 의존해 같은 사용자에게 다른 라벨이 보일 수 있었다(K-Cosmetics / GlycoPharm).
 * 우선순위 목록을 명시하면 순서와 무관하게 같은 라벨이 나온다.
 */
export function resolveRoleLabel(
  roles: readonly string[] | null | undefined,
  options: ResolveRoleLabelOptions,
): string {
  const fallback = options.fallback ?? '회원';
  if (!roles || roles.length === 0) return fallback;

  if (options.priority) {
    for (const role of options.priority) {
      if (roles.includes(role)) return options.labels[role] ?? fallback;
    }
  }
  for (const role of roles) {
    const label = options.labels[role];
    if (label) return label;
  }
  return fallback;
}

/** 보유 역할 전체의 라벨 목록 (복수 역할 표시용). 중복 라벨은 제거한다. */
export function resolveRoleLabels(
  roles: readonly string[] | null | undefined,
  labels: Record<string, string>,
): string[] {
  if (!roles || roles.length === 0) return [];
  const out: string[] = [];
  for (const role of roles) {
    const label = labels[role];
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Membership view model (§9)
// ---------------------------------------------------------------------------

export interface MembershipViewModelAction {
  key: string;
  label: string;
  /** 내부 route. `onClick` 과 함께 주면 href 가 우선한다. */
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export interface MembershipViewModel {
  /** membership row 존재 여부 — `none` 은 미가입으로 본다. */
  membershipExists: boolean;
  status: string;
  statusLabel: string;
  statusTone: RoleBadgeTone;
  /** 보유 역할 원문 목록 (표시는 roleLabel / roleLabels 사용). */
  roles: string[];
  /** 대표 역할 라벨. */
  roleLabel: string;
  /** 복수 역할 라벨 목록. */
  roleLabels: string[];
  /** 상태 안내 제목. */
  title: string;
  /** 상태 안내 문구. */
  description: string;
  icon?: string;
  joinedAt?: string | null;
  approvedAt?: string | null;
  actions: MembershipViewModelAction[];
  metadata: Record<string, unknown>;
}

export interface BuildMembershipViewModelInput {
  /** `getServiceMembershipStatus()` 결과 등 이미 판정된 상태 문자열. */
  status?: string | null;
  roles?: readonly string[] | null;
  roleLabels?: Record<string, string>;
  rolePriority?: readonly string[];
  roleFallback?: string;
  serviceName?: string;
  statusOverrides?: Record<string, MembershipStatusConfig>;
  noticeOverrides?: Record<string, Partial<MembershipStatusNoticeContent>>;
  joinedAt?: string | null;
  approvedAt?: string | null;
  actions?: MembershipViewModelAction[];
  metadata?: Record<string, unknown>;
}

/** §9 최소 공통 view model 조립. 상태·역할 판정은 하지 않고 표현만 만든다. */
export function buildMembershipViewModel(
  input: BuildMembershipViewModelInput = {},
): MembershipViewModel {
  const status = input.status && input.status.length > 0 ? input.status : 'none';
  const badge = resolveMembershipStatusConfig(status, input.statusOverrides);
  const notice = resolveMembershipStatusNotice(status, {
    serviceName: input.serviceName,
    overrides: input.noticeOverrides,
  });
  const roles = input.roles ? [...input.roles] : [];
  const labels = input.roleLabels ?? {};

  return {
    membershipExists: status !== 'none',
    status,
    statusLabel: badge.label,
    statusTone: badge.tone,
    roles,
    roleLabel: resolveRoleLabel(roles, {
      labels,
      priority: input.rolePriority,
      fallback: input.roleFallback,
    }),
    roleLabels: resolveRoleLabels(roles, labels),
    title: notice.title,
    description: notice.message,
    icon: notice.icon,
    joinedAt: input.joinedAt ?? null,
    approvedAt: input.approvedAt ?? null,
    actions: input.actions ?? [],
    metadata: input.metadata ?? {},
  };
}

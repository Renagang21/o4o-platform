/**
 * StoreOwnerGuard — 3 서비스 공통 매장 경영자 접근 가드
 *
 * WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1
 *
 * 근거 문서: docs/investigations/IR-O4O-MY-STORE-CROSSSERVICE-COMMONIZATION-AUDIT-V1.md
 *
 * 정책:
 *   - 구조: KPA canonical (`PharmacyGuard`) — 단계적 평가.
 *   - Guard semantics: GlycoPharm canonical (`PharmacyStoreGuard` — WO-O4O-GLYCOPHARM-
 *     MY-STORE-MENU-MEMBERSHIP-GUARD-V1) — 3-way OR (role / membership / operator-or-above).
 *   - KPA stale JWT recovery 는 optional `staleRecovery` prop 으로 보존.
 *   - 서비스별 platform-only 차단 카드 등은 호출 측 wrapper 에서 처리 (본 Guard 는
 *     구조적 흐름 / 단일 SSOT 만 담당).
 *
 * 평가 순서:
 *   1. isLoading                            → loadingNode (default minimal text)
 *   2. !isAuthenticated || !user            → Navigate(loginFallback, default '/login')
 *   3. direct access?
 *        - isOperatorOrAbove (admin/operator/super_admin)
 *        - isStoreOwnerByRole (canonical role OR user.isStoreOwner dual flag)
 *        - extraRoleMatcher(r) (서비스별 별칭 — Glyco pharmacist 등)
 *        - membership-aware (Glyco — service_memberships role='pharmacy' active/approved)
 *      → membershipGate(children) 또는 children 직접 반환
 *   4. staleRecovery 가 제공된 경우 → 한 번만 check() → true 면 refreshSession() 후 통과
 *   5. 그 외                                → Navigate(denialFallback, default '/')
 */

import { useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// ─── Service-specific canonical role config (internal SSOT) ───────────────

export type StoreOwnerServiceKey = 'kpa' | 'glycopharm' | 'cosmetics';

interface ServiceRoleConfig {
  storeOwner: string;
  admin: string;
  operator: string;
  /** service_memberships.service_key — 매장 경영자 membership lookup */
  membershipServiceKey: string;
  /**
   * membership role 이 본 값과 일치하고 status active/approved 면 매장 경영자로 인정.
   * null 이면 membership 기반 통과 미사용 (KPA / Cosmetics).
   */
  membershipStoreOwnerRole: string | null;
}

const SERVICE_ROLES: Record<StoreOwnerServiceKey, ServiceRoleConfig> = {
  kpa: {
    storeOwner: 'kpa:store_owner',
    admin: 'kpa:admin',
    operator: 'kpa:operator',
    membershipServiceKey: 'kpa-society',
    membershipStoreOwnerRole: null,
  },
  glycopharm: {
    storeOwner: 'glycopharm:store_owner',
    admin: 'glycopharm:admin',
    operator: 'glycopharm:operator',
    membershipServiceKey: 'glycopharm',
    membershipStoreOwnerRole: 'pharmacy',
  },
  cosmetics: {
    storeOwner: 'cosmetics:store_owner',
    admin: 'cosmetics:admin',
    operator: 'cosmetics:operator',
    membershipServiceKey: 'cosmetics',
    membershipStoreOwnerRole: null,
  },
};

const PLATFORM_SUPER_ADMIN = 'platform:super_admin';

// ─── Public types ─────────────────────────────────────────────────────────

export interface StoreOwnerGuardUser {
  roles?: string[];
  memberships?: Array<{ serviceKey?: string; role?: string; status?: string }>;
  /**
   * KPA-only context flag — stale JWT 에서 canonical store_owner role 이 누락된 경우
   * KPA AuthContext 가 별도 API 로 보강해 채워 넣는다. 본 guard 는 roles 와 dual 로
   * OR-check 한다.
   */
  isStoreOwner?: boolean;
}

export interface StoreOwnerStaleRecovery {
  /**
   * 한 번 호출. true 면 사용자가 실제로는 매장 경영자임을 외부 API 가 확인했음을 의미.
   * 호출 측은 e.g. KPA `getMyRequestsCached().some(r => r.status === 'approved')` 등을 구현.
   */
  check: () => Promise<boolean>;
  /**
   * check() === true 시 한 번 호출. 호출 측은 AuthContext refresh / checkAuth 등을 수행.
   */
  refreshSession: () => Promise<void> | void;
  /** check() === false 시 navigate 대상. default '/' (denialFallback 과 동일). */
  fallback?: string;
  /** 진행 중 표시 노드. default text. */
  loadingNode?: ReactNode;
}

export interface StoreOwnerGuardProps {
  /** 서비스 식별자 — canonical role config 결정. */
  serviceKey: StoreOwnerServiceKey;
  /** AuthContext 에서 받은 user (서비스별 useAuth() 호출 후 전달). null 이면 미로그인. */
  user: StoreOwnerGuardUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  children: ReactNode;
  /**
   * 서비스별 추가 role 별칭 매처. e.g. GlycoPharm `isPharmacistRole`.
   * roles.some(extraRoleMatcher) === true 면 매장 경영자 통과로 인정.
   */
  extraRoleMatcher?: (role: string) => boolean;
  /** default '/login' */
  loginFallback?: string;
  /** default '/' — 매장 경영자 아님이 최종 확정될 때 navigate 대상. */
  denialFallback?: string;
  /** default 최소 텍스트. */
  loadingNode?: ReactNode;
  /**
   * KPA stale JWT recovery — provided 시 direct access 실패 시 1회 시도.
   */
  staleRecovery?: StoreOwnerStaleRecovery;
  /**
   * 접근 grant 시 children 을 감쌀 wrapper — 서비스별 MembershipGate 등.
   * 제공되지 않으면 children 직접 렌더.
   */
  membershipGate?: ComponentType<{ children: ReactNode }>;
}

// ─── Component ────────────────────────────────────────────────────────────

const DefaultLoading = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
  </div>
);

export function StoreOwnerGuard(props: StoreOwnerGuardProps) {
  const {
    serviceKey,
    user,
    isAuthenticated,
    isLoading,
    children,
    extraRoleMatcher,
    loginFallback = '/login',
    denialFallback = '/',
    loadingNode = DefaultLoading,
    staleRecovery,
    membershipGate: MembershipGate,
  } = props;

  const location = useLocation();
  const cfg = SERVICE_ROLES[serviceKey];

  // Stale-recovery state (KPA pattern). idle = not yet started, loading = check in flight,
  // approved/denied = result.
  const [recoveryState, setRecoveryState] = useState<'idle' | 'loading' | 'approved' | 'denied'>('idle');
  const recoveryAttemptedRef = useRef(false);

  // ─── Direct access evaluation ──────────────────────────────────────────
  const roles = user?.roles ?? [];

  const isOperatorOrAbove =
    roles.includes(cfg.operator) ||
    roles.includes(cfg.admin) ||
    roles.includes(PLATFORM_SUPER_ADMIN);

  // Dual role check: explicit canonical role OR stale-JWT fallback flag (KPA).
  const isStoreOwnerByRole =
    roles.includes(cfg.storeOwner) || !!user?.isStoreOwner;

  const isExtraRole = extraRoleMatcher
    ? roles.some(extraRoleMatcher)
    : false;

  const isStoreOwnerByMembership =
    !!cfg.membershipStoreOwnerRole &&
    (user?.memberships ?? []).some(
      (m) =>
        m.serviceKey === cfg.membershipServiceKey &&
        m.role === cfg.membershipStoreOwnerRole &&
        (m.status === 'active' || m.status === 'approved'),
    );

  const hasDirectAccess =
    isOperatorOrAbove ||
    isStoreOwnerByRole ||
    isExtraRole ||
    isStoreOwnerByMembership;

  const needsRecovery =
    !!user &&
    !hasDirectAccess &&
    !!staleRecovery;

  // ─── Recovery flow effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!needsRecovery) return;
    if (recoveryState === 'approved' || recoveryState === 'denied') return;
    if (recoveryState === 'loading') return;

    setRecoveryState('loading');
    let cancelled = false;
    (async () => {
      try {
        const ok = await staleRecovery!.check();
        if (cancelled) return;
        setRecoveryState(ok ? 'approved' : 'denied');
      } catch {
        if (!cancelled) setRecoveryState('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsRecovery, recoveryState, staleRecovery]);

  // After approved, trigger session refresh exactly once.
  useEffect(() => {
    if (
      recoveryState === 'approved' &&
      !hasDirectAccess &&
      !recoveryAttemptedRef.current &&
      staleRecovery
    ) {
      recoveryAttemptedRef.current = true;
      void staleRecovery.refreshSession();
    }
  }, [recoveryState, hasDirectAccess, staleRecovery]);

  // ─── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return <>{loadingNode}</>;
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={loginFallback}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  if (hasDirectAccess) {
    return MembershipGate ? <MembershipGate>{children}</MembershipGate> : <>{children}</>;
  }

  if (staleRecovery) {
    if (recoveryState === 'idle' || recoveryState === 'loading') {
      return <>{staleRecovery.loadingNode ?? DefaultLoading}</>;
    }
    if (recoveryState === 'approved') {
      // Session refresh has been scheduled in the effect above.
      // Until the next render with hasDirectAccess === true, render the loading node
      // (avoids briefly showing children with stale user state).
      return <>{staleRecovery.loadingNode ?? DefaultLoading}</>;
    }
    return <Navigate to={staleRecovery.fallback ?? denialFallback} replace />;
  }

  return <Navigate to={denialFallback} replace />;
}

/**
 * useRoleSelection — 다중 역할 사용자의 "현재 역할" 선택 · 사용자 부분 갱신 Core
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-FULL-CLOSE-V1
 *
 * Neture(`switchRole`) · K-Cosmetics(`switchRole`) · GlycoPharm(`selectRole`) 이
 * 글자 단위로 동일한 구현을 각자 들고 있었다. 판정·갱신 규칙이 같으므로 Core 로 올린다.
 *
 * 규칙(기존 3서비스 동작 그대로):
 *   - 미로그인이거나 허용 목록에 없는 역할이면 **아무것도 하지 않는다**(무음 무시).
 *   - 선택한 역할을 `roles[0]` 으로 올리고 나머지 순서는 보존한다(역할 집합은 불변).
 *   - `hasMultipleRoles` 는 허용 목록 길이 > 1.
 *
 * 허용 목록 기본값은 `user.roles` 다. GlycoPharm 처럼 인증 시점의 `availableRoles` 를
 * 별도 보관하는 서비스는 `options.availableRoles` 로 그 축을 명시 주입한다.
 * **이 파일에 서비스명 조건문을 두지 않는다.**
 */

import { useCallback, useRef } from 'react';
import type { ServiceAuthCore } from './types';

export interface RoleSelection<TUser> {
  /** 선택한 역할을 현재 역할(roles[0])로 올린다. */
  switchRole: (role: string) => void;
  /** 사용자 객체 부분 갱신(프로필 수정 후 로컬 반영 등). */
  updateUser: (updates: Partial<TUser>) => void;
  hasMultipleRoles: boolean;
}

export function useRoleSelection<TUser extends { roles: string[] }>(
  core: Pick<ServiceAuthCore<TUser>, 'user' | 'setUser'>,
  options?: { availableRoles?: string[] },
): RoleSelection<TUser> {
  const { user, setUser } = core;

  // 매 렌더 새 배열이 와도 콜백 정체성이 흔들리지 않도록 ref 로 고정한다.
  const availableRef = useRef<string[] | undefined>(options?.availableRoles);
  availableRef.current = options?.availableRoles;

  const switchRole = useCallback(
    (role: string) => {
      setUser((prev) => {
        if (!prev) return prev;
        const allowed = availableRef.current ?? prev.roles;
        if (!allowed.includes(role)) return prev;
        return { ...prev, roles: [role, ...prev.roles.filter((r) => r !== role)] };
      });
    },
    [setUser],
  );

  const updateUser = useCallback(
    (updates: Partial<TUser>) => {
      setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    [setUser],
  );

  const source = options?.availableRoles ?? user?.roles ?? [];

  return { switchRole, updateUser, hasMultipleRoles: source.length > 1 };
}

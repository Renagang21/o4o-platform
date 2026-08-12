/**
 * useRoleSelection 회귀검증
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-FULL-CLOSE-V1
 *
 * Neture(switchRole) · K-Cosmetics(switchRole) · GlycoPharm(selectRole) 의
 * 기존 동작을 그대로 고정한다 — 역할 집합은 불변, 선택 역할만 맨 앞으로.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { useRoleSelection } from '../useRoleSelection';

interface TestUser {
  id: string;
  name?: string;
  roles: string[];
}

/** setUser 를 가진 최소 core 대역. */
function useFakeCore(initial: TestUser | null) {
  const [user, setUser] = useState<TestUser | null>(initial);
  return { user, setUser };
}

function setup(initial: TestUser | null, availableRoles?: string[]) {
  return renderHook(() => {
    const core = useFakeCore(initial);
    return { core, sel: useRoleSelection(core, availableRoles ? { availableRoles } : undefined) };
  });
}

afterEach(() => cleanup());

describe('useRoleSelection', () => {
  const USER: TestUser = { id: 'u-1', roles: ['neture:supplier', 'neture:operator'] };

  it('선택한 역할을 roles[0] 으로 올리고 집합은 보존한다', () => {
    const { result } = setup(USER);

    act(() => result.current.sel.switchRole('neture:operator'));

    expect(result.current.core.user?.roles).toEqual(['neture:operator', 'neture:supplier']);
  });

  it('보유하지 않은 역할은 무음 무시한다', () => {
    const { result } = setup(USER);

    act(() => result.current.sel.switchRole('platform:super_admin'));

    expect(result.current.core.user?.roles).toEqual(['neture:supplier', 'neture:operator']);
  });

  it('미로그인 상태에서는 아무것도 하지 않는다', () => {
    const { result } = setup(null);

    act(() => result.current.sel.switchRole('neture:operator'));

    expect(result.current.core.user).toBeNull();
  });

  it('availableRoles 를 주입하면 그 축으로 허용 여부를 판정한다 (GlycoPharm 계약)', () => {
    const { result } = setup(USER, ['neture:supplier']);

    act(() => result.current.sel.switchRole('neture:operator'));

    expect(result.current.core.user?.roles).toEqual(['neture:supplier', 'neture:operator']);
  });

  it('updateUser 는 사용자 객체를 부분 갱신한다', () => {
    const { result } = setup(USER);

    act(() => result.current.sel.updateUser({ name: '변경됨' }));

    expect(result.current.core.user?.name).toBe('변경됨');
    expect(result.current.core.user?.roles).toEqual(USER.roles);
  });

  it('hasMultipleRoles 는 허용 목록 길이로 판정한다', () => {
    expect(setup(USER).result.current.sel.hasMultipleRoles).toBe(true);
    expect(setup({ id: 'u-2', roles: ['neture:supplier'] }).result.current.sel.hasMultipleRoles).toBe(false);
    expect(setup(null).result.current.sel.hasMultipleRoles).toBe(false);
    expect(setup(USER, ['neture:supplier']).result.current.sel.hasMultipleRoles).toBe(false);
  });
});

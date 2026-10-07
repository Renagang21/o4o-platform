/**
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * 공급자 랜딩의 서비스 신청 패널은 role 문자열이 아니라 **서비스 이용 상태**로 판정한다.
 *   - `neture:admin` · `platform:super_admin` 도 관리자 우회 없이 신청 폼을 본다
 *     (SupplierRoute 가 이들을 역할만으로 통과시키지 않으므로 '업무로 이동' 링크를 보이면 거부 화면으로 간다)
 *   - 상태 조회를 관리자라고 건너뛰지 않는다
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authState = { user: { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] } as { id: string; email: string; name: string; roles: string[] } | null };
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: authState.user, isAuthenticated: !!authState.user }) }));

const statesResult = {
  states: null as null | { supplier: { status: string; source: string } },
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
};
const useStates = vi.fn((_enabled: boolean) => statesResult);
vi.mock('../../../lib/neture-service-state', () => ({ useNetureServiceStates: (enabled: boolean) => useStates(enabled) }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { ServiceApplyPanel } from '../ServiceApplyPanel';

const st = (supplier: string) => ({ supplier: { status: supplier, source: 'test' } });

function mount() {
  return render(
    <MemoryRouter>
      <ServiceApplyPanel service="supplier" />
    </MemoryRouter>,
  );
}

describe('ServiceApplyPanel', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    authState.user = { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] };
    statesResult.states = null;
    statesResult.loading = false;
    statesResult.error = null;
    useStates.mockClear();
  });

  it.each([['neture:admin'], ['platform:super_admin']])('%s 도 상태가 none 이면 신청 폼 (관리자 우회 링크 없음)', (role) => {
    authState.user!.roles = ['user', role];
    statesResult.states = st('none');
    mount();
    expect(useStates).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('service-apply-supplier-none')).toBeTruthy();
    expect(screen.queryByTestId('service-apply-supplier-admin')).toBeNull();
    expect(screen.queryByText(/관리자 계정입니다/)).toBeNull();
    expect(screen.getByRole('button', { name: /신청/ })).toBeTruthy();
  });

  it('neture:admin 이라도 상태가 pending 이면 승인 대기', () => {
    authState.user!.roles = ['neture:admin'];
    statesResult.states = st('pending');
    mount();
    expect(screen.getByTestId('service-apply-supplier-pending')).toBeTruthy();
  });

  it('active 일 때만 공급자 업무 링크를 보인다', () => {
    statesResult.states = st('active');
    mount();
    expect(screen.getByTestId('service-apply-supplier-active')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/supplier/dashboard');
  });

  it('일반 회원 none → 신청 폼', () => {
    statesResult.states = st('none');
    mount();
    expect(screen.getByTestId('service-apply-supplier-none')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

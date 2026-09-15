/**
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * 업무 공간 게이트는 role 문자열이 아니라 **서비스별 이용 상태**로 연다.
 *   - active 만 children · 그 외는 상태별 안내 + 'O4O 홈으로'(로그인 유지)
 *   - 조회 실패는 미가입으로 취급하지 않는다
 *   - 한 서비스 상태는 다른 서비스 게이트에 영향을 주지 않는다
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authState = { user: { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] } as { id: string; email: string; name: string; roles: string[] } | null };
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: authState.user, isAuthenticated: !!authState.user }) }));

const statesResult = {
  states: null as null | { supplier: { status: string; source: string }; partner: { status: string; source: string } },
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
};
vi.mock('../../../lib/neture-service-state', () => ({ useNetureServiceStates: () => statesResult }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { ServiceUsageGate } from '../ServiceUsageGate';

const st = (supplier: string, partner: string) => ({
  supplier: { status: supplier, source: 'test' },
  partner: { status: partner, source: 'test' },
});

function mount(service: 'supplier' | 'partner') {
  return render(
    <MemoryRouter>
      <ServiceUsageGate service={service}>
        <div data-testid="work-area">업무 공간</div>
      </ServiceUsageGate>
    </MemoryRouter>,
  );
}

describe('ServiceUsageGate', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    authState.user = { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] };
    statesResult.states = null;
    statesResult.loading = false;
    statesResult.error = null;
  });

  it('공급자 active → 업무 공간을 연다', () => {
    statesResult.states = st('active', 'none');
    mount('supplier');
    expect(screen.getByTestId('work-area')).toBeTruthy();
  });

  it('공급자 role 이 있어도 상태가 none 이면 신청 안내 + O4O 홈으로 (로그아웃 버튼 없음)', () => {
    authState.user!.roles = ['supplier', 'neture:supplier'];
    statesResult.states = st('none', 'none');
    mount('supplier');
    expect(screen.queryByTestId('work-area')).toBeNull();
    expect(screen.getByTestId('service-gate-supplier-none')).toBeTruthy();
    expect(screen.getByText('공급자 서비스 신청')).toBeTruthy();
    expect(screen.getByText('O4O 홈으로')).toBeTruthy();
    expect(screen.queryByText(/로그아웃/)).toBeNull();
  });

  it('공급자 정지 + 파트너 active: 파트너 게이트는 열리고 공급자 게이트는 정지 안내', () => {
    statesResult.states = st('suspended', 'active');
    const a = mount('partner');
    expect(screen.getByTestId('work-area')).toBeTruthy();
    a.unmount();
    mount('supplier');
    expect(screen.queryByTestId('work-area')).toBeNull();
    expect(screen.getByTestId('service-gate-supplier-suspended')).toBeTruthy();
  });

  it.each([
    ['pending', '신청 상태 보기'],
    ['rejected', '다시 신청하기'],
    ['withdrawn', '다시 신청하기'],
  ])('파트너 %s → 안내 + %s', (status, label) => {
    statesResult.states = st('none', status);
    mount('partner');
    expect(screen.getByTestId(`service-gate-partner-${status}`)).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('조회 실패는 미가입 안내가 아니라 재시도 화면', () => {
    statesResult.error = '서비스 이용 상태를 불러오지 못했습니다.';
    mount('supplier');
    expect(screen.getByTestId('service-gate-error')).toBeTruthy();
    expect(screen.queryByTestId('service-gate-supplier-none')).toBeNull();
    expect(screen.getByText('다시 시도')).toBeTruthy();
  });

  it('관리자는 상태와 무관하게 통과(운영 목적)', () => {
    authState.user!.roles = ['neture:admin'];
    statesResult.states = st('none', 'none');
    mount('partner');
    expect(screen.getByTestId('work-area')).toBeTruthy();
  });
});

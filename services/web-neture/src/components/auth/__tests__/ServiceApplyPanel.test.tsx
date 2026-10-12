/**
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * 공급자 랜딩의 서비스 신청 패널은 role 문자열이 아니라 **서비스 이용 상태**로 판정한다.
 *   - `neture:admin` · `platform:super_admin` 도 관리자 우회 없이 신청 폼을 본다
 *     (SupplierRoute 가 이들을 역할만으로 통과시키지 않으므로 '업무로 이동' 링크를 보이면 거부 화면으로 간다)
 *   - 상태 조회를 관리자라고 건너뛰지 않는다
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const authState = { user: { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] } as { id: string; email: string; name: string; roles: string[] } | null };
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: authState.user, isAuthenticated: !!authState.user }) }));

const statesResult = {
  states: null as null | { supplier: { status: string; source: string }; netureMain?: { status: string; source: string } },
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
};
const useStates = vi.fn((_enabled: boolean) => statesResult);
vi.mock('../../../lib/neture-service-state', () => ({ useNetureServiceStates: (enabled: boolean) => useStates(enabled) }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from '../../../lib/apiClient';
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
    vi.mocked(api.get).mockReset().mockResolvedValue({ data: { data: [] } } as any);
    vi.mocked(api.post).mockReset();
  });

  it('requires supplier documents and preserves fields while reloading a changed version', async () => {
    statesResult.states = st('none');
    const doc = { policyDocumentId: '11111111-1111-4111-8111-111111111111', serviceKey: 'supplier', documentType: 'terms', version: 2, title: '공급자 조건', content: '공급자 신청 본문' };
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [doc] } } as any).mockResolvedValueOnce({ data: { data: [{ ...doc, version: 3 }] } } as any);
    vi.mocked(api.post).mockRejectedValueOnce({ response: { data: { error: { code: 'POLICY_VERSION_MISMATCH' } } } });
    mount();
    fireEvent.change(screen.getByLabelText(/회사명/), { target: { value: '입력 회사' } });
    fireEvent.change(screen.getByLabelText(/식별자/), { target: { value: 'fixture' } });
    await screen.findByText(/공급자 조건/);
    expect((screen.getByRole('button', { name: /공급자.*신청/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByTestId('service-apply-supplier-none'));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    await screen.findByText(/입력 내용은 유지됩니다/);
    expect((screen.getByLabelText(/회사명/) as HTMLInputElement).value).toBe('입력 회사');
    expect((screen.getByLabelText(/식별자/) as HTMLInputElement).value).toBe('fixture');
    await screen.findByText(/버전 3/);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ policyReferences: [{ policyDocumentId: doc.policyDocumentId, version: 2, documentType: 'terms' }] });
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

  it.each(['pending', 'rejected', 'suspended', 'withdrawn'])('공통 계정 %s → 계정 상태 확인이며 서비스 수동 승인 대기로 안내하지 않는다', (status) => {
    statesResult.states = { ...st('none'), netureMain: { status, source: 'account_verification' } };
    mount();
    expect(screen.getByTestId('service-apply-supplier-neture-required')).toBeTruthy();
    expect(screen.getByRole('link', { name: '대표 홈에서 계정 상태 확인' }).getAttribute('href')).toBe('https://neture.co.kr/');
    expect(screen.queryByText(/가입 승인|승인 대기/)).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('공급자 진입에서 승인된 서비스는 기존 guard가 있는 업무 주소로 이동한다', async () => {
   statesResult.states = st('active');
   render(<MemoryRouter><Routes><Route path="/" element={<ServiceApplyPanel service="supplier" enterWorkspace />} /><Route path="/supplier/dashboard" element={<h1>공급자 업무</h1>} /></Routes></MemoryRouter>);
   expect(await screen.findByRole('heading', { name: '공급자 업무' })).toBeTruthy();
 });
});

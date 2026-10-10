import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { get, post } }));
import CommunityServiceAdminPage from '../CommunityServiceAdminPage';
const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });

describe('중앙 개별 역할 지정', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  beforeEach(() => {
    get.mockReset(); post.mockReset();
    vi.spyOn(window, 'prompt').mockReturnValue('역할 변경 사유');
    get.mockImplementation((url: string) => url.endsWith('/members')
      ? ok({ members: [{ membershipId: 'm1', userId: 'u1', name: '테스트 회원', email: null, role: 'member', membershipStatus: 'active', serviceMembershipStatus: 'active', designationEligibility: { eligible: true, code: null, message: null } }] })
      : ok({ communities: [{ id: 'c1', name: '테스트 커뮤니티', slug: 'fixture', status: 'active', operatorCount: 1, memberCount: 2 }] }));
    post.mockImplementation(() => ok({}));
  });
  it('admin/operator/member 선택값을 지정 API로 전달한다', async () => {
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    const select = await screen.findByLabelText('테스트 회원 역할');
    fireEvent.change(select, { target: { value: 'admin' } });
    await waitFor(() => expect(post).toHaveBeenCalledWith('/communities/admin/communities/c1/members/m1/role', { role: 'admin', reason: '역할 변경 사유' }));
    expect(await screen.findByText(/운영자로 지정했습니다/)).toBeTruthy();
  });
  it('마지막 admin 보호 오류를 화면에 표시한다', async () => {
    post.mockRejectedValue({ response: { data: { error: '운영 가능한 마지막 admin은 변경할 수 없습니다.' } } });
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    fireEvent.change(await screen.findByLabelText('테스트 회원 역할'), { target: { value: 'operator' } });
    expect(await screen.findByText('운영 가능한 마지막 admin은 변경할 수 없습니다.')).toBeTruthy();
  });
  it('서비스 가입이 active여도 서버가 메인 자격 미충족을 알리면 지정하지 않는다', async () => {
    get.mockImplementation((url: string) => url.endsWith('/members')
      ? ok({ members: [{ membershipId: 'm1', userId: 'u1', name: '테스트 회원', email: null, role: 'member', membershipStatus: 'active', serviceMembershipStatus: 'active', designationEligibility: { eligible: false, code: 'MAIN_MEMBERSHIP_NOT_ACTIVE', message: '이메일 확인 또는 계정 상태 확인이 필요합니다.' } }] })
      : ok({ communities: [{ id: 'c1', name: '테스트 커뮤니티', slug: 'fixture', status: 'active', operatorCount: 1, memberCount: 2 }] }));
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    expect(await screen.findByText('이메일 확인 또는 계정 상태 확인이 필요합니다.')).toBeTruthy();
    const select = await screen.findByLabelText('테스트 회원 역할');
    expect((select.querySelector('option[value="operator"]') as HTMLOptionElement).disabled).toBe(true);
    expect((select.querySelector('option[value="admin"]') as HTMLOptionElement).disabled).toBe(true);
    fireEvent.change(select, { target: { value: 'admin' } });
    expect(post).not.toHaveBeenCalled();
  });
  it('자격 정보가 없는 응답은 추측으로 지정 버튼을 열지 않는다', async () => {
    get.mockImplementation((url: string) => url.endsWith('/members')
      ? ok({ members: [{ membershipId: 'm1', userId: 'u1', name: '테스트 회원', email: null, role: 'member', membershipStatus: 'active', serviceMembershipStatus: 'active' }] })
      : ok({ communities: [{ id: 'c1', name: '테스트 커뮤니티', slug: 'fixture', status: 'active', operatorCount: 1, memberCount: 2 }] }));
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    const select = await screen.findByLabelText('테스트 회원 역할');
    fireEvent.change(select, { target: { value: 'operator' } });
    expect(post).not.toHaveBeenCalled();
    expect(screen.getAllByText('지정 자격을 확인할 수 없습니다. 커뮤니티를 다시 선택해 주세요.').length).toBeGreaterThan(0);
  });
  it('커뮤니티를 바꾸면 이전 목록 응답을 버리고 새 커뮤니티의 회원만 표시한다', async () => {
    let release!: (value: unknown) => void;
    const first = new Promise(resolve => { release = resolve; });
    const candidate = { membershipId: 'm1', userId: 'u1', role: 'member', membershipStatus: 'active', serviceMembershipStatus: 'active', designationEligibility: { eligible: true } };
    get.mockImplementation((url: string) => url.endsWith('/c1/members') ? first : url.endsWith('/c2/members')
      ? ok({ members: [{ ...candidate, name: '새 회원' }] }) : ok({ communities: [{ id: 'c1', name: '첫 커뮤니티' }, { id: 'c2', name: '둘째 커뮤니티' }] }));
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    await screen.findByRole('option', { name: /둘째 커뮤니티/ });
    fireEvent.change(screen.getByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText('커뮤니티 선택'), { target: { value: 'c2' } });
    await screen.findByText('새 회원');
    await act(async () => release({ data: { success: true, data: { members: [{ ...candidate, name: '이전 회원' }] } } }));
    expect(screen.queryByText('이전 회원')).toBeNull(); expect(screen.getByText('새 회원')).toBeTruthy();
  });
  it('선택 전 목록 조회 실패 후 재조회가 성공하면 오류를 지운다', async () => {
    get.mockRejectedValueOnce(new Error('목록 실패'));
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByRole('option', { name: /테스트 커뮤니티/ });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: '다시 조회' })).toBeNull();
  });
  it('역할 변경 중 선택과 다른 행을 잠그고 실패 후 재조회한다', async () => {
    let fail!: (e: Error) => void;
    post.mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    const select = await screen.findByLabelText('테스트 회원 역할');
    fireEvent.change(select, { target: { value: 'operator' } });
    fireEvent.change(select, { target: { value: 'admin' } });
    expect(post).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('커뮤니티 선택') as HTMLSelectElement).disabled).toBe(true);
    await act(async () => fail(new Error('변경 실패')));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    expect(await screen.findByLabelText('테스트 회원 역할')).toBeTruthy();
  });

  it('개설 심사 처리 중 다른 신청을 차단하고 탭 이탈 후 응답을 적용하지 않는다', async () => {
    let release!: (value: unknown) => void;
    post.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const initial = get.getMockImplementation()!;
    get.mockImplementation((url: string) => url.endsWith('/communities/requests') ? ok({ requests: [
      { id: 'r1', name: '첫 신청', desiredSlug: 'first', createdAt: '2026-10-11T00:00:00Z' },
      { id: 'r2', name: '둘째 신청', desiredSlug: 'second', createdAt: '2026-10-11T00:00:00Z' },
    ] }) : initial(url));
    render(<MemoryRouter><CommunityServiceAdminPage operatorOnly /></MemoryRouter>);
    const buttons = await screen.findAllByRole('button', { name: '승인' });
    fireEvent.click(buttons[0]); fireEvent.click(buttons[1]); expect(post).toHaveBeenCalledTimes(1);
    cleanup(); render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    await act(async () => release({ data: { success: true, data: {} } }));
    expect(screen.queryByText(/첫 신청.*개설했습니다/)).toBeNull();
  });

});

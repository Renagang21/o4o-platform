import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      ? ok({ members: [{ membershipId: 'm1', userId: 'u1', name: '테스트 회원', email: null, role: 'member', membershipStatus: 'active', serviceMembershipStatus: 'active' }] })
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
});

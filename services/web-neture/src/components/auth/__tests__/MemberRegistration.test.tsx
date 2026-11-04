import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  auth: {
    user: { id: 'synthetic-user' },
    isAuthenticated: true,
    isLoading: false,
  },
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../../lib/apiClient', () => ({
  authClient: { api: { get: mocks.get, post: mocks.post } },
}));
vi.mock('@o4o/shared-space-ui', () => ({
  useServiceEnrollmentPolicies: () => ({ ready: true, references: [] }),
  ServiceEnrollmentPolicyAgreement: () => null,
}));
import MemberRegistrationForm from '../MemberRegistrationForm';
import MemberRegistrationCompletion from '../MemberRegistrationCompletion';
const version = '2026-11-04T00:00:00.000001';
const profile = {
  member: {
    name: '합성 회원',
    nickname: '합성 별칭',
    phone: '01012345678',
    version,
  },
  registration: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.isAuthenticated = true;
  mocks.post.mockResolvedValue({ data: { data: { saved: true } } });
  mocks.get.mockResolvedValue({ data: { data: profile } });
});
afterEach(cleanup);
describe('role-specific signup', () => {
  it('presents exactly the public signup types and only shows the selected role fields', async () => {
    render(<MemberRegistrationForm />);
    const type = await screen.findByLabelText('가입 유형');
    expect(
      [...type.querySelectorAll('option')].map((e) => e.textContent),
    ).toEqual([
      '선택해 주세요',
      '약사',
      '약국경영자',
      '공급자',
      '파트너',
      '기타',
    ]);
    fireEvent.change(type, { target: { value: 'pharmacy_owner' } });
    expect(screen.getByLabelText('약사 면허번호')).toBeTruthy();
    expect(screen.getByLabelText('대표자명')).toBeTruthy();
    fireEvent.change(type, { target: { value: 'supplier' } });
    expect(screen.queryByLabelText('약사 면허번호')).toBeNull();
    expect(screen.getByLabelText('공개 문의 이메일')).toBeTruthy();
    expect(screen.getByLabelText('담당자 이메일')).toBeTruthy();
    fireEvent.change(type, { target: { value: 'other' } });
    expect(screen.queryByLabelText('대표자명')).toBeNull();
    expect(screen.getByLabelText('닉네임')).toBeTruthy();
  });
  it('submits versioned data and retains a failed draft', async () => {
    mocks.post.mockRejectedValueOnce({
      response: { status: 409, data: { error: '다시 조회해 주세요.' } },
    });
    render(<MemberRegistrationForm />);
    fireEvent.change(await screen.findByLabelText('가입 유형'), {
      target: { value: 'pharmacist' },
    });
    fireEvent.change(screen.getByLabelText('약사 면허번호'), {
      target: { value: 'synthetic-license' },
    });
    fireEvent.click(screen.getByRole('button', { name: '가입 정보 제출' }));
    await screen.findByRole('alert');
    expect(
      (screen.getByLabelText('약사 면허번호') as HTMLInputElement).value,
    ).toBe('synthetic-license');
    expect(mocks.post).toHaveBeenCalledWith('/member-registration/self', {
      ...profile.member,
      type: 'pharmacist',
      fields: { licenseNumber: 'synthetic-license' },
      policyReferences: [],
    });
  });
  it('shows submitted profiles without another submit button', async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          ...profile,
          registration: { type: 'other', fields: {}, state: 'pending' },
        },
      },
    });
    render(<MemberRegistrationForm />);
    await screen.findByText('가입 검토 대기 중입니다.');
    expect(screen.queryByRole('button', { name: '가입 정보 제출' })).toBeNull();
  });
  it('offers a retry after initial retrieval fails', async () => {
    mocks.get.mockRejectedValueOnce(new Error('offline'));
    render(<MemberRegistrationForm />);
    fireEvent.click(await screen.findByRole('button', { name: '다시 조회' }));
    expect(await screen.findByLabelText('닉네임')).toBeTruthy();
  });
});
describe('new signup completion', () => {
  const mount = (path = '/') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <MemberRegistrationCompletion />
        <Routes>
          <Route path="/" element={<p>메인</p>} />
          <Route path="/signup" element={<p>가입 입력</p>} />
          <Route path="/operator-invite" element={<p>운영 초대</p>} />
        </Routes>
      </MemoryRouter>,
    );
  it('redirects only an explicitly unselected new signup', async () => {
    mocks.get.mockResolvedValue({
      data: { data: { requiresRegistration: true } },
    });
    mount();
    expect(await screen.findByText('가입 입력')).toBeTruthy();
  });
  it('keeps existing accounts on main', async () => {
    mocks.get.mockResolvedValue({
      data: { data: { requiresRegistration: false } },
    });
    mount();
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    expect(screen.getByText('메인')).toBeTruthy();
  });
  it('preserves invitation continuation and never loads a logged-out profile', () => {
    mount('/operator-invite');
    expect(mocks.get).not.toHaveBeenCalled();
    cleanup();
    mocks.auth.isAuthenticated = false;
    mount();
    expect(mocks.get).not.toHaveBeenCalled();
  });
});

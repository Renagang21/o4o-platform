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
  // 2단계(2026-11-10): ① 유형 카드 선택 → 「다음」 → ② 그 유형의 정보만 입력.
  const chooseType = async (label: string) => {
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(`^${label}`) }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
  };
  it('presents exactly the public signup types as cards and only shows the selected role fields', async () => {
    render(<MemberRegistrationForm />);
    await screen.findByRole('heading', { name: '가입 유형 선택' });
    expect(screen.getAllByRole('radio').map((e) => e.querySelector('span')?.textContent)).toEqual([
      '약사',
      '약국경영자',
      '공급자',
      '파트너',
      '기타',
    ]);
    expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true);
    await chooseType('약국경영자');
    expect(screen.getByRole('heading', { name: '약국경영자 정보 입력' })).toBeTruthy();
    expect(screen.queryByLabelText('가입 유형')).toBeNull();
    expect(screen.getByLabelText('약사 면허번호')).toBeTruthy();
    expect(screen.getByLabelText('대표자명')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '유형 다시 선택' }));
    await chooseType('공급자');
    expect(screen.queryByLabelText('약사 면허번호')).toBeNull();
    expect(screen.getByLabelText('공개 문의 이메일')).toBeTruthy();
    expect(screen.getByLabelText('담당자 이메일')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '유형 다시 선택' }));
    await chooseType('기타');
    expect(screen.queryByLabelText('대표자명')).toBeNull();
    // 닉네임은 필수, 이름 · 휴대전화는 선택이다.
    expect((screen.getByLabelText('닉네임') as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText('이름 (선택)') as HTMLInputElement).required).toBe(false);
    expect((screen.getByLabelText('휴대전화 (선택)') as HTMLInputElement).required).toBe(false);
  });
  it('submits versioned data and retains a failed draft', async () => {
    mocks.post.mockRejectedValueOnce({
      response: { status: 409, data: { error: '다시 조회해 주시기 바랍니다.' } },
    });
    render(<MemberRegistrationForm />);
    await chooseType('약사');
    fireEvent.change(screen.getByLabelText('약사 면허번호'), {
      target: { value: 'synthetic-license' },
    });
    fireEvent.click(screen.getByRole('button', { name: '가입 신청' }));
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
    await screen.findByText(/가입 신청을 검토하고 있습니다/);
    expect(screen.queryByRole('button', { name: '가입 신청' })).toBeNull();
  });
  it('lets the member submit consent when the operator prepared a pending role profile', async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          ...profile,
          canSubmit: true,
          registration: { type: 'other', fields: {}, state: 'pending' },
        },
      },
    });
    render(<MemberRegistrationForm />);
    const submit = await screen.findByRole('button', {
      name: '가입 신청',
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        '/member-registration/self',
        expect.objectContaining({ type: 'other', policyReferences: [] }),
      ),
    );
  });
  it('offers a retry after initial retrieval fails', async () => {
    mocks.get.mockRejectedValueOnce(new Error('offline'));
    render(<MemberRegistrationForm />);
    fireEvent.click(await screen.findByRole('button', { name: '다시 조회' }));
    expect(await screen.findByRole('heading', { name: '가입 유형 선택' })).toBeTruthy();
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

// 2026-11-12 사용자 지적: 개업일 연도 · 우편번호 검색 · 제출 후 이동 · 휴대전화 입력.
describe('signup screen usability', () => {
  const chooseOwner = async () => {
    fireEvent.click(await screen.findByRole('radio', { name: /^약국경영자/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
  };
  it('opening date is chosen by year (newest first, no future) · month · day and submitted as YYYY-MM-DD', async () => {
    render(<MemberRegistrationForm />);
    await chooseOwner();
    const year = screen.getByLabelText('개업일 연도') as HTMLSelectElement;
    const years = [...year.options].map((o) => o.value).filter(Boolean);
    const thisYear = new Date().getFullYear();
    expect(years[0]).toBe(String(thisYear));
    expect(years.at(-1)).toBe('1950');
    expect(years.some((y) => Number(y) > thisYear)).toBe(false);
    fireEvent.change(year, { target: { value: '1998' } });
    fireEvent.change(screen.getByLabelText('개업일 월'), { target: { value: '02' } });
    const day = screen.getByLabelText('개업일 일') as HTMLSelectElement;
    expect([...day.options].filter((o) => o.value).length).toBe(28);
    fireEvent.change(day, { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '별칭' } });
    fireEvent.change(screen.getByLabelText('휴대전화 (선택)'), { target: { value: '01012345678' } });
    for (const [label, value] of [['약사 면허번호', '12345'], ['사업장명', '합성 약국'], ['사업자등록번호', '1234567890']])
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.submit(screen.getByRole('button', { name: '가입 신청' }).closest('form')!);
    await waitFor(() => expect(mocks.post).toHaveBeenCalled());
    const body = mocks.post.mock.calls[0][1];
    expect(body.fields.businessStartDate).toBe('1998-02-15');
    expect(body.phone).toBe('01012345678');
  });
  it('address uses the postcode search instead of a free zip-code input', async () => {
    render(<MemberRegistrationForm />);
    await chooseOwner();
    expect(screen.getByRole('button', { name: '우편번호 검색' })).toBeTruthy();
    expect(screen.queryByLabelText('사업장 주소')).toBeNull();
  });
  it('phone field opens the numeric keypad and accepts typing', async () => {
    render(<MemberRegistrationForm />);
    await chooseOwner();
    const phone = screen.getByLabelText('휴대전화 (선택)') as HTMLInputElement;
    expect(phone.inputMode).toBe('numeric');
    expect(phone.readOnly).toBe(false);
    fireEvent.change(phone, { target: { value: '01098765432' } });
    expect(phone.value).toBe('01098765432');
  });
  it('after a successful submission the page hands control back (returns to the main screen)', async () => {
    const onSubmitted = vi.fn();
    render(<MemberRegistrationForm onSubmitted={onSubmitted} />);
    fireEvent.click(await screen.findByRole('radio', { name: /^기타/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '별칭' } });
    fireEvent.submit(screen.getByRole('button', { name: '가입 신청' }).closest('form')!);
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/가입 정보를 제출했습니다/)).toBeNull();
  });
});

describe('submitted registration under review', () => {
  it('shows that the submitted fields cannot be changed instead of looking editable', async () => {
    mocks.get.mockResolvedValue({ data: { data: { member: { name: '합성', nickname: '별칭', phone: null, version }, registration: { type: 'pharmacy_owner', state: 'pending', requestId: 'r1', fields: {} }, canSubmit: false } } });
    render(<MemberRegistrationForm />);
    await screen.findByText(/검토 중에는 내용을 고칠 수 없습니다/);
    const phone = screen.getByLabelText('휴대전화 (선택)') as HTMLInputElement;
    expect(phone.readOnly).toBe(true);
    expect(phone.className).toMatch(/read-only:bg-slate-100/);
    expect(phone.placeholder).toBe('');
    expect(screen.queryByRole('button', { name: '가입 신청' })).toBeNull();
  });
  it('a new member before submission is not told that review is pending', async () => {
    mocks.get.mockResolvedValue({ data: { data: { member: { name: null, nickname: null, phone: null, version }, registration: { type: null, state: 'pending', fields: {} }, canSubmit: true } } });
    render(<MemberRegistrationForm />);
    await screen.findByRole('heading', { name: '가입 유형 선택' });
    expect(screen.queryByText(/검토/)).toBeNull();
  });
});


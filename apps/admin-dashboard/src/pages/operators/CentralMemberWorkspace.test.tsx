import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CentralMemberWorkspace from './CentralMemberWorkspace';
import type { MemberDetail } from './member-workspace-model';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('@o4o/auth-client', () => ({ authClient: { api } }));
const base = '/qualifications/pharmacist/members';
const permissions = {
  edit: true,
  qualifications: true,
  pharmacies: true,
  applications: true,
};
const business = {
  businessName: '합성 약국',
  businessNumber: '1234567890',
  representativeName: '합성 대표',
  businessType: '소매',
  businessItem: '건강',
  address: '합성 주소',
  contactName: '담당',
  contactPhone: '01012345678',
  contactEmail: 'contact@example.test',
  taxInvoiceEmail: 'tax@example.test',
  licenseNumber: 'fixture-license',
};
let record: MemberDetail, rows: Array<Record<string, unknown>>;
function detail(id = 'member-a'): MemberDetail {
  return {
    ...record,
    member: {
      ...record.member,
      userId: id,
      name: id === 'member-a' ? record.member.name : '다른 합성 회원',
      email: id + '@example.test',
    },
  };
}
function mount() {
  render(<CentralMemberWorkspace actorId="reviewer" />);
}
async function select() {
  await screen.findByRole('button', {
    name: '회원 합성 회원 member-a@example.test',
  });
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '회원 상세보기' }));
  await screen.findByRole('form', { name: '회원 정보 보기' });
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  record = {
    member: {
      userId: 'member-a',
      name: '합성 회원',
      nickname: '합성 별칭',
      email: 'member-a@example.test',
      phone: '01012345678',
      accountStatus: 'active',
      serviceStatus: 'active',
      emailVerified: true,
      hasPassword: false,
      joinedAt: '2026-11-04',
      version: '2026-11-04T00:00:00.000001',
    },
    registration: {
      type: 'pharmacy_owner',
      state: 'pending',
      fields: { ...business },
      qualificationVersion: null,
    },
    qualification: null,
    legacyLicense: null,
    legacyBusiness: null,
    pharmacies: [],
    history: [],
    permissions,
  };
  rows = ['member-a', 'member-b'].map((userId, i) => ({
    userId,
    name: i ? '다른 합성 회원' : '합성 회원',
    nickname: i ? null : '합성 별칭',
    email: userId + '@example.test',
    accountStatus: 'active',
    serviceStatus: 'active',
    registrationType: i ? 'supplier' : 'pharmacy_owner',
    loginMethods: i ? ['kakao'] : ['google'],
  }));
  api.get.mockImplementation(async (path: string) => ({
    data: {
      data:
        path === base
          ? {
              items: rows,
              counts: { all: 2, pending: 2, corrections: 0, inactive: 0 },
              permissions,
              hasNext: false,
            }
          : detail(path.split('/').pop()),
    },
  }));
  api.post.mockResolvedValue({ data: { data: { saved: true } } });
  api.patch.mockImplementation(
    async (_path: string, input: Record<string, unknown>) => {
      record = {
        ...record,
        member: {
          ...record.member,
          name: String(input.name),
          nickname: String(input.nickname),
          phone: String(input.phone),
          email: String(input.email),
          version: '2026-11-04T00:00:00.000002',
        },
        registration: input.registration as MemberDetail['registration'],
      };
      return { data: { data: { saved: true } } };
    },
  );
});
afterEach(cleanup);
it('shows one row with separate name, nickname, email, provider, signup type and member status', async () => {
  mount();
  const name = await screen.findByRole('button', {
    name: '회원 합성 회원 member-a@example.test',
  });
  const row = name.closest('tr')!;
  for (const label of [
    '이름',
    '닉네임',
    '이메일',
    '로그인 방식',
    '가입 유형',
    '회원 상태',
  ])
    expect(screen.getByRole('columnheader', { name: label })).toBeTruthy();
  expect(within(row).getByText('합성 별칭')).toBeTruthy();
  expect(within(row).getByText('Google')).toBeTruthy();
  expect(within(row).getByText('약국경영자')).toBeTruthy();
  expect(within(row).getByText('member-a@example.test')).toHaveClass(
    'whitespace-nowrap',
  );
  expect(name.textContent).toBe('합성 회원');
  expect(screen.queryByRole('columnheader', { name: '약사 자격' })).toBeNull();
  expect(screen.queryByRole('columnheader', { name: '약국 신청' })).toBeNull();
  expect(screen.queryByRole('columnheader', { name: '공통 계정' })).toBeNull();
  expect(
    screen.queryByRole('columnheader', { name: 'Neture 이용' }),
  ).toBeNull();
});
it('preserves checkbox action bar, single-target editing and page selection', async () => {
  mount();
  await select();
  expect(screen.getByRole('button', { name: '회원 정보 수정' })).toBeEnabled();
  fireEvent.click(screen.getAllByRole('checkbox')[2]);
  expect(screen.getByRole('button', { name: '회원 정보 수정' })).toBeDisabled();
  fireEvent.click(screen.getAllByRole('checkbox')[2]);
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  expect(
    await screen.findByRole('form', { name: '회원 정보 수정' }),
  ).toBeTruthy();
});
it('switches cached detail to editable fields without a second detail request', async () => {
  mount();
  await select();
  const calls = api.get.mock.calls.filter(
    ([p]) => p === base + '/member-a',
  ).length;
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  expect(screen.getByLabelText('이름', { exact: true })).not.toHaveAttribute(
    'readonly',
  );
  expect(
    api.get.mock.calls.filter(([p]) => p === base + '/member-a'),
  ).toHaveLength(calls);
  expect(screen.getByLabelText('사업자등록번호')).toHaveValue('1234567890');
  expect(screen.getByLabelText('약사 면허번호')).toHaveValue('fixture-license');
});
it('saves every role field with common profile, exact version and a correction reason', async () => {
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  fireEvent.change(screen.getByLabelText('이름', { exact: true }), {
    target: { value: '정정 회원' },
  });
  fireEvent.change(screen.getByLabelText('상세 주소'), {
    target: { value: '정정 상세주소' },
  });
  fireEvent.change(screen.getByLabelText('수정 사유'), {
    target: { value: '제출 정보 대조' },
  });
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 저장' }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith(
      base + '/member-a',
      expect.objectContaining({
        name: '정정 회원',
        version: '2026-11-04T00:00:00.000001',
        reason: '제출 정보 대조',
        evidenceConfirmed: true,
        registration: {
          type: 'pharmacy_owner',
          fields: { ...business, addressDetail: '정정 상세주소' },
        },
      }),
    ),
  );
  await screen.findByRole('form', { name: '회원 정보 보기' });
});
it('preserves typed fields and edit mode on a version conflict', async () => {
  api.patch.mockRejectedValueOnce({
    response: { status: 409, data: { error: '다른 운영자가 변경했습니다.' } },
  });
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  fireEvent.change(screen.getByLabelText('닉네임'), {
    target: { value: '유지할 별칭' },
  });
  fireEvent.change(screen.getByLabelText('수정 사유'), {
    target: { value: '합성 수정' },
  });
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 저장' }));
  await screen.findByText('다른 운영자가 변경했습니다.');
  expect(screen.getByRole('form', { name: '회원 정보 수정' })).toBeTruthy();
  expect(screen.getByLabelText('닉네임')).toHaveValue('유지할 별칭');
});
it('never shows a verification-mail action for an operator-corrected social member', async () => {
  record.member.emailVerified = false;
  mount();
  await select();
  expect(screen.queryByRole('button', { name: '확인 메일 보내기' })).toBeNull();
  expect(screen.queryByText('약국경영자 신청')).toBeNull();
  expect(screen.queryByText('약사 자격 승인 검토')).toBeNull();
});
it('approves signup from the selected member with one reason and no separate qualification command', async () => {
  mount();
  await select();
  fireEvent.click(
    screen.getByRole('button', { name: '가입 승인', exact: true }),
  );
  fireEvent.change(screen.getByLabelText('처리 사유'), {
    target: { value: '가입 정보 확인' },
  });
  fireEvent.click(screen.getByRole('button', { name: '가입 승인 처리' }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/member-registration/members/member-a/approve',
      { version: '2026-11-04T00:00:00.000001', reason: '가입 정보 확인' },
    ),
  );
});
it('rejects the signup application without changing the global account', async () => {
  mount();
  await select();
  fireEvent.click(
    screen.getByRole('button', { name: '가입 반려', exact: true }),
  );
  fireEvent.change(screen.getByLabelText('처리 사유'), {
    target: { value: '사업자 정보 보완' },
  });
  fireEvent.click(screen.getByRole('button', { name: '가입 반려 처리' }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/member-registration/members/member-a/reject',
      expect.objectContaining({ reason: '사업자 정보 보완' }),
    ),
  );
});
it('clears selection and private form on a status tab change', async () => {
  mount();
  await select();
  fireEvent.click(screen.getByRole('tab', { name: /해지 회원/ }));
  await waitFor(() =>
    expect(screen.queryByLabelText('이메일', { exact: true })).toBeNull(),
  );
  expect(screen.queryByRole('button', { name: '회원 정보 수정' })).toBeNull();
});
it('keeps signup fields visible for members without a pharmacy application row', async () => {
  record.pharmacies = [];
  mount();
  await select();
  expect(screen.getByLabelText('대표자명')).toHaveValue('합성 대표');
  expect(screen.getByLabelText('사업자등록번호')).toHaveValue('1234567890');
});
it('provides the supplier business fields without a pharmacy license field', async () => {
  const supplier = Object.fromEntries(
    Object.entries(business).filter(([key]) => key !== 'licenseNumber'),
  );
  record.registration = {
    type: 'supplier',
    state: 'pending',
    fields: supplier,
  };
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  expect(screen.getByLabelText('공개 문의 이메일')).toHaveValue(
    'contact@example.test',
  );
  expect(screen.getByLabelText('담당자 이메일')).toHaveValue('');
  expect(screen.queryByLabelText('약사 면허번호')).toBeNull();
});
it('clears private fields when current write authority is revoked', async () => {
  api.patch.mockRejectedValueOnce({
    response: {
      status: 403,
      data: { error: '회원 업무 권한이 회수되었습니다.' },
    },
  });
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  fireEvent.change(screen.getByLabelText('수정 사유'), {
    target: { value: '합성 수정' },
  });
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 저장' }));
  await screen.findByText('회원 업무 권한이 회수되었습니다.');
  expect(screen.queryByLabelText('이메일', { exact: true })).toBeNull();
});
it('clears a one-time temporary password when another member is selected', async () => {
  record.member.hasPassword = true;
  api.post.mockResolvedValueOnce({
    data: {
      data: {
        temporaryPassword: 'SyntheticTemp123!',
        expiresAt: '2026-11-05T00:00:00Z',
      },
    },
  });
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  fireEvent.click(screen.getByRole('button', { name: '임시 비밀번호 발급' }));
  fireEvent.change(screen.getByLabelText('발급 사유'), {
    target: { value: '합성 본인 요청' },
  });
  fireEvent.click(
    screen.getByLabelText('본인 요청과 비밀번호 전달 대상을 확인했습니다.'),
  );
  fireEvent.click(screen.getByRole('button', { name: '발급', exact: true }));
  await screen.findByLabelText('발급된 임시 비밀번호');
  fireEvent.click(
    screen.getByRole('button', {
      name: '회원 다른 합성 회원 member-b@example.test',
    }),
  );
  await waitFor(() =>
    expect(screen.queryByLabelText('발급된 임시 비밀번호')).toBeNull(),
  );
});
it('retains the focused member form after a validation error rather than reporting success', async () => {
  api.patch.mockRejectedValueOnce({
    response: {
      status: 400,
      data: { error: '사업자등록번호를 확인해 주세요.' },
    },
  });
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  fireEvent.change(screen.getByLabelText('사업자등록번호'), {
    target: { value: '123' },
  });
  fireEvent.change(screen.getByLabelText('수정 사유'), {
    target: { value: '합성 수정' },
  });
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 저장' }));
  await screen.findByText('사업자등록번호를 확인해 주세요.');
  expect(screen.getByLabelText('사업자등록번호')).toHaveValue('123');
});

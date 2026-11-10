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
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
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
  fireEvent.click(screen.getByRole('button', { name: '회원 정보', exact: true }));
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
  // 보기 · 수정 · 약국·사업자 정보는 「회원 정보」 하나로 합쳤다. 해지와 복구는 따로 있다.
  for (const merged of ['회원 상세보기', '약국·사업자 정보', '회원 해지·복구'])
    expect(screen.queryByRole('button', { name: merged })).toBeNull();
  expect(screen.getByRole('button', { name: '회원 해지' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '이용 복구' })).toBeDisabled();
  fireEvent.click(screen.getAllByRole('checkbox')[2]);
  expect(screen.getByRole('button', { name: '회원 해지' })).toBeDisabled();
  fireEvent.click(screen.getAllByRole('checkbox')[2]);
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  expect(
    await screen.findByRole('form', { name: '회원 정보 수정' }),
  ).toBeTruthy();
});
it('opens only the terminate form from 「회원 해지」 and only the restore form from 「이용 복구」', async () => {
  rows[1] = { ...rows[1], serviceStatus: 'withdrawn' };
  mount();
  await screen.findByRole('button', { name: '회원 합성 회원 member-a@example.test' });
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '회원 해지' }));
  const panel = await screen.findByRole('complementary', { name: '선택 회원 작업' });
  expect(await within(panel).findByText('회원 이용을 해지합니다. 이후 이용 복구가 가능합니다.')).toBeTruthy();
  expect(within(panel).queryByText('해지된 회원의 이용을 복구합니다.')).toBeNull();
  fireEvent.click(within(panel).getByRole('button', { name: '회원 작업 패널 닫기' }));
  fireEvent.click(screen.getAllByRole('checkbox')[2]);
  expect(screen.getByRole('button', { name: '회원 해지' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '이용 복구' })).toBeEnabled();
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
  const card = screen.getByRole('region', { name: '가입 신청 처리' });
  fireEvent.click(within(card).getByRole('button', { name: '승인', exact: true }));
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
  // 처리 후 패널을 닫고, 목록 위에 결과를 보인다.
  await screen.findByText('합성 회원 회원의 가입을 반려했습니다. 목록의 「회원 상태」가 반려로 바뀝니다.');
  expect(screen.queryByRole('complementary', { name: '선택 회원 작업' })).toBeNull();
});
it('opens the reject form at the top of the panel, above the submitted information', async () => {
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '가입 반려', exact: true }));
  const panel = await screen.findByRole('complementary', { name: '선택 회원 작업' });
  const card = within(panel).getByRole('region', { name: '가입 신청 처리' });
  const form = within(card).getByRole('form', { name: '가입 반려' });
  const info = within(panel).getByRole('form', { name: '회원 정보 보기' });
  expect(form.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('shows member status right after the name and blocks reject when no signup record exists', async () => {
  rows[0] = { ...rows[0], serviceStatus: 'rejected', registrationState: null };
  mount();
  const name = await screen.findByRole('button', { name: '회원 합성 회원 member-a@example.test' });
  const headers = [...name.closest('table')!.querySelectorAll('th')].map(th => th.textContent?.trim()).filter(Boolean);
  expect(headers.indexOf('회원 상태')).toBe(headers.indexOf('이름') + 1);
  expect(within(name.closest('tr')!).getByText('반려')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  expect(screen.getByRole('button', { name: '가입 반려', exact: true })).toBeDisabled();
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
      data: { error: '사업자등록번호를 확인해 주시기 바랍니다.' },
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
  await screen.findByText('사업자등록번호를 확인해 주시기 바랍니다.');
  expect(screen.getByLabelText('사업자등록번호')).toHaveValue('123');
});
it('shows a failed action inside the open member panel, not behind it', async () => {
  api.patch.mockRejectedValueOnce({
    response: { status: 409, data: { error: '다른 운영자가 변경했습니다.' } },
  });
  mount();
  await select();
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 수정' }));
  fireEvent.change(screen.getByLabelText('수정 사유'), {
    target: { value: '합성 수정' },
  });
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 저장' }));
  const panel = screen.getByRole('complementary', { name: '선택 회원 작업' });
  await waitFor(() =>
    expect(within(panel).getByRole('alert').textContent).toContain('다른 운영자가 변경했습니다.'),
  );
  expect(screen.getAllByRole('alert')).toHaveLength(1);
});

function mountAdmin() {
  const listed = api.get.getMockImplementation()!;
  api.get.mockImplementation(async (path: string, ...rest: unknown[]) => {
    const response = await listed(path, ...rest);
    if (path === base) response.data.data.permissions = { ...permissions, erase: true, manageAccount: true };
    return response;
  });
  render(<CentralMemberWorkspace actorId="admin" adminMode />);
}
async function selectFirstRow() {
  await screen.findByRole('button', { name: '회원 합성 회원 member-a@example.test' });
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
}
it('admin 「계정 삭제」 asks once and deletes the selected account directly', async () => {
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  api.delete.mockResolvedValueOnce({ data: { data: { operationId: 'op', state: 'completed', erased: true } } });
  mountAdmin();
  await selectFirstRow();
  expect(screen.queryByRole('button', { name: '계정·개인자료 삭제 확인' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
  expect(confirm).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/admin/users/member-a', { timeout: 300_000 }));
  await screen.findByText('합성 회원 계정을 삭제했습니다.');
  expect(screen.queryByRole('complementary', { name: '선택 회원 작업' })).toBeNull();
  confirm.mockRestore();
});
it('admin 「계정 삭제」 shows a progress message while the server is still deleting', async () => {
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  let finish!: (value: unknown) => void;
  api.delete.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  mountAdmin();
  await selectFirstRow();
  fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
  expect(await screen.findByText(/계정을 삭제하는 중입니다/)).toBeTruthy();
  expect(screen.getByText(/서버에서 계속 진행됩니다/)).toBeTruthy();
  // 화면은 잠기지 않는다: 탭 · 검색을 계속 쓸 수 있고, 삭제 중인 행은 「삭제 중」으로 보인다.
  expect(screen.getByRole('tab', { name: /해지 회원/ })).not.toBeDisabled();
  const row = screen.getByRole('button', { name: '회원 합성 회원 member-a@example.test' }).closest('tr')!;
  expect(within(row).getByText('삭제 중')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  expect(screen.getByRole('button', { name: '계정 삭제' })).toBeDisabled();
  finish({ data: { data: { operationId: 'op', state: 'completed', erased: true } } });
  await screen.findByText('합성 회원 계정을 삭제했습니다.');
  expect(screen.queryByText(/계정을 삭제하는 중입니다/)).toBeNull();
  confirm.mockRestore();
});
it('admin 「계정 삭제」 explains a timed-out request instead of staying silent', async () => {
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  api.delete.mockRejectedValueOnce({ code: 'ECONNABORTED' });
  mountAdmin();
  await selectFirstRow();
  fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('서버 응답이 없습니다');
  expect(screen.queryByText(/계정을 삭제하는 중입니다/)).toBeNull();
  confirm.mockRestore();
});
it('admin 「계정 삭제」 does nothing when the confirmation is cancelled', async () => {
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
  mountAdmin();
  await selectFirstRow();
  fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
  expect(api.delete).not.toHaveBeenCalled();
  confirm.mockRestore();
});
it('admin 「계정 삭제」 shows the server refusal reason', async () => {
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  api.delete.mockRejectedValueOnce({ response: { status: 409, data: { code: 'ACCOUNT_ERASURE_ROLLOUT_REQUIRED' } } });
  mountAdmin();
  await selectFirstRow();
  fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('현재 계정 삭제 기능이 비활성화돼 있습니다');
  expect(alert.textContent).toContain('ACCOUNT_ERASURE_ROLLOUT_REQUIRED');
  confirm.mockRestore();
});
it('admin 「계정 삭제」 reports an unfinished deletion instead of success', async () => {
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  api.delete.mockResolvedValueOnce({ data: { data: { operationId: 'op', state: 'retry_required', erased: false, errorCode: 'PERSONAL_FILE_INVENTORY_REVIEW_REQUIRED' } } });
  mountAdmin();
  await selectFirstRow();
  fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
  await screen.findByText(/삭제 실패 — 재시도 가능 — 삭제가 아직 끝나지 않았습니다/);
  expect(screen.queryByText('계정을 삭제했습니다.')).toBeNull();
  confirm.mockRestore();
});
it('admin 「이용·약국 관리」 still opens the panel with the access and pharmacy actions', async () => {
  mountAdmin();
  await selectFirstRow();
  fireEvent.click(screen.getByRole('button', { name: '이용·약국 관리' }));
  const panel = await screen.findByRole('complementary', { name: '선택 회원 작업' });
  await waitFor(() => expect(within(panel).getByRole('region', { name: '회원 이용 관리' })).toBeTruthy());
  expect(within(panel).queryByRole('button', { name: '계정·개인자료 완전삭제' })).toBeNull();
  expect(api.delete).not.toHaveBeenCalled();
});

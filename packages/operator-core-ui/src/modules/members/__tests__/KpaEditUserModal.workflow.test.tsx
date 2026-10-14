import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KpaEditUserModal, type KpaMemberForEdit } from '../KpaEditUserModal';
import { buildKpaMemberSavePlan, createKpaMemberDraft, validateKpaMemberInfo } from '../kpaMemberEditModel';

vi.mock('@o4o/ui', () => ({ AddressSearch: () => null }));
vi.mock('@o4o/error-handling', () => ({ toast: { success: vi.fn(), warning: vi.fn() } }));
import { toast } from '@o4o/error-handling';

const member: KpaMemberForEdit = {
  id: 'synthetic-member-a', status: 'active', user: { name: '가상 약사', nickname: '별명' },
  activity_type: 'pharmacy_owner', pharmacy_name: '가상 약국',
  business_info: { businessNumber: '000-00-00000', pharmacy_phone: '02-000-0000',
    representativeName: '기존 대표', taxEmail: 'old@example.test', zipCode: '00000', address: '가상 주소', address2: '1층' },
};
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(r => { resolve = r; });
  return { promise, resolve };
}
function setup(overrides: Partial<React.ComponentProps<typeof KpaEditUserModal>> = {}) {
  const props = { member, makeRequest: vi.fn(async () => ({})), onClose: vi.fn(), onSuccess: vi.fn(), ...overrides };
  const view = render(<KpaEditUserModal {...props} />);
  return { ...view, props };
}
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: '저장' }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('KPA member save plan', () => {
  it('does not write the displayed default membership type or legacy aliases on no-op', () => {
    const baseline = createKpaMemberDraft(member);
    expect(buildKpaMemberSavePlan(baseline, { ...baseline }, true)).toEqual({ info: {}, status: undefined });
    const draft = { ...baseline, ceoName: ' 새 대표 ', taxInvoiceEmail: 'new@example.test', membership_type: 'student' };
    expect(buildKpaMemberSavePlan(baseline, draft, false).info).toEqual({ ceoName: '새 대표', taxInvoiceEmail: 'new@example.test' });
  });
  it('preserves empty contact/address fields, permits existing clear operations, and groups addresses', () => {
    const baseline = createKpaMemberDraft(member);
    const draft = { ...baseline, name: '  ', nickname: '', pharmacy_phone: '', ceoName: '',
      taxInvoiceEmail: '', address1: '', address2: '', business_number: ' 123-45 ' };
    expect(buildKpaMemberSavePlan(baseline, draft, true).info).toEqual({ name: '', nickname: '', business_number: ' 123-45 ' });
    expect(buildKpaMemberSavePlan(baseline, { ...baseline, address2: ' 2층 ' }, true).info)
      .toEqual({ zipCode: '00000', address1: '가상 주소', address2: '2층' });
  });
  it('validates only the changed payload against existing API limits', () => {
    expect(validateKpaMemberInfo({ ownerPhone: '1'.repeat(51) })).toContain('50자');
    expect(validateKpaMemberInfo({ ownerPhone: '😀'.repeat(50) })).toBeUndefined();
    expect(validateKpaMemberInfo({ activity_type: '' })).toContain('활동 유형');
    expect(validateKpaMemberInfo({ activity_type: 'pharmacy_owner' })).toBeUndefined();
  });
});

describe('KPA member editing workflow', () => {
  it('keeps info success and draft after status failure, retries only status and forwards warnings', async () => {
    const makeRequest = vi.fn().mockResolvedValueOnce({ warnings: ['가상 권한 부여 보류'] })
      .mockRejectedValueOnce(new Error('상태 저장 실패')).mockResolvedValueOnce({});
    const { props } = setup({ makeRequest });
    edit('이름', '수정 약사'); edit('상태', 'suspended'); save();
    await screen.findByText('상태 저장 실패');
    expect(screen.getByRole('status').textContent).toContain('회원 정보는 저장되었습니다');
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('수정 약사');
    expect(props.onClose).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('가상 권한 부여 보류');
    save(); await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(makeRequest.mock.calls).toEqual([
      ['PATCH', '/members/synthetic-member-a/info', { name: '수정 약사' }],
      ['PATCH', '/members/synthetic-member-a/status', { status: 'suspended' }],
      ['PATCH', '/members/synthetic-member-a/status', { status: 'suspended' }],
    ]);
    expect(props.onSuccess).toHaveBeenCalledTimes(1);
  });
  it('recomputes new edits against acknowledged info instead of dropping or repeating them', async () => {
    const makeRequest = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('실패'))
      .mockResolvedValue({});
    setup({ makeRequest }); edit('이름', '첫 변경'); edit('상태', 'suspended'); save();
    await screen.findByText('실패');
    edit('이름', member.user!.name!); edit('닉네임', '새 별명'); save();
    await waitFor(() => expect(makeRequest).toHaveBeenCalledTimes(4));
    expect(makeRequest.mock.calls[2][2]).toEqual({ name: member.user!.name, nickname: '새 별명' });
  });
  it('stops after info failure, preserves draft and allows retry of both pending phases', async () => {
    const makeRequest = vi.fn().mockRejectedValueOnce(new Error('정보 실패')).mockResolvedValue({});
    setup({ makeRequest }); edit('이름', '초안'); edit('상태', 'suspended'); save();
    await screen.findByText('정보 실패'); expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
    save(); await waitFor(() => expect(makeRequest).toHaveBeenCalledTimes(3));
    expect(makeRequest.mock.calls[1][1]).toContain('/info');
    expect(makeRequest.mock.calls[2][1]).toContain('/status');
  });
  it('blocks duplicate submission, header/cancel/backdrop closing until both writes finish', async () => {
    const pending = deferred(); const makeRequest = vi.fn(() => pending.promise);
    const { props } = setup({ makeRequest }); edit('이름', '초안');
    act(() => { save(); save(); });
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(makeRequest).toHaveBeenCalledTimes(1); expect(props.onClose).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({}); });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
  it('isolates target changes and does not start the previous target status write', async () => {
    const pending = deferred(); const makeRequest = vi.fn(() => pending.promise);
    const { props, rerender } = setup({ makeRequest }); edit('이름', '이전 초안'); edit('상태', 'suspended'); save();
    rerender(<KpaEditUserModal {...props} member={{ ...member, id: 'synthetic-member-b', user: { name: '다음 회원' } }} />);
    await act(async () => { pending.resolve({}); });
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('다음 회원');
    expect(makeRequest).toHaveBeenCalledTimes(1); expect(props.onSuccess).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });
  it('refreshes acknowledged partial changes on close without resubmission', async () => {
    const makeRequest = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('실패'));
    const { props } = setup({ makeRequest }); edit('이름', '저장된 이름'); edit('상태', 'suspended'); save();
    await screen.findByText('실패'); fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.onSuccess).toHaveBeenCalledTimes(1); expect(makeRequest).toHaveBeenCalledTimes(2);
  });
  it('retries callback failure without repeating successful writes', async () => {
    const onSuccess = vi.fn().mockImplementationOnce(() => { throw new Error('callback'); }).mockImplementation(() => {});
    const { props } = setup({ onSuccess }); edit('이름', '저장 이름'); save();
    await screen.findByText(/목록 갱신에 실패/); save();
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.makeRequest).toHaveBeenCalledTimes(1); expect(onSuccess).toHaveBeenCalledTimes(2);
  });
  it('does not resend a completed status when refreshing fails, including withdrawal protection', async () => {
    const onSuccess = vi.fn().mockImplementationOnce(() => { throw new Error('callback'); }).mockImplementation(() => {});
    const { props } = setup({ onSuccess }); edit('상태', 'withdrawn'); save();
    await screen.findByText(/목록 갱신에 실패/);
    edit('상태', 'active'); save();
    await screen.findByText('탈퇴 처리된 회원은 수정할 수 없습니다.');
    expect(props.makeRequest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.makeRequest).toHaveBeenCalledTimes(1);
  });
  it('does not run follow-up writes or callbacks after unmount', async () => {
    const pending = deferred(); const makeRequest = vi.fn(() => pending.promise);
    const { props, unmount } = setup({ makeRequest });
    edit('이름', '저장 중'); edit('상태', 'suspended'); save(); unmount();
    await act(async () => { pending.resolve({}); });
    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(props.onSuccess).not.toHaveBeenCalled(); expect(props.onClose).not.toHaveBeenCalled();
  });
  it('blocks invalid changes before either API is called and keeps no-op free of writes', async () => {
    const { props } = setup({ canChangeMembershipType: true });
    edit('개설자 연락처', '1'.repeat(51)); edit('상태', 'suspended'); save();
    await screen.findByText(/50자 이내/); expect(props.makeRequest).not.toHaveBeenCalled();
    edit('개설자 연락처', ''); edit('상태', 'active'); save();
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1)); expect(props.makeRequest).not.toHaveBeenCalled();
  });
  it.each([{ ...member, status: 'withdrawn' as const }, { ...member, capabilities: ['platform:super_admin'] }])('keeps protected members read-only', protectedMember => {
      const { props } = setup({ member: protectedMember });
      expect(screen.queryByRole('button', { name: '저장' })).toBeNull(); expect(props.makeRequest).not.toHaveBeenCalled();
    });
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FundingCreatorLayout } from './FundingCreatorLayout';
import { FundingCreatorOperations } from './FundingCreatorOperations';
import type { Trial } from '../../api/trial';
const { eligibility, selectOrg, submit, participants, status, auth } = vi.hoisted(() => ({ eligibility: vi.fn(), selectOrg: vi.fn(), submit: vi.fn(), participants: vi.fn(), status: vi.fn(), auth: { isAuthenticated: true, isLoading: false, user: { id: 'creator' } } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/trial', () => ({ PAYMENT_STATUS_LABELS: { unpaid: '미입금', paid: '입금 확인' }, getFundingCreatorEligibility: eligibility, selectFundingOrganization: selectOrg, submitTrial: submit, getFundingCreatorParticipants: participants, changeFundingCreatorStatus: status }));
const trial = (state = 'draft', id = 'project') => ({ id, status: state } as Trial);
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); eligibility.mockResolvedValue({}); participants.mockResolvedValue([]); submit.mockResolvedValue({}); status.mockResolvedValue({}); });
it('retries organization selection and mounts the creator workspace only after server eligibility', async () => {
  eligibility.mockRejectedValueOnce({ response: { data: { candidates: [{ organizationId: 'org', organizationName: '공급 조직' }], error: { message: '조직 선택 필요' } } } });
  render(<MemoryRouter initialEntries={['/market-trial/manage']}><Routes><Route path="/market-trial/manage" element={<FundingCreatorLayout />}><Route index element={<p>CREATOR WORKSPACE</p>} /></Route></Routes></MemoryRouter>);
  await screen.findByText('조직 선택 필요'); expect(screen.queryByText('CREATOR WORKSPACE')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '공급 조직' }));
  await screen.findByText('CREATOR WORKSPACE'); expect(selectOrg).toHaveBeenCalledWith('org');
});
it('does not show a false empty list when participant loading fails', async () => {
  participants.mockRejectedValue(new Error('unavailable'));
  render(<MemoryRouter><FundingCreatorOperations trial={trial()} onChange={() => {}} /></MemoryRouter>);
  await screen.findByRole('alert'); expect(screen.queryByText('참여자가 없습니다.')).toBeNull();
});
it.each([['draft', '개설 신청', submit, undefined], ['development', '결과 확정 단계로 전환', status, 'outcome_confirming']])('handles %s operations without payment APIs', async (state, label, action, next) => {
  const onChange = vi.fn();
  render(<MemoryRouter><FundingCreatorOperations trial={trial(state as string)} onChange={onChange} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: label as string }));
  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  expect(action).toHaveBeenCalledWith(...(next ? ['project', next] : ['project']));
});
it('does not reload another project when an old operation finishes late', async () => {
  let finish!: () => void; submit.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  const onChange = vi.fn();
  const view = render(<MemoryRouter><FundingCreatorOperations trial={trial()} onChange={onChange} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '개설 신청' }));
  view.rerender(<MemoryRouter><FundingCreatorOperations trial={trial('draft', 'other-project')} onChange={onChange} /></MemoryRouter>);
  await act(async () => finish()); expect(onChange).not.toHaveBeenCalled();
});

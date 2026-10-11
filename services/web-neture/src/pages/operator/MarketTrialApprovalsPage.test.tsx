import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ trials: vi.fn(), kpi: vi.fn() }));
vi.mock('../../api/trial', () => ({ getOperatorTrials: mocks.trials, getOperatorMarketTrialKpi: mocks.kpi }));
import MarketTrialApprovalsPage from './MarketTrialApprovalsPage';
beforeEach(() => { vi.resetAllMocks(); mocks.kpi.mockResolvedValue(null); });
afterEach(cleanup);
it('late responses cannot replace the latest operating-stage filter', async () => {
  let oldResponse!: (data: unknown[]) => void;
  mocks.trials.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; })).mockResolvedValueOnce([{ id: 'fixture', title: '준비 중인 펀딩', status: 'development', currentParticipants: 1 }]);
  render(<MemoryRouter><MarketTrialApprovalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '준비 중', exact: true }));
  await screen.findByText('준비 중인 펀딩');
  await act(async () => oldResponse([{ id: 'stale', title: '이전 응답', status: 'closed', currentParticipants: 0 }]));
  expect(screen.queryByText('이전 응답')).toBeNull();
  await waitFor(() => expect(mocks.trials).toHaveBeenLastCalledWith('development'));
});

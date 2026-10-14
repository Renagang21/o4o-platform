import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ trials: vi.fn(), participations: vi.fn() }));
vi.mock('../../api/trial', () => ({ getTrials: mocks.trials, getMyParticipations: mocks.participations }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture-member' }, isAuthenticated: true, isLoading: false }) }));
import MarketTrialHubPage from './MarketTrialHubPage';

const trial = { id: 'fixture-trial', title: '샘플 모집', status: 'recruiting', supplierId: 'fixture-supplier', currentParticipants: 1 };
const renderPage = () => render(<MemoryRouter><MarketTrialHubPage /></MemoryRouter>);
beforeEach(() => { vi.resetAllMocks(); mocks.trials.mockResolvedValue([trial]); mocks.participations.mockResolvedValue([]); });
afterEach(cleanup);

describe('펀딩 목록과 내 참여 내역의 독립 조회 상태', () => {
  it('참여 조회 실패를 알리고 모집 목록은 유지하며 재시도로 복구한다', async () => {
    mocks.participations.mockRejectedValueOnce(new Error('fixture failure'));
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('내 참여 내역을 불러오지 못했습니다.');
    expect(screen.getByText('샘플 모집')).toBeTruthy();
    mocks.participations.mockResolvedValueOnce([{ trialId: trial.id, rewardType: 'product' }]);
    fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }));
    await screen.findByRole('heading', { name: '내가 참여한 유통참여형 펀딩' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('목록 재조회 동안 로딩을 표시하고 빈 참여 응답은 이전 표시를 제거한다', async () => {
    mocks.trials.mockRejectedValueOnce(new Error('fixture failure'));
    mocks.participations.mockResolvedValueOnce([{ trialId: trial.id, rewardType: 'product' }]);
    renderPage();
    const alert = await screen.findByRole('alert');
    let resolve!: (value: unknown[]) => void;
    mocks.trials.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }));
    await screen.findByText('불러오는 중...');
    expect(screen.queryByText('현재 모집 중인 유통참여형 펀딩이 없습니다')).toBeNull();
    resolve([trial]);
    await screen.findByText('샘플 모집');
    expect(screen.queryByText(/내 참여 ·/)).toBeNull();
    expect(screen.queryByRole('heading', { name: '내가 참여한 유통참여형 펀딩' })).toBeNull();
  });

  it('잘못된 참여 응답은 참여 없음으로 표시하지 않는다', async () => {
    mocks.participations.mockResolvedValue({ items: [] });
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('내 참여 내역을 불러오지 못했습니다.');
    expect(screen.getByText('샘플 모집')).toBeTruthy();
  });

  it('성공한 빈 모집 결과와 목록 조회 실패를 구분한다', async () => {
    mocks.trials.mockResolvedValue([]);
    renderPage();
    await screen.findByText('현재 모집 중인 유통참여형 펀딩이 없습니다');
    expect(screen.queryByRole('alert')).toBeNull();
    await waitFor(() => expect(mocks.trials).toHaveBeenCalledTimes(1));
  });
});

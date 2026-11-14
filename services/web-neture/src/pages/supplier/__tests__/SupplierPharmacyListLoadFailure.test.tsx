/**
 * 공급 제안 · 약국 협력사업 이벤트 목록 — 조회 실패는 '목록 없음'과 다르다.
 *   표 안에 실패와 [다시 시도]를 보이고, 작업 결과 문구를 덮어쓰지 않는다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SupplierSupplyProposalsPage from '../SupplierSupplyProposalsPage';
import SupplierSemiFranchiseEventsPage from '../SupplierSemiFranchiseEventsPage';

vi.mock('../../../contexts', () => ({ useAuth: () => ({ user: { id: 'fixture-user' } }) }));
vi.mock('../../../lib/api', () => ({
  supplierProfileApi: { getProfile: async () => ({ id: 'fixture-supplier' }) },
}));
const mocks = vi.hoisted(() => ({
  listProposals: vi.fn(),
  createProposal: vi.fn(),
  endProposal: vi.fn(),
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  cancelEvent: vi.fn(),
}));
vi.mock('../../../lib/api/neturePharmacy', async (original) => ({
  ...(await original<typeof import('../../../lib/api/neturePharmacy')>()),
  neturePharmacySupplierApi: mocks,
}));
vi.mock('../../../components/neture-pharmacy/useSupplierPharmacyOptions', () => {
  const options = {
    products: [{ id: 'offer-a', name: '제품 A' }],
    semiFranchises: [{ key: 'a', name: '협업체 A' }],
    loading: false,
    error: null,
  };
  return { productLabel: () => '제품 A', useSupplierPharmacyOptions: () => options };
});
vi.mock('../../../components/supplier/SupplierEventNavigation', () => ({ default: () => null }));

const proposal = {
  id: 'p-1', productName: '접수 제품', offerId: 'offer-a', semiFranchiseKey: 'a', semiFranchiseName: '협업체 A',
  unitPrice: 1000, status: 'pending', createdAt: '2026-10-17T00:00:00Z',
};

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('SupplierSupplyProposalsPage — 목록 조회 실패', () => {
  const show = () => render(<MemoryRouter><SupplierSupplyProposalsPage /></MemoryRouter>);

  it('실패를 「제안 없음」으로 보이지 않고 다시 시도할 수 있다', async () => {
    mocks.listProposals.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([proposal]);
    show();
    expect(await screen.findByText(/공급 제안 목록을 불러오지 못했습니다/)).toBeTruthy();
    expect(screen.queryByText('낸 공급 제안이 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('접수 제품')).toBeTruthy();
    expect(screen.queryByText(/공급 제안 목록을 불러오지 못했습니다/)).toBeNull();
  });

  it('종료 성공 후 재조회가 실패해도 성공 문구를 덮어쓰지 않는다', async () => {
    mocks.listProposals.mockResolvedValueOnce([proposal]).mockRejectedValueOnce(new Error('network'));
    mocks.endProposal.mockResolvedValue({});
    show();
    fireEvent.click(await screen.findByRole('button', { name: /종료/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '종료' }));
    await waitFor(() => expect(mocks.endProposal).toHaveBeenCalledWith('p-1'));
    expect(await screen.findByText('제안을 종료했습니다.')).toBeTruthy();
    expect(await screen.findByText(/공급 제안 목록을 불러오지 못했습니다/)).toBeTruthy();
  });
});

describe('SupplierSemiFranchiseEventsPage — 목록 조회 실패', () => {
  const show = () => render(<MemoryRouter><SupplierSemiFranchiseEventsPage /></MemoryRouter>);

  it('실패를 「이벤트 없음」으로 보이지 않고 다시 시도할 수 있다', async () => {
    mocks.listEvents.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([]);
    show();
    expect(await screen.findByText(/이벤트 목록을 불러오지 못했습니다/)).toBeTruthy();
    expect(screen.queryByText('신청한 이벤트가 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('신청한 이벤트가 없습니다.')).toBeTruthy();
  });

  it('취소 성공 후 재조회가 실패해도 성공 문구를 덮어쓰지 않는다', async () => {
    const event = {
      id: 'ev-1', productName: '이벤트 제품', createdAt: '2026-11-01T00:00:00Z', semiFranchiseName: '협업체 A',
      eventPrice: 900, priceGeneral: 1000, startAt: '2026-11-10T00:00:00Z', endAt: '2026-11-20T00:00:00Z',
      totalQuantity: null, perStoreLimit: null, perOrderLimit: null, status: 'pending', reason: null,
    };
    mocks.listEvents.mockResolvedValueOnce([event]).mockRejectedValueOnce(new Error('network'));
    mocks.cancelEvent.mockResolvedValue({});
    show();
    fireEvent.click(await screen.findByRole('button', { name: '취소' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '이벤트 취소' }));
    await waitFor(() => expect(mocks.cancelEvent).toHaveBeenCalledWith('ev-1'));
    expect(await screen.findByText('이벤트를 취소했습니다.')).toBeTruthy();
    expect(await screen.findByText(/이벤트 목록을 불러오지 못했습니다/)).toBeTruthy();
  });
});

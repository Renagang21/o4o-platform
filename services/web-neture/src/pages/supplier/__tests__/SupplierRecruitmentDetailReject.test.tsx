/**
 * 판매자 모집 신청 반려 — 사유 입력창에서 [취소]를 누르면 반려하지 않는다(되돌릴 수 없는 동작).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SupplierRecruitmentDetailPage from '../SupplierRecruitmentDetailPage';

const mocks = vi.hoisted(() => ({
  api: {
    getApplications: vi.fn(),
    approveApplication: vi.fn(),
    rejectApplication: vi.fn(),
    terminateApplication: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn(),
  },
}));
vi.mock('../../../lib/api/supplier', () => ({
  supplierRecruitmentApi: mocks.api,
  SUPPLIER_RECRUITMENT_NOT_FOUND: 'SUPPLIER_RECRUITMENT_NOT_FOUND',
}));
vi.mock('../../../components/supplier/RecruitmentSupplyPricePanel', () => ({ default: () => null }));

const DETAIL = {
  recruitment: {
    recruitmentKind: 'public', id: 'rec-1', productId: 'prod-1', productName: '검증 제품',
    serviceId: 'svc-1', serviceName: '검증 서비스', commissionRate: 10, consumerPrice: 10000,
    supplyUnitPrice: null, status: 'recruiting', exposureStatus: 'approved', exposureReviewedAt: null,
    exposureReviewedBy: null, exposureReviewNote: null, createdAt: '2026-11-01T00:00:00Z',
  },
  applications: [{
    id: 'app-1', applicantName: '[신청자 A]', applicantEmail: null, organizationName: null,
    status: 'pending', reason: null, appliedAt: '2026-11-02T00:00:00Z', participationTerminated: false,
  }],
};

function mount() {
  return render(
    <MemoryRouter initialEntries={['/supplier/recruitments/rec-1']}>
      <Routes>
        <Route path="/supplier/recruitments/:recruitmentId" element={<SupplierRecruitmentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.api.getApplications.mockResolvedValue(DETAIL);
  mocks.api.rejectApplication.mockResolvedValue({ success: true });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SupplierRecruitmentDetailPage — 반려', () => {
  it('사유 입력창에서 [취소]하면 반려 API 를 부르지 않는다', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: '반려' }));
    expect(window.prompt).toHaveBeenCalledTimes(1);
    expect(mocks.api.rejectApplication).not.toHaveBeenCalled();
    expect(mocks.api.getApplications).toHaveBeenCalledTimes(1);
  });

  it('사유를 비우고 확인하면 사유 없이 반려한다 · 사유는 앞뒤 공백을 지운다', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce('').mockReturnValueOnce('  재고 부족  ');
    mount();
    fireEvent.click(await screen.findByRole('button', { name: '반려' }));
    await waitFor(() => expect(mocks.api.rejectApplication).toHaveBeenCalledWith('app-1', undefined));
    fireEvent.click(await screen.findByRole('button', { name: '반려' }));
    await waitFor(() => expect(mocks.api.rejectApplication).toHaveBeenLastCalledWith('app-1', '재고 부족'));
    expect(prompt).toHaveBeenCalledTimes(2);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import SellerRecruitmentsBrowsePage from '../SellerRecruitmentsBrowsePage';

const mocks = vi.hoisted(() => ({ get: vi.fn(), mine: vi.fn(), post: vi.fn() }));
vi.mock('../../../api/client', () => ({
  apiClient: { get: mocks.get }, coreApiClient: { get: mocks.mine, post: mocks.post },
}));
const recruitment = (id: string, kind: string | undefined, exposure: string) => ({
  id, productName: id, manufacturer: '제조사', sellerName: '공급자', consumerPrice: 1000,
  commissionRate: 0, imageUrl: '', recruitmentKind: kind, exposureStatus: exposure,
});
beforeEach(() => { vi.clearAllMocks(); mocks.mine.mockResolvedValue({ data: [] }); });
afterEach(cleanup);

describe('판매자 모집 게시 구분', () => {
  it.each(['pending', 'rejected'])('과거 노출 %s 공개 모집을 운영자 승인으로 안내하지 않는다', async exposure => {
    mocks.get.mockResolvedValue({ data: [recruitment('공개 제품', 'public', exposure)] });
    render(<SellerRecruitmentsBrowsePage />);
    await screen.findByRole('button', { name: '공개 제품' });
    expect(screen.getByText('일반 공개 모집')).toBeTruthy();
    expect(screen.queryByText(/서비스 운영자가 승인한/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '공개 제품' }));
    expect(within(screen.getByRole('dialog')).getByText('일반 공개 모집')).toBeTruthy();
  });
  it('함께 표시된 사업 모집은 공개 모집과 구분한다', async () => {
    mocks.get.mockResolvedValue({ data: [recruitment('공개 제품', 'public', 'pending'), recruitment('사업 제품', 'semi-franchise', 'approved')] });
    render(<SellerRecruitmentsBrowsePage />);
    await screen.findByRole('button', { name: '사업 제품' });
    expect(screen.getByText('일반 공개 모집')).toBeTruthy();
    expect(screen.getByText('세미프랜차이즈 모집')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '사업 제품' }));
    expect(within(screen.getByRole('dialog')).getByText('세미프랜차이즈 모집')).toBeTruthy();
  });
  it('빈 목록에서도 일반 공개 모집에 운영자 승인을 요구하지 않는다', async () => {
    mocks.get.mockResolvedValue({ data: [] });
    render(<SellerRecruitmentsBrowsePage />);
    await screen.findByText('현재 참여 가능한 판매자 모집이 없습니다.');
    expect(screen.queryByText('새로운 모집이 승인되면 이 화면에서 확인할 수 있습니다.')).toBeNull();
  });
});

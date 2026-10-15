import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../../lib/api';
import SupplierProductsPage from '../SupplierProductsPage';

const api = vi.hoisted(() => ({
  getProductsPaginated: vi.fn(),
  getApprovalCounts: vi.fn(),
  submitForApproval: vi.fn(),
  bulkDelete: vi.fn(),
  batchUpdateProducts: vi.fn(),
}));
vi.mock('../../../lib/api', () => ({ supplierApi: api }));
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useOutletContext: () => null,
}));
vi.mock('@o4o/content-editor', () => ({
  ContentRenderer: ({ html }: { html: string }) => <div>{html}</div>,
}));
vi.mock('../ProductDetailDrawer', () => ({
  default: ({
    product,
    open,
    onSaved,
    onClose,
  }: {
    product: SupplierProduct | null;
    open: boolean;
    onSaved: () => void;
    onClose: () => void;
  }) =>
    open && product ? (
      <div role="dialog">
        {product.name}
        <button onClick={onSaved}>Drawer 저장</button>
        <button onClick={onClose}>Drawer 닫기</button>
      </div>
    ) : null,
}));
vi.mock('../../../components/supplier/RecruitmentCreateModal', () => ({ default: () => null }));
// Render the page's real column callbacks; the shared table's own editing mechanics are outside this test.
vi.mock('@o4o/operator-ux-core', () => ({
  EditableDataTable: ({
    columns,
    data,
    loading,
    emptyMessage,
    onSave,
  }: {
    columns: ListColumnDef<SupplierProduct>[];
    data: SupplierProduct[];
    loading: boolean;
    emptyMessage: ReactNode;
    onSave: (rows: SupplierProduct[]) => void;
  }) =>
    loading ? (
      <div>목록 로딩</div>
    ) : data.length === 0 ? (
      <div>{emptyMessage}</div>
    ) : (
      <>
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={String(c.key)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.id} data-testid={row.id}>
                {columns.map((c) => (
                  <td key={String(c.key)}>
                    {c.render
                      ? c.render(row[c.key as keyof SupplierProduct] as never, row, index)
                      : String(row[c.key as keyof SupplierProduct] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => onSave([{ ...data[0], priceGeneral: 2000 }])}>인라인 저장</button>
      </>
    ),
  SearchBar: ({
    value,
    onChange,
    onSearch,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSearch: (v: string) => void;
  }) => (
    <>
      <input aria-label="상품 검색" value={value} onChange={(e) => onChange(e.target.value)} />
      <button onClick={() => onSearch(value)}>검색 실행</button>
    </>
  ),
  Pagination: ({ page, onPageChange }: { page: number; onPageChange: (v: number) => void }) => (
    <>
      <span>현재 페이지 {page}</span>
      <button onClick={() => onPageChange(2)}>2페이지</button>
    </>
  ),
}));

const products = [1, 2].map((n) => ({
  id: `offer-${n}`,
  masterId: `master-${n}`,
  name: `검증 상품 ${n}`,
  regulatoryType: 'GENERAL',
  distributionType: 'PUBLIC',
  isActive: true,
  isPublic: true,
  priceGeneral: 1000,
  stockQuantity: 5,
  purpose: 'CATALOG',
  serviceKeys: ['kpa-society'],
  serviceApprovals: [],
  approvalStatus: 'PENDING',
  completenessScore: 50,
  completenessStatus: 'INCOMPLETE',
})) as SupplierProduct[];

const mount = () =>
  render(
    <MemoryRouter>
      <SupplierProductsPage />
    </MemoryRouter>,
  );
const loaded = async () => {
  await screen.findByTestId('offer-1');
};
const selectFirst = () =>
  fireEvent.click(within(screen.getByTestId('offer-1')).getByRole('checkbox'));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  Element.prototype.scrollIntoView = vi.fn();
  api.getProductsPaginated.mockImplementation(async ({ page }) => ({
    data: products.map((p) => ({ ...p })),
    pagination: { page, limit: 50, total: 100, totalPages: 2 },
  }));
  api.getApprovalCounts.mockResolvedValue({
    total: 2,
    unrequested: 2,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  api.submitForApproval.mockResolvedValue({
    success: true,
    data: { submitted: 1, skipped: [], errors: [] },
  });
  api.bulkDelete.mockResolvedValue({ deleted: 1, failed: [] });
  api.batchUpdateProducts.mockResolvedValue({ updated: ['offer-1'], failed: [] });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SupplierProductsPage existing workflow', () => {
  it('shows the successful empty-list state separately from a filtered empty list', async () => {
    api.getProductsPaginated.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    mount();
    await screen.findByText('등록된 제품이 없습니다');
    fireEvent.change(screen.getByLabelText('상품 검색'), { target: { value: '검색 조건' } });
    await screen.findByText('현재 필터/검색 조건에 맞는 상품이 없습니다.');
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    await screen.findByText('등록된 제품이 없습니다');
    expect(api.getProductsPaginated.mock.lastCall?.[0].keyword).toBeUndefined();
  });

  it('reports individual bulk-delete failures and clears selection after refreshing', async () => {
    api.bulkDelete.mockResolvedValue({
      deleted: 0,
      failed: [{ id: 'offer-1', error: 'HAS_ACTIVE_LISTINGS' }],
    });
    mount();
    await loaded();
    selectFirst();
    fireEvent.click(screen.getByRole('button', { name: '일괄 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제', exact: true }));
    await screen.findByText(/매장 진열 중이라 삭제 불가/);
    await waitFor(() => expect(api.getProductsPaginated).toHaveBeenCalledTimes(2));
    expect(api.bulkDelete).toHaveBeenCalledWith(['offer-1']);
    expect(screen.queryByText('1개 선택')).toBeNull();
  });

  it('does not send an approval request after confirmation is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    mount();
    await loaded();
    selectFirst();
    fireEvent.click(screen.getByRole('button', { name: '승인 요청' }));
    expect(api.submitForApproval).not.toHaveBeenCalled();
    expect(screen.getByText('1개 선택')).toBeTruthy();
  });
  it('distinguishes a failed list from an empty successful list and can retry', async () => {
    api.getProductsPaginated.mockRejectedValueOnce(new Error('unavailable'));
    mount();
    await screen.findByText('상품 목록을 불러오지 못했습니다.');
    expect(screen.queryByText('등록된 제품이 없습니다')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await loaded();
    expect(api.getProductsPaginated).toHaveBeenCalledTimes(2);
  });

  it('keeps count failures independent from the loaded rows and shows unknown counts', async () => {
    api.getApprovalCounts.mockRejectedValue(new Error('unavailable'));
    mount();
    await loaded();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /승인요청 전/ }).textContent).toContain('—'),
    );
    expect(screen.queryByText('상품 목록을 불러오지 못했습니다.')).toBeNull();
  });

  it('applies shared query filters to rows and counts, but the approval tab only to rows', async () => {
    mount();
    await loaded();
    fireEvent.change(screen.getByLabelText('상품 검색'), { target: { value: '바코드' } });
    fireEvent.click(screen.getByRole('button', { name: '검색 실행' }));
    fireEvent.click(screen.getByRole('button', { name: /승인 요청 중/ }));
    await waitFor(() =>
      expect(api.getProductsPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: '바코드', serviceApprovalStatus: 'pending', page: 1 }),
      ),
    );
    expect(api.getApprovalCounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: '바코드' }),
    );
    expect(api.getApprovalCounts.mock.lastCall?.[0]).not.toHaveProperty('serviceApprovalStatus');
  });

  it('refreshes both rows and counts after approval while keeping the current page', async () => {
    mount();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '2페이지' }));
    await screen.findByText('현재 페이지 2');
    selectFirst();
    fireEvent.click(screen.getByRole('button', { name: '승인 요청' }));
    await screen.findByText('1건 승인 요청 완료');
    await waitFor(() => expect(api.getProductsPaginated).toHaveBeenCalledTimes(3));
    expect(api.getProductsPaginated.mock.lastCall?.[0].page).toBe(2);
    expect(api.getApprovalCounts).toHaveBeenCalledTimes(2);
    expect(api.submitForApproval).toHaveBeenCalledWith(['offer-1']);
    expect(screen.queryByText('1개 선택')).toBeNull();
  });

  it('shows skipped approval reasons with the selected product instead of a success-only toast', async () => {
    api.submitForApproval.mockResolvedValue({
      success: true,
      data: { submitted: 0, skipped: [{ id: 'offer-1', reason: 'UNKNOWN_REASON' }], errors: [] },
    });
    mount();
    await loaded();
    selectFirst();
    fireEvent.click(screen.getByRole('button', { name: '승인 요청' }));
    await screen.findByText('승인 요청 결과');
    expect(screen.getByText('승인 요청 제외: 1건')).toBeTruthy();
    expect(screen.getAllByText('검증 상품 1').length).toBeGreaterThan(1);
  });

  it('reports partial inline-save failure and preserves the offer-only payload', async () => {
    api.batchUpdateProducts.mockResolvedValue({
      updated: [],
      failed: [{ id: 'offer-1', error: 'PRODUCT_NOT_FOUND' }],
    });
    mount();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '연속 작업 ON' }));
    fireEvent.click(screen.getByRole('button', { name: '인라인 저장' }));
    await screen.findByText(/0건 저장/);
    const payload = api.batchUpdateProducts.mock.lastCall?.[0][0];
    expect(payload).toEqual({
      offerId: 'offer-1',
      priceGeneral: 2000,
      consumerReferencePrice: null,
      stockQuantity: 5,
      isActive: true,
      isPublic: true,
    });
    expect(payload).not.toHaveProperty('masterId');
  });

  it('continues to the next incomplete row after a single inline save', async () => {
    mount();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '인라인 저장' }));
    await screen.findByText('다음: 검증 상품 2');
    expect(screen.queryByRole('dialog')).toBeNull();
    // Let the page's delayed scroll run before jsdom is torn down.
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('opens the selected Drawer and refreshes its current page after saving', async () => {
    mount();
    await loaded();
    fireEvent.click(within(screen.getByTestId('offer-1')).getByTitle('상세보기/수정'));
    expect(screen.getByRole('dialog').textContent).toContain('검증 상품 1');
    fireEvent.click(screen.getByRole('button', { name: 'Drawer 저장' }));
    await waitFor(() => expect(api.getProductsPaginated).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

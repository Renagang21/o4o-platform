import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SupplierProduct } from '../../../lib/api';
import type { ProductFormData } from '../../../components/product';
import ProductDetailDrawer from '../ProductDetailDrawer';

const mocks = vi.hoisted(() => ({
  supplier: {
    updateProduct: vi.fn(),
    updateBusinessContent: vi.fn(),
    listSpotPolicies: vi.fn(),
    getServicePrices: vi.fn(),
    createSpotPolicy: vi.fn(),
    changeSpotPolicyStatus: vi.fn(),
    setServicePrices: vi.fn(),
    updateDistribution: vi.fn(),
  },
  product: {
    getProductImages: vi.fn(),
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    uploadProductImage: vi.fn(),
    deleteProductImage: vi.fn(),
    registerImageFromUrl: vi.fn(),
  },
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('../../../lib/api', () => ({ supplierApi: mocks.supplier, productApi: mocks.product }));
vi.mock('@o4o/error-handling', () => ({ toast: mocks.toast }));
vi.mock('../../../contexts', () => ({ useAuth: () => ({ user: { roles: [] } }) }));
vi.mock('../../../hooks/useContentTemplates', () => ({
  useContentTemplates: () => ({
    templates: [],
    loading: false,
    saving: false,
    loadTemplates: vi.fn(),
    saveTemplate: vi.fn(),
    recordUse: vi.fn(),
  }),
}));
vi.mock('@o4o/content-editor', () => ({
  ContentRenderer: ({ html }: { html: string }) => <div>{html}</div>,
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (c: { html: string }) => void;
    placeholder: string;
  }) => (
    <textarea
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange({ html: e.target.value })}
    />
  ),
}));
vi.mock('@o4o/operator-ux-core', () => ({
  Section: ({ title, children }: { title: string; children: ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
  InfoRow: ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      {label}
      {children}
    </div>
  ),
  FormField: ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      {label}
      {children}
    </div>
  ),
}));
// Keep the real OfferEditSection; replace only the shared form/editor internals.
vi.mock('../../../components/product', () => ({
  ProductForm: ({
    initialData,
    onChange,
  }: {
    initialData: ProductFormData;
    onChange: (data: ProductFormData, dirty: boolean) => void;
  }) => {
    const mountedData = useRef(initialData);
    useEffect(() => {
      onChange(mountedData.current, false);
    }, [onChange]);
    return (
      <input
        aria-label="기본 공급가"
        defaultValue={initialData.priceGeneral ?? ''}
        onChange={(e) => onChange({ ...initialData, priceGeneral: Number(e.target.value) }, true)}
      />
    );
  },
}));
vi.mock('../../../components/common/MediaPickerModal', () => ({
  default: ({
    open,
    onSelect,
    title,
  }: {
    open: boolean;
    title?: string;
    onSelect: (asset: { url: string }) => void;
  }) =>
    open ? (
      <button onClick={() => onSelect({ url: '/fixture-image.png' })}>
        {title || '설명 이미지 선택'}
      </button>
    ) : null,
}));

const product = {
  id: 'offer-a',
  masterId: 'master-a',
  name: '검증 상품',
  masterName: '기준 상품',
  regulatoryType: 'GENERAL',
  distributionType: 'SERVICE',
  isActive: true,
  isPublic: false,
  priceGeneral: 1000,
  stockQuantity: 5,
  serviceKeys: ['kpa-society'],
  serviceApprovals: [],
  approvalStatus: 'PENDING',
  businessShortDescription: '기존 B2B',
  businessDetailDescription: '기존 B2B 상세',
  consumerShortDescription: '기존 B2C',
  consumerDetailDescription: '기존 B2C 상세',
} as SupplierProduct;
const saved = vi.fn();
const closed = vi.fn();
const element = (p: SupplierProduct = product, extra = {}) => (
  <MemoryRouter>
    <ProductDetailDrawer product={p} open onSaved={saved} onClose={closed} {...extra} />
  </MemoryRouter>
);
const edit = (mode: 'B2B' | 'B2C') =>
  fireEvent.click(screen.getByRole('button', { name: `${mode} 편집` }));
const save = () => fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));

beforeEach(() => {
  vi.resetAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  mocks.product.getProductImages.mockResolvedValue([]);
  mocks.product.getCategories.mockResolvedValue([]);
  mocks.product.getBrands.mockResolvedValue([]);
  mocks.supplier.listSpotPolicies.mockResolvedValue([]);
  mocks.supplier.getServicePrices.mockResolvedValue({
    success: true,
    data: { priceGeneral: 1000, prices: [] },
  });
  mocks.supplier.updateProduct.mockResolvedValue({ success: true });
  mocks.supplier.updateBusinessContent.mockResolvedValue({ success: true });
  mocks.supplier.setServicePrices.mockResolvedValue({ success: true });
  mocks.supplier.updateDistribution.mockResolvedValue({ success: true });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProductDetailDrawer existing workflow', () => {
  it('keeps a forbidden spot-policy result distinct from an empty policy list', async () => {
    mocks.supplier.listSpotPolicies.mockRejectedValue(
      new Error('SUPPLIER_SPOT_POLICIES_FORBIDDEN'),
    );
    render(element());
    await screen.findByText('이 상품의 스팟 정책을 볼 권한이 없습니다.');
    expect(screen.queryByText('등록된 스팟 정책이 없습니다')).toBeNull();
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  });

  it('reports an image upload failure and leaves the image list unchanged', async () => {
    mocks.product.uploadProductImage.mockResolvedValue({ success: false, error: 'NETWORK_ERROR' });
    const view = render(element());
    edit('B2C');
    const input = view.container.querySelector('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(['fixture'], 'fixture.png', { type: 'image/png' })] },
    });
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('이미지 업로드 실패: 통신 오류'),
      ),
    );
    expect(mocks.product.getProductImages).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
  });

  it('does not remove an image or notify a save when deletion fails', async () => {
    mocks.product.getProductImages.mockResolvedValue([
      { id: 'image-a', imageUrl: '/fixture.png', type: 'detail', source: 'supplier_upload' },
    ]);
    mocks.product.deleteProductImage.mockResolvedValue(false);
    render(element());
    edit('B2C');
    fireEvent.click(await screen.findByTitle('삭제'));
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        '이미지를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      ),
    );
    expect(mocks.product.deleteProductImage).toHaveBeenCalledWith('image-a', 'master-a');
    expect(screen.getByTitle('삭제')).toBeTruthy();
    expect(saved).not.toHaveBeenCalled();
  });

  it('keeps policy creation successful when the following refresh fails', async () => {
    mocks.supplier.createSpotPolicy.mockResolvedValue({ success: true });
    render(element());
    fireEvent.click(await screen.findByRole('button', { name: '+ 스팟 정책 추가' }));
    fireEvent.change(screen.getByPlaceholderText('정책명 (예: 4월 프로모션)'), {
      target: { value: '검증 정책' },
    });
    fireEvent.change(screen.getByPlaceholderText('스팟 가격 (원)'), { target: { value: '900' } });
    const dates = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[0], { target: { value: '2026-10-13' } });
    fireEvent.change(dates[1], { target: { value: '2026-10-14' } });
    mocks.supplier.listSpotPolicies.mockRejectedValue(new Error('refresh unavailable'));
    fireEvent.click(screen.getByRole('button', { name: '생성', exact: true }));
    await screen.findByText('스팟 정책을 불러오지 못했습니다.');
    expect(mocks.supplier.createSpotPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: 'offer-a', policyName: '검증 정책', spotPrice: 900 }),
    );
    expect(screen.queryByRole('button', { name: '생성', exact: true })).toBeNull();
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });
  it('saves B2B-only edits without writing the offer and normalizes empty descriptions', async () => {
    render(element());
    edit('B2B');
    fireEvent.change(screen.getByLabelText('거래처용 간단 소개'), {
      target: { value: '  변경 설명  ' },
    });
    fireEvent.change(screen.getByLabelText('거래처용 상세 설명'), { target: { value: '  ' } });
    save();
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mocks.supplier.updateBusinessContent).toHaveBeenCalledWith('offer-a', {
      businessShortDescription: '변경 설명',
      businessDetailDescription: null,
    });
    expect(mocks.supplier.updateProduct).not.toHaveBeenCalled();
  });

  it('keeps the B2B editor open when its save fails', async () => {
    mocks.supplier.updateBusinessContent.mockResolvedValue({
      success: false,
      error: 'PRODUCT_NOT_FOUND',
    });
    render(element());
    edit('B2B');
    save();
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('상품을 찾을 수 없습니다'),
      ),
    );
    expect(screen.getByText('B2B 편집 모드')).toBeTruthy();
    expect(saved).not.toHaveBeenCalled();
  });

  it('writes only offer fields, then changed B2B content, preserving partial-save feedback', async () => {
    mocks.supplier.updateBusinessContent.mockResolvedValue({
      success: false,
      error: 'NETWORK_ERROR',
    });
    render(element());
    edit('B2B');
    fireEvent.change(screen.getByLabelText('거래처용 간단 소개'), {
      target: { value: '변경 B2B' },
    });
    // The secondary edit entry mounts the common ProductForm in B2B mode.
    fireEvent.click(screen.getByRole('button', { name: '기본 정보 / B2C도 편집' }));
    fireEvent.change(screen.getByLabelText('기본 공급가'), { target: { value: '2000' } });
    save();
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mocks.supplier.updateProduct).toHaveBeenCalledWith(
      'offer-a',
      expect.objectContaining({ priceGeneral: 2000, consumerShortDescription: '기존 B2C' }),
    );
    const payload = mocks.supplier.updateProduct.mock.lastCall?.[1];
    for (const key of [
      'marketingName',
      'categoryId',
      'brandId',
      'specification',
      'originCountry',
      'serviceKeys',
    ])
      expect(payload).not.toHaveProperty(key);
    expect(mocks.supplier.updateProduct.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.supplier.updateBusinessContent.mock.invocationCallOrder[0],
    );
    expect(mocks.toast.error).toHaveBeenCalledWith('B2B 설명 저장 실패: NETWORK_ERROR');
    expect(screen.queryByText('B2B 편집 모드')).toBeNull();
  });

  it('stops before B2B content when the offer save fails', async () => {
    mocks.supplier.updateProduct.mockResolvedValue({
      success: false,
      error: 'SERVICE_REQUIRES_KEYS',
    });
    render(element());
    edit('B2C');
    save();
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('대상 서비스를 1개 이상'),
      ),
    );
    expect(mocks.supplier.updateBusinessContent).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByText('B2C 편집 모드')).toBeTruthy();
  });

  it('requires confirmation for a dirty Escape and keeps editing until discard', async () => {
    render(element());
    edit('B2C');
    fireEvent.change(screen.getByLabelText('기본 공급가'), { target: { value: '2000' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('저장하지 않은 변경사항')).toBeTruthy();
    expect(closed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '계속 편집' }));
    fireEvent.click(screen.getByRole('button', { name: '닫기', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '변경 취소' }));
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('cancels a clean editor on Escape and closes only on the next Escape', async () => {
    render(element());
    edit('B2C');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('B2C 편집 모드')).toBeNull();
    expect(closed).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('resets editing when the selected product changes', async () => {
    const view = render(element());
    edit('B2C');
    fireEvent.change(screen.getByLabelText('기본 공급가'), { target: { value: '2000' } });
    view.rerender(element({ ...product, id: 'offer-b', masterId: 'master-b' }));
    expect(screen.queryByText('B2C 편집 모드')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('distinguishes spot-policy failure from no policies and retries', async () => {
    mocks.supplier.listSpotPolicies.mockRejectedValueOnce(new Error('unavailable'));
    render(element());
    await screen.findByText('스팟 정책을 불러오지 못했습니다.');
    expect(screen.queryByText('등록된 스팟 정책이 없습니다')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('등록된 스팟 정책이 없습니다');
  });

  it('rejects a stale spot-policy response after switching offers', async () => {
    let resolveOld!: (value: unknown[]) => void;
    mocks.supplier.listSpotPolicies.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );
    const view = render(element());
    view.rerender(element({ ...product, id: 'offer-b' }));
    await screen.findByText('등록된 스팟 정책이 없습니다');
    await act(async () =>
      resolveOld([
        { id: 'old-policy', policyName: '이전 상품 정책', status: 'DRAFT', spotPrice: 1 },
      ]),
    );
    expect(screen.queryByText('이전 상품 정책')).toBeNull();
  });

  it('reports image registration failure without claiming a save', async () => {
    mocks.product.registerImageFromUrl.mockResolvedValue({
      success: false,
      error: 'MASTER_NOT_OWNED',
    });
    render(element());
    edit('B2C');
    fireEvent.click(screen.getByRole('button', { name: '라이브러리', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '상품 이미지 선택' }));
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        '이미지 등록 실패: 이 상품에 대한 권한이 없습니다.',
      ),
    );
    expect(saved).not.toHaveBeenCalled();
  });

  it('requires removal confirmation before writing distribution', async () => {
    render(element());
    fireEvent.click(screen.getByRole('button', { name: '공급 방식 변경', exact: true }));
    fireEvent.click(screen.getByLabelText('KPA Society'));
    save();
    expect(mocks.supplier.updateDistribution).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '철회하고 저장' }));
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mocks.supplier.updateDistribution).toHaveBeenCalledWith('offer-a', {
      isPublic: false,
      serviceKeys: [],
    });
  });

  it('validates service prices before sending and reloads them after a valid save', async () => {
    render(element());
    await waitFor(() => expect(mocks.supplier.getServicePrices).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '설정', exact: true }));
    fireEvent.change(screen.getByPlaceholderText('기본 1,000'), { target: { value: '0' } });
    save();
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith('KPA Society: 0보다 큰 정수를 입력하세요'),
    );
    expect(mocks.supplier.setServicePrices).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('기본 1,000'), { target: { value: '2000' } });
    save();
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mocks.supplier.setServicePrices).toHaveBeenCalledWith('offer-a', [
      { serviceKey: 'kpa-society', unitPrice: 2000 },
    ]);
    expect(mocks.supplier.getServicePrices).toHaveBeenCalledTimes(2);
  });

  it('preserves Operator approval callbacks and hides supplier edit entries', async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(element(product, { approvalActions: { onApprove, onReject } }));
    expect(screen.queryByRole('button', { name: 'B2C 편집' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '승인', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '반려', exact: true }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});

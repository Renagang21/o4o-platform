import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ProductFormData } from '../../../components/product';
import SupplierProductCreatePage from '../SupplierProductCreatePage';
import SupplierProductImportPage from '../SupplierProductImportPage';

const mocks = vi.hoisted(() => ({
  supplier: { submitProductCandidate: vi.fn(), copyImages: vi.fn(), proxyImageObjectUrl: vi.fn() },
  product: { getCategories: vi.fn(), getBrands: vi.fn(), getMasterByBarcode: vi.fn() },
  media: { upload: vi.fn() },
  toast: { error: vi.fn() },
}));
vi.mock('../../../lib/api', () => ({ supplierApi: mocks.supplier, productApi: mocks.product }));
vi.mock('../../../lib/api/supplier', () => ({ supplierApi: mocks.supplier }));
vi.mock('../../../lib/api/media', () => ({ mediaApi: mocks.media }));
vi.mock('@o4o/error-handling', () => ({ toast: mocks.toast }));
vi.mock('../../../api/guideContent', () => ({ fetchGuidePageContent: async () => ({}) }));
vi.mock('@o4o/shared-space-ui', () => ({ GuideBlock: () => null }));
vi.mock('../../../components/supplier/SupplierActivationGate', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../../components/supplier/SupplierProductLlmAssistPanel', () => ({
  default: () => null,
}));
vi.mock('../../../components/common/MediaPickerModal', () => ({
  default: ({
    open,
    title,
    onSelect,
  }: {
    open: boolean;
    title: string;
    onSelect: (asset: { url: string }) => void;
  }) =>
    open ? (
      <button onClick={() => onSelect({ url: '/fixture-library.png' })}>{title}</button>
    ) : null,
}));
vi.mock('@o4o/content-editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: { html: string }) => void;
    placeholder: string;
  }) => (
    <textarea
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange({ html: e.target.value })}
    />
  ),
}));
vi.mock('../../../components/product', () => ({
  ProductForm: ({
    initialData,
    onChange,
  }: {
    initialData: ProductFormData;
    onChange: (v: ProductFormData) => void;
  }) => (
    <input
      aria-label="검증 공급가"
      defaultValue={initialData.priceGeneral ?? ''}
      onChange={(e) => onChange({ ...initialData, priceGeneral: Number(e.target.value) })}
    />
  ),
}));

function Destination() {
  const location = useLocation();
  return (
    <div data-testid="destination">
      {location.pathname}
      {location.search}
    </div>
  );
}
function mount(kind: 'create' | 'import', query = '') {
  const path = kind === 'create' ? '/supplier/products/new' : '/supplier/products/import-assistant';
  return render(
    <MemoryRouter initialEntries={[path + query]}>
      <Routes>
        <Route
          path={path}
          element={
            kind === 'create' ? <SupplierProductCreatePage /> : <SupplierProductImportPage />
          }
        />
        <Route path="*" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}
const firstmallHtml =
  '<input name="goodsName" value="HTML 검증 상품"><input name="largeGoodsImage[]" value="https://fixture.invalid/thumb.png"><textarea id="mobile_contents_hidden">&lt;p&gt;검증 본문&lt;/p&gt;&lt;img src="https://fixture.invalid/detail.png"&gt;</textarea>';
async function createStep3(query = '') {
  const view = mount('create', query);
  await screen.findByRole('option', { name: '일반 카테고리' });
  fireEvent.change(view.container.querySelector('input[name="marketingName"]')!, {
    target: { value: '검증 상품' },
  });
  fireEvent.change(view.container.querySelector('select[name="categoryId"]')!, {
    target: { value: 'cat-a' },
  });
  fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
  fireEvent.change(screen.getByLabelText('검증 공급가'), { target: { value: '2000' } });
  fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
  return view;
}
function parseImport() {
  const view = mount('import', '?productType=quasi_drug');
  fireEvent.change(screen.getByPlaceholderText('관리자 상품 수정 페이지의 HTML을 붙여넣으세요'), {
    target: { value: firstmallHtml },
  });
  fireEvent.click(screen.getByRole('button', { name: '관리자 상품 데이터 분석' }));
  return view;
}
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:fixture'), revokeObjectURL: vi.fn() }),
  );
  mocks.product.getCategories.mockResolvedValue([
    { id: 'cat-a', name: '일반 카테고리', isRegulated: false },
  ]);
  mocks.product.getBrands.mockResolvedValue([]);
  mocks.product.getMasterByBarcode.mockResolvedValue(null);
  mocks.supplier.submitProductCandidate.mockResolvedValue({
    success: true,
    data: { candidateId: 'candidate-a' },
  });
  mocks.media.upload.mockResolvedValue({ success: true, data: { url: '/fixture-upload.png' } });
  mocks.supplier.proxyImageObjectUrl.mockResolvedValue('blob:fixture');
  mocks.supplier.copyImages.mockImplementation(async (urls: string[]) => ({
    copied: urls.length,
    results: urls.map((url, index) => ({
      originalUrl: url,
      ok: true,
      url: `/fixture-copy-${index}.png`,
    })),
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Candidate creation existing workflow', () => {
  it('preserves imported gallery and content images in order without duplicates', async () => {
    sessionStorage.setItem(
      'neture-import-draft',
      JSON.stringify({
        detailImageUrls: [
          'https://fixture.invalid/gallery.png',
          'https://fixture.invalid/shared.png',
        ],
        contentImageUrls: [
          'https://fixture.invalid/shared.png',
          'https://fixture.invalid/content.png',
        ],
      }),
    );
    await createStep3();
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    expect(mocks.supplier.submitProductCandidate.mock.lastCall?.[0].contentImageUrls).toEqual([
      'https://fixture.invalid/gallery.png',
      'https://fixture.invalid/shared.png',
      'https://fixture.invalid/content.png',
    ]);
  });
  it('preserves the selected prescription-drug classification in the Candidate', async () => {
    await createStep3('?productType=rx_drug');
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    expect(mocks.supplier.submitProductCandidate.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ regulatoryType: 'DRUG', drugCategory: 'rx' }),
    );
  });
  it('reports barcode lookup failure without marking an existing Master or submitting', async () => {
    mocks.product.getMasterByBarcode.mockRejectedValue(new Error('unavailable'));
    mount('create', '?barcode=FIXTURE');
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        '바코드 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      ),
    );
    expect(screen.queryByRole('button', { name: /기존 제품에 공급 연결/ })).toBeNull();
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();
  });
  it('validates the name/category and retries a failed category load', async () => {
    mocks.product.getCategories.mockRejectedValueOnce(new Error('unavailable'));
    mount('create');
    fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
    expect(screen.getByText('상품명을 입력해주세요.')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await screen.findByRole('option', { name: '일반 카테고리' });
    expect(mocks.product.getCategories).toHaveBeenCalledTimes(2);
  });
  it('sends a Candidate-only payload after the three steps', async () => {
    await createStep3();
    fireEvent.change(screen.getByLabelText('소비자에게 보이는 간이 설명을 입력하세요...'), {
      target: { value: '검증 설명' },
    });
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    const payload = mocks.supplier.submitProductCandidate.mock.lastCall?.[0];
    expect(payload).toEqual(
      expect.objectContaining({
        name: '검증 상품',
        categoryId: 'cat-a',
        brandId: null,
        imageUrl: null,
        contentImageUrls: [],
        offerDraft: expect.objectContaining({
          priceGeneral: 2000,
          consumerShortDescription: '검증 설명',
        }),
      }),
    );
    for (const key of [
      'distributionType',
      'serviceKeys',
      'stockQuantity',
      'isPublic',
      'supplierId',
    ])
      expect(payload).not.toHaveProperty(key);
  });
  it('keeps the form available with a mapped Candidate failure', async () => {
    mocks.supplier.submitProductCandidate.mockResolvedValue({
      success: false,
      error: 'FORBIDDEN_FIELD',
    });
    await createStep3();
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText(/허용되지 않은 항목이 포함/);
    expect(screen.queryByText('제품 정보 검토 요청 완료')).toBeNull();
  });
  it('continues a successful Candidate request after a failed master-less image upload', async () => {
    mocks.media.upload.mockResolvedValue({ success: false, error: 'UPLOAD_FAILED' });
    const view = await createStep3();
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [new File(['fixture'], 'fixture.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    expect(mocks.media.upload).toHaveBeenCalledWith(
      expect.any(File),
      true,
      undefined,
      'product-thumbnail',
    );
    expect(mocks.toast.error).toHaveBeenCalledWith(
      '검토 요청은 접수됐지만 이미지 1건은 업로드되지 않아 제외됐습니다.',
    );
    expect(mocks.supplier.submitProductCandidate.mock.lastCall?.[0].imageUrl).toBeNull();
  });
  it('finds an existing Master and navigates to supply linking instead of submitting', async () => {
    mocks.product.getMasterByBarcode.mockResolvedValue({
      id: 'master-a',
      barcode: 'FIXTURE',
      marketingName: '기존 상품',
    });
    mount('create', '?barcode=FIXTURE');
    fireEvent.click(await screen.findByRole('button', { name: /기존 제품에 공급 연결/ }));
    expect(screen.getByTestId('destination').textContent).toBe(
      '/supplier/products/from-master?masterId=master-a',
    );
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();
  });
  it('ignores invalid barcode query placeholders', async () => {
    mount('create', '?barcode=null');
    await screen.findByRole('option', { name: '일반 카테고리' });
    expect(mocks.product.getMasterByBarcode).not.toHaveBeenCalled();
  });
  it('consumes an import draft once without deriving a Brand identity', async () => {
    sessionStorage.setItem(
      'neture-import-draft',
      JSON.stringify({
        marketingName: '초안 상품',
        categoryId: 'cat-a',
        brandName: '초안 브랜드',
        priceGeneral: '3000',
        consumerDetailDesc: '초안 상세',
      }),
    );
    const view = mount('create');
    expect(
      (view.container.querySelector('input[name="marketingName"]') as HTMLInputElement).value,
    ).toBe('초안 상품');
    expect(sessionStorage.getItem('neture-import-draft')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
    expect((screen.getByLabelText('검증 공급가') as HTMLInputElement).value).toBe('3000');
  });
});

describe('Import existing workflow', () => {
  it('requires a product type and rejects unrelated HTML', async () => {
    mount('import');
    fireEvent.change(screen.getByPlaceholderText('관리자 상품 수정 페이지의 HTML을 붙여넣으세요'), {
      target: { value: '<p>기타 HTML</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '관리자 상품 데이터 분석' }));
    expect(screen.getByText('먼저 제품 유형(의약품/비의약품)을 선택해 주세요.')).toBeTruthy();
    expect(mocks.supplier.copyImages).not.toHaveBeenCalled();
  });
  it('parses locally and preserves the incoming precise type in the draft handoff', async () => {
    parseImport();
    fireEvent.click(screen.getByRole('button', { name: '상품 등록 페이지로 이동 →' }));
    await screen.findByTestId('destination');
    expect(screen.getByTestId('destination').textContent).toContain('productType=quasi_drug');
    const draft = JSON.parse(sessionStorage.getItem('neture-import-draft')!);
    expect(draft.marketingName).toBe('HTML 검증 상품');
    expect(draft.regulatoryType).toBe('QUASI_DRUG');
    expect(draft.thumbnailUrl).toBe('/fixture-copy-0.png');
    expect(mocks.supplier.copyImages).toHaveBeenCalledWith(
      ['https://fixture.invalid/thumb.png'],
      'https://fixture.invalid',
      { mode: 'thumbnail' },
    );
  });
  it('does not navigate or save a draft when all selected images fail to copy', async () => {
    mocks.supplier.copyImages.mockResolvedValue({ copied: 0, results: [] });
    parseImport();
    fireEvent.click(screen.getByRole('button', { name: '상품 등록 페이지로 이동 →' }));
    await screen.findByText(/선택 이미지를 O4O 저장소로 복사하지 못했습니다/);
    expect(screen.queryByTestId('destination')).toBeNull();
    expect(sessionStorage.getItem('neture-import-draft')).toBeNull();
  });
  it('requires confirmation before inserting copied detail images and uses preserve mode', async () => {
    parseImport();
    const button = screen.getByRole('button', {
      name: '선택 이미지를 O4O로 복사 후 상세설명에 넣기',
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(
      screen.getByLabelText('내 상품(또는 사용 권한이 있는 상품)의 상세설명 이미지가 맞습니다.'),
    );
    fireEvent.click(button);
    await waitFor(() =>
      expect(
        (screen.getByLabelText('상세 설명이 없습니다') as HTMLTextAreaElement).value,
      ).toContain('editor-image img-align-center'),
    );
    expect(mocks.supplier.copyImages).toHaveBeenCalledWith(
      ['https://fixture.invalid/detail.png'],
      'https://fixture.invalid',
      { mode: 'preserve' },
    );
    expect((screen.getByLabelText('상세 설명이 없습니다') as HTMLTextAreaElement).value).toContain(
      '/fixture-copy-0.png',
    );
  });
  it('resets parsed content and selections before another import', async () => {
    parseImport();
    fireEvent.click(screen.getByRole('button', { name: '초기화', exact: true }));
    expect(screen.queryByRole('button', { name: '상품 등록 페이지로 이동 →' })).toBeNull();
    expect(
      (
        screen.getByPlaceholderText(
          '관리자 상품 수정 페이지의 HTML을 붙여넣으세요',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('');
  });
});

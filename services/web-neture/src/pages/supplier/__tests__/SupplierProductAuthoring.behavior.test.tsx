import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ProductFormData } from '../../../components/product';
import SupplierProductCreatePage from '../SupplierProductCreatePage';
import SupplierProductImportPage from '../SupplierProductImportPage';

const mocks = vi.hoisted(() => ({
  supplier: {
    submitProductCandidate: vi.fn(),
    copyImages: vi.fn(),
    proxyImageObjectUrl: vi.fn(),
  },
  product: {
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    getMasterByBarcode: vi.fn(),
  },
  media: { upload: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn() },
  llm: {
    // 패널이 parse 후 넘기는 Draft 와 같은 모양(외부 AI 결과 fixture)
    draft: null as null | Record<string, unknown>,
    notes: [] as string[],
  },
}));
vi.mock('../../../lib/api', () => ({
  supplierApi: mocks.supplier,
  productApi: mocks.product,
}));
vi.mock('../../../lib/api/supplier', () => ({ supplierApi: mocks.supplier }));
vi.mock('../../../lib/api/media', () => ({ mediaApi: mocks.media }));
vi.mock('@o4o/error-handling', () => ({ toast: mocks.toast }));
vi.mock('../../../api/guideContent', () => ({
  fetchGuidePageContent: async () => ({}),
}));
vi.mock('@o4o/shared-space-ui', () => ({ GuideBlock: () => null }));
vi.mock('../../../components/supplier/SupplierActivationGate', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../../components/supplier/SupplierProductLlmAssistPanel', () => ({
  default: ({
    onApplyDraft,
    onUndoApply,
    canUndoApply,
  }: {
    onApplyDraft: (draft: never, mode: 'fill-empty' | 'overwrite') => string[];
    onUndoApply?: () => boolean;
    canUndoApply?: boolean;
  }) =>
    mocks.llm.draft ? (
      <>
        <button onClick={() => { mocks.llm.notes = onApplyDraft(mocks.llm.draft as never, 'overwrite'); }}>
          fixture AI 결과 적용
        </button>
        {canUndoApply && <button onClick={() => onUndoApply?.()}>fixture 적용 취소</button>}
      </>
    ) : null,
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
  fireEvent.change(screen.getByLabelText(/^상품명/), {
    target: { value: '검증 상품' },
  });
  fireEvent.change(screen.getByLabelText(/^카테고리/), {
    target: { value: 'cat-a' },
  });
  fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
  return view;
}
function parseImport() {
  const view = mount('import', '?productType=quasi_drug');
  fireEvent.change(screen.getByLabelText('관리자 HTML *'), {
    target: { value: firstmallHtml },
  });
  fireEvent.click(screen.getByRole('button', { name: '관리자 상품 데이터 분석' }));
  return view;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.llm.draft = null;
  mocks.llm.notes = [];
  sessionStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:fixture'),
      revokeObjectURL: vi.fn(),
    }),
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
  mocks.media.upload.mockResolvedValue({
    success: true,
    data: { url: '/fixture-upload.png' },
  });
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
        '바코드 조회에 실패했습니다. 잠시 후 다시 시도해 주시기 바랍니다.',
      ),
    );
    expect(screen.queryByRole('button', { name: /기존 제품에 공급 연결/ })).toBeNull();
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();
  });
  it('validates the name/category and retries a failed category load', async () => {
    mocks.product.getCategories.mockRejectedValueOnce(new Error('unavailable'));
    mount('create');
    fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
    expect(screen.getByText('상품명을 입력해 주시기 바랍니다.')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await screen.findByRole('option', { name: '일반 카테고리' });
    expect(mocks.product.getCategories).toHaveBeenCalledTimes(2);
  });
  it('sends a Candidate-only payload without price or publication fields', async () => {
    await createStep3();
    fireEvent.change(screen.getByLabelText('소비자에게 보이는 간이 설명을 입력하시기 바랍니다...'), {
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
    mocks.media.upload.mockResolvedValue({
      success: false,
      error: 'UPLOAD_FAILED',
    });
    const view = await createStep3();
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: {
        files: [new File(['fixture'], 'fixture.png', { type: 'image/png' })],
      },
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
    expect(screen.queryByLabelText('검증 공급가')).toBeNull();
    expect(screen.getByLabelText('소비자에게 보이는 간이 설명을 입력하시기 바랍니다...')).toBeTruthy();
  });
});

describe('Import existing workflow', () => {
  it.each(['top', 'bottom'])('returns from the %s import cancel without losing fields or selected files', async (exit) => {
    const view = await createStep3('?productType=non_drug');
    const file = new File(['fixture'], 'retained.png', { type: 'image/png' });
    const fileInput = view.container.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /상세페이지 소스로 자동 입력/ }));
    fireEvent.change(screen.getByLabelText('관리자 HTML *'), { target: { value: firstmallHtml } });
    fireEvent.click(screen.getByRole('button', { name: '관리자 상품 데이터 분석' }));
    fireEvent.click(screen.getByRole('button', { name: exit === 'top' ? '입력 내용 유지하고 돌아가기' : '취소', exact: true }));
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    expect(mocks.media.upload.mock.calls.some(([selected]) => selected === file)).toBe(true);
    expect(mocks.supplier.submitProductCandidate.mock.lastCall?.[0]).toMatchObject({ name: '검증 상품', offerDraft: { consumerShortDescription: null } });
  });

  it('applies imported data into the same draft without replacing prior input or submitting', async () => {
    mount('create');
    await screen.findByRole('option', { name: '일반 카테고리' });
    fireEvent.change(screen.getByLabelText(/^상품명/), { target: { value: '유지할 이름' } });
    fireEvent.change(screen.getByLabelText('규제 구분'), { target: { value: 'COSMETIC' } });
    fireEvent.click(screen.getByRole('button', { name: /상세페이지 소스로 자동 입력/ }));
    fireEvent.change(screen.getByLabelText('관리자 HTML *'), { target: { value: firstmallHtml } });
    fireEvent.click(screen.getByRole('button', { name: '관리자 상품 데이터 분석' }));
    fireEvent.click(screen.getByRole('button', { name: '상품 등록 페이지로 이동 →' }));
    await waitFor(() => expect((screen.getByLabelText(/^상품명/) as HTMLInputElement).value).toBe('유지할 이름'));
    expect((screen.getByLabelText('규제 구분') as HTMLSelectElement).value).toBe('COSMETIC');
    expect(sessionStorage.getItem('neture-import-draft')).toBeNull();
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();
    expect(mocks.toast.success).toHaveBeenCalled();
  });

  it('requires a product type and rejects unrelated HTML', async () => {
    mount('import');
    fireEvent.change(screen.getByPlaceholderText('관리자 상품 수정 페이지의 HTML을 붙여넣으시기 바랍니다'), {
      target: { value: '<p>기타 HTML</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '관리자 상품 데이터 분석' }));
    expect(screen.getByText('먼저 제품 유형(의약품/비의약품)을 선택해 주시기 바랍니다.')).toBeTruthy();
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
          '관리자 상품 수정 페이지의 HTML을 붙여넣으시기 바랍니다',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('');
  });
});


describe('Supplier authoring accessible controls', () => {
  it('associates registration labels without forcing initial focus, including both brand inputs', async () => {
    mocks.product.getBrands.mockResolvedValue([{ id: 'brand-fixture', name: 'Fixture brand' }]);
    mount('create');
    await screen.findByRole('option', { name: '일반 카테고리' });
    for (const label of [/포장 상품명/, /^상품명/, /카테고리/, /규제 구분/, /^브랜드$/, /브랜드명 직접 입력/, /제조사/, /바코드/]) expect(screen.getByLabelText(label)).toBeTruthy();
    expect(document.activeElement).not.toBe(screen.getByLabelText(/포장 상품명/));
  });
  it('keeps source import focused on accessible product information', async () => {
    parseImport();
    await screen.findByText('3. O4O 등록 설정');
    expect(screen.getByLabelText('카테고리')).toBeTruthy();
    expect(screen.queryByLabelText(/공급가 \(원\)/)).toBeNull();
    expect(screen.queryByLabelText(/공개\(PUBLIC\)/)).toBeNull();
    expect(screen.queryByText('유통 설정')).toBeNull();
  });
});

// WO-O4O-SUPPLIER-AI-ASSISTANCE-ROLLOUT-V1 P1 — 외부 AI 결과 적용 → 화면 → 제출 경계
describe('external AI draft apply on the Candidate form', () => {
  const aiDraft = (offer: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
    name: 'AI 상품명', barcode: '8801234567890', categoryId: null, brandId: null, brandName: null,
    manufacturerName: null, specification: null, originCountry: null, regulatoryType: null, drugCategory: null,
    regulatoryName: null, mfdsPermitNumber: null, imageUrl: null, contentImageUrls: [],
    offerDraft: {
      priceGeneral: null, consumerReferencePrice: null, consumerShortDescription: null,
      consumerDetailDescription: null, isFeatured: false, ...offer,
    },
    ...extra,
  });

  it('does not put an over-limit description or AI prices into the submitted Candidate', async () => {
    mocks.llm.draft = aiDraft({ priceGeneral: 45000, isFeatured: true, consumerDetailDescription: '가'.repeat(800) });
    mount('create');
    await screen.findByRole('option', { name: '일반 카테고리' });
    fireEvent.click(screen.getByRole('button', { name: 'fixture AI 결과 적용' }));
    expect(mocks.llm.notes.some((n) => n.includes('500자'))).toBe(true);
    expect(mocks.llm.notes.some((n) => n.includes('가격·추천 표시'))).toBe(true);
    expect(mocks.llm.notes.some((n) => n.startsWith('확인 필요') && n.includes('바코드'))).toBe(true);
    expect((screen.getByLabelText(/^상품명/) as HTMLInputElement).value).toBe('AI 상품명');
    fireEvent.change(screen.getByLabelText(/^카테고리/), { target: { value: 'cat-a' } });
    fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
    expect(
      (screen.getByLabelText('소비자에게 보이는 간이 설명을 입력하시기 바랍니다...') as HTMLTextAreaElement).value,
    ).toBe('');
    // 적용만으로는 제출되지 않는다
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    const payload = mocks.supplier.submitProductCandidate.mock.lastCall?.[0];
    expect(payload.offerDraft).toEqual({ consumerShortDescription: null });
    expect(payload.barcode).toBe('8801234567890');
  });

  it('undoes the last apply and ignores the barcode lookup it started', async () => {
    let resolveLookup: (v: unknown) => void = () => {};
    mocks.product.getMasterByBarcode.mockImplementation(
      () => new Promise((resolve) => { resolveLookup = resolve; }),
    );
    mocks.llm.draft = aiDraft({ consumerShortDescription: 'AI 설명' });
    mount('create');
    await screen.findByRole('option', { name: '일반 카테고리' });
    fireEvent.change(screen.getByLabelText(/^상품명/), { target: { value: '사용자 상품명' } });
    fireEvent.click(screen.getByRole('button', { name: 'fixture AI 결과 적용' }));
    expect((screen.getByLabelText(/^상품명/) as HTMLInputElement).value).toBe('AI 상품명');
    expect(mocks.product.getMasterByBarcode).toHaveBeenCalledWith('8801234567890');

    fireEvent.click(screen.getByRole('button', { name: 'fixture 적용 취소' }));
    expect((screen.getByLabelText(/^상품명/) as HTMLInputElement).value).toBe('사용자 상품명');
    expect(screen.queryByRole('button', { name: 'fixture 적용 취소' })).toBeNull();

    // 취소 뒤 늦게 도착한 AI 바코드 조회 결과는 기존 제품 안내를 만들지 않는다
    resolveLookup({ id: 'master-late', barcode: '8801234567890', marketingName: '늦은 결과' });
    await waitFor(() => expect(mocks.product.getMasterByBarcode).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('button', { name: /기존 제품에 공급 연결/ })).toBeNull();
    expect((screen.getByLabelText(/^상품명/) as HTMLInputElement).value).toBe('사용자 상품명');

    fireEvent.change(screen.getByLabelText(/^카테고리/), { target: { value: 'cat-a' } });
    fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
    expect(
      (screen.getByLabelText('소비자에게 보이는 간이 설명을 입력하시기 바랍니다...') as HTMLTextAreaElement).value,
    ).toBe('');
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    const payload = mocks.supplier.submitProductCandidate.mock.lastCall?.[0];
    expect(payload).toMatchObject({ name: '사용자 상품명', barcode: null });
  });
});

// 간이 설명 칸(서버 500자) — Import 초안 · 직접 입력 모두 제출 전에 막는다
describe('consumer short description limit', () => {
  const editorLabel = '소비자에게 보이는 간이 설명을 입력하시기 바랍니다...';

  it('does not prefill an over-limit imported detail description and explains why', async () => {
    sessionStorage.setItem(
      'neture-import-draft',
      JSON.stringify({ marketingName: '초안 상품', categoryId: 'cat-a', consumerShortDesc: '', consumerDetailDesc: `<p>${'가'.repeat(600)}</p>` }),
    );
    mount('create');
    await screen.findByRole('option', { name: '일반 카테고리' });
    fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
    expect((screen.getByLabelText(editorLabel) as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByText(/가져온 상세 설명이 간이 설명 한도\(500자\)를 넘어 넣지 않았습니다/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    expect(mocks.supplier.submitProductCandidate.mock.lastCall?.[0]).toMatchObject({ offerDraft: { consumerShortDescription: null } });
  });

  it('prefers the imported short description when present', async () => {
    sessionStorage.setItem(
      'neture-import-draft',
      JSON.stringify({ marketingName: '초안 상품', categoryId: 'cat-a', consumerShortDesc: '<p>간이</p>', consumerDetailDesc: `<p>${'가'.repeat(600)}</p>` }),
    );
    mount('create');
    await screen.findByRole('option', { name: '일반 카테고리' });
    fireEvent.click(screen.getByRole('button', { name: '다음', exact: true }));
    expect((screen.getByLabelText(editorLabel) as HTMLTextAreaElement).value).toBe('<p>간이</p>');
    expect(screen.queryByText(/가져온 상세 설명이 간이 설명 한도/)).toBeNull();
  });

  it('warns when an in-page source import skips an over-limit description', async () => {
    mount('create');
    await screen.findByRole('option', { name: '일반 카테고리' });
    fireEvent.click(screen.getByRole('button', { name: /상세페이지 소스로 자동 입력/ }));
    const longHtml = firstmallHtml.replace('&lt;p&gt;검증 본문&lt;/p&gt;', `&lt;p&gt;${'가'.repeat(600)}&lt;/p&gt;`);
    fireEvent.change(screen.getByLabelText('관리자 HTML *'), { target: { value: longHtml } });
    fireEvent.click(screen.getByRole('button', { name: '관리자 상품 데이터 분석' }));
    fireEvent.click(screen.getByRole('button', { name: '상품 등록 페이지로 이동 →' }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('간이 설명 한도(500자)')));
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();
  });

  it('blocks an over-limit description before uploading images or submitting', async () => {
    const view = await createStep3();
    const file = new File(['fixture'], 'kept.png', { type: 'image/png' });
    fireEvent.change(view.container.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(editorLabel), { target: { value: '다'.repeat(501) } });
    expect(screen.getByText(/501 \/ 500자 \(서식 포함\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    expect(await screen.findByText(/500자\(서식 포함\)를 넘습니다\(현재 501자\)/)).toBeTruthy();
    expect(mocks.media.upload).not.toHaveBeenCalled();
    expect(mocks.supplier.submitProductCandidate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(editorLabel), { target: { value: '다'.repeat(500) } });
    fireEvent.click(screen.getByRole('button', { name: '제품 정보 검토 요청', exact: true }));
    await screen.findByText('제품 정보 검토 요청 완료');
    expect(mocks.supplier.submitProductCandidate.mock.lastCall?.[0]).toMatchObject({
      offerDraft: { consumerShortDescription: '다'.repeat(500) },
    });
  });
});

import { useSupplierBusinessProfile } from '../profile/useSupplierBusinessProfile';
import { supplierReviewApi } from '../../../lib/api/supplierReview';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import SupplierProfilePage from '../SupplierProfilePage';

const api = vi.hoisted(() => ({
  profile: { getProfile: vi.fn(), updateProfile: vi.fn() },
  onboarding: {
    getOnboarding: vi.fn(),
    updateOnboarding: vi.fn(),
    uploadDocument: vi.fn(),
    downloadDocument: vi.fn(),
  },
  categories: {
    list: vi.fn(),
    select: vi.fn(),
    remove: vi.fn(),
    downloadEvidence: vi.fn(),
  },
}));
vi.mock('../../../lib/api', () => ({
  supplierProfileApi: api.profile,
  supplierOnboardingApi: api.onboarding,
  supplierRegulatedCategoryApi: api.categories,
  REGULATED_CATEGORY_ORDER: ['general', 'drug'],
  REGULATED_CATEGORY_LABELS: { general: '일반 상품', drug: '의약품' },
}));
vi.mock('@o4o/account-ui', async () => ({
  BusinessRegistrationFields: (await import('../../../../../../packages/account-ui/src/components/BusinessRegistrationFields')).BusinessRegistrationFields,
}));
vi.mock('@o4o/ui', () => ({
  AddressSearch: ({
    onChange,
  }: {
    onChange: (v: { zipCode: string; address: string; addressDetail: string }) => void;
  }) => (
    <button
      onClick={() =>
        onChange({
          zipCode: 'FIXTURE',
          address: '검증 주소',
          addressDetail: '검증 상세',
        })
      }
    >
      검증 주소 적용
    </button>
  ),
}));

const profile = {
  id: 'supplier-fixture',
  name: '검증 공급자',
  slug: 'fixture',
  status: 'active',
  representativeName: '검증 대표',
  businessNumber: 'FIXTURE-BUSINESS',
  businessEntityType: 'individual',
  managerName: '검증 담당자',
  contactEmailVisibility: 'public',
  _prefilled: true,
  minOrderAmount: 10000,
  baseShippingFee: 3000,
};
const onboarding = {
  supplierId: 'supplier-fixture',
  taxInvoiceEmail: '',
  settlementBankName: '검증 은행',
  settlementAccountNumber: '',
  settlementAccountNumberMasked: '****',
  settlementAccountHolder: '검증 예금주',
  mailOrderSalesStatus: 'not_applicable',
};
const card = (heading: string) =>
  within(screen.getByRole('heading', { name: heading, exact: true }).closest('div')!);
const loaded = () => screen.findByRole('heading', { name: '사업자 기본정보', exact: true });
beforeEach(() => {
  vi.resetAllMocks();
  api.profile.getProfile.mockResolvedValue(profile);
  api.profile.updateProfile.mockResolvedValue({ success: true });
  api.onboarding.getOnboarding.mockResolvedValue(onboarding);
  api.onboarding.updateOnboarding.mockResolvedValue({
    success: true,
    data: onboarding,
  });
  api.onboarding.uploadDocument.mockResolvedValue({ success: true });
  api.onboarding.downloadDocument.mockResolvedValue(null);
  api.categories.list.mockResolvedValue([]);
  api.categories.select.mockResolvedValue({ success: true });
  api.categories.remove.mockResolvedValue({ success: true });
  api.categories.downloadEvidence.mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SupplierProfilePage existing section ownership', () => {
  it.each(['failed', 'empty', 'present'])(
    'preserves the initial tax email fallback when onboarding is %s',
    async (state) => {
      api.profile.getProfile.mockResolvedValue({
        ...profile,
        taxInvoiceEmail: 'profile-tax@example.invalid',
      });
      if (state === 'failed')
        api.onboarding.getOnboarding.mockRejectedValueOnce(new Error('unavailable'));
      else
        api.onboarding.getOnboarding.mockResolvedValue({
          ...onboarding,
          taxInvoiceEmail: state === 'present' ? 'onboarding-tax@example.invalid' : '',
        });
      render(<SupplierProfilePage />);
      await loaded();
      expect((screen.getByPlaceholderText('tax@company.com') as HTMLInputElement).value).toBe(
        state === 'present' ? 'onboarding-tax@example.invalid' : 'profile-tax@example.invalid',
      );
    },
  );
  it('retries a primary profile failure instead of showing no profile', async () => {
    api.profile.getProfile.mockRejectedValueOnce(new Error('unavailable'));
    render(<SupplierProfilePage />);
    await screen.findByText('공급자 프로필을 불러오지 못했습니다.');
    expect(screen.queryByText('공급자 프로필을 찾을 수 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await loaded();
    expect(api.profile.getProfile).toHaveBeenCalledTimes(2);
  });
  it('waits for all initial sources before exposing initialized inputs', async () => {
    let complete!: (data: typeof onboarding) => void;
    api.onboarding.getOnboarding.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    render(<SupplierProfilePage />);
    expect(screen.getByText('프로필 정보를 불러오는 중...')).toBeTruthy();
    complete(onboarding);
    await loaded();
    expect((screen.getByPlaceholderText('예: 국민은행') as HTMLInputElement).value).toBe(
      '검증 은행',
    );
  });
  it('retries onboarding independently while keeping business edits', async () => {
    api.onboarding.getOnboarding.mockRejectedValueOnce(new Error('unavailable'));
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText('홍길동'), {
      target: { value: '수정 대표' },
    });
    fireEvent.click(
      card('공급자 서류 및 정산 정보').getByRole('button', {
        name: '다시 시도',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText('온보딩 정보를 불러오지 못했습니다.')).toBeNull(),
    );
    expect(api.profile.getProfile).toHaveBeenCalledTimes(1);
    expect(api.categories.list).toHaveBeenCalledTimes(1);
    expect((screen.getByPlaceholderText('홍길동') as HTMLInputElement).value).toBe('수정 대표');
  });
  it('keeps category errors separate and retries only the category list', async () => {
    api.categories.list.mockRejectedValueOnce(new Error('unavailable'));
    render(<SupplierProfilePage />);
    await loaded();
    expect(screen.queryByLabelText('일반 상품')).toBeNull();
    fireEvent.click(card('공급 예정 품목군').getByRole('button', { name: '다시 시도' }));
    await screen.findByLabelText('일반 상품');
    expect(api.profile.getProfile).toHaveBeenCalledTimes(1);
    expect(api.onboarding.getOnboarding).toHaveBeenCalledTimes(1);
  });
  it('saves only the business group fields from the business save button', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText('홍길동'), {
      target: { value: '수정 대표' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검증 주소 적용' }));
    fireEvent.change(screen.getByLabelText(/^세금계산서 이메일/), {
      target: { value: 'fixture-tax@example.invalid' },
    });
    fireEvent.change(screen.getByLabelText('기본 배송비 (원)'), { target: { value: '4500' } });
    fireEvent.click(screen.getByRole('button', { name: '사업자 정보 저장' }));
    await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledTimes(1));
    const payload = api.profile.updateProfile.mock.lastCall?.[0];
    expect(payload).toEqual(
      expect.objectContaining({
        representativeName: '수정 대표',
        businessAddress: '검증 주소',
      }),
    );
    for (const key of [
      'taxInvoiceEmail',
      'settlementBankName',
      'settlementAccountNumber',
      'mailOrderSalesStatus',
      // 다른 묶음의 저장하지 않은 편집은 보내지 않는다
      'baseShippingFee',
      'contactEmailVisibility',
      'managerName',
    ])
      expect(payload).not.toHaveProperty(key);
    expect(api.onboarding.updateOnboarding).not.toHaveBeenCalled();
  });
  it('allows saving contact information before selecting an invoice business classification', async () => {
    api.profile.getProfile.mockResolvedValue({ ...profile, businessEntityType: '' });
    render(<SupplierProfilePage />); await loaded();
    fireEvent.change(screen.getByLabelText('담당자 이메일'), { target: { value: 'person@example.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: '연락처 저장' }));
    await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ managerEmail: 'person@example.invalid' })));
    expect(api.profile.updateProfile.mock.lastCall?.[0]).not.toHaveProperty('businessEntityType');
  });
  it.each(['simple_taxpayer', 'general_taxpayer', 'tax_exempt', 'non_profit', 'other'])(
    'requires an explicit individual/corporation choice for %s without guessing', async (legacy) => {
      api.profile.getProfile.mockResolvedValue({ ...profile, businessEntityType: legacy });
      render(<SupplierProfilePage />);
      await loaded();
      const select = screen.getByRole('combobox', { name: /사업자 구분/ }) as HTMLSelectElement;
      expect(select.required).toBe(false);
      expect(select.value).toBe('');
      expect(Array.from(select.options, (option) => option.value)).toEqual(['', 'individual', 'corporation']);
      fireEvent.click(screen.getByRole('button', { name: '사업자 정보 저장' }));
      await screen.findByText('세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주시기 바랍니다.');
      expect(api.profile.updateProfile).not.toHaveBeenCalled();
      fireEvent.change(select, { target: { value: 'corporation' } });
      fireEvent.click(screen.getByRole('button', { name: '사업자 정보 저장' }));
      await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ businessEntityType: 'corporation' }),
      ));
    },
  );
  it('edits the registered business name and restores the saved name after reopening', async () => {
    const page = render(<SupplierProfilePage />);
    await loaded();
    const input = screen.getByLabelText('상호명') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.value).toBe(profile.name);
    fireEvent.change(input, { target: { value: '  변경 공급자  ' } });
    fireEvent.click(screen.getByRole('button', { name: '사업자 정보 저장' }));
    await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: '변경 공급자' }),
    ));
    await screen.findByRole('button', { name: '저장됨' });
    page.unmount();
    api.profile.getProfile.mockResolvedValue({ ...profile, name: '변경 공급자' });
    render(<SupplierProfilePage />);
    await loaded();
    expect((screen.getByLabelText('상호명') as HTMLInputElement).value).toBe('변경 공급자');
  });
  it('does not submit a blank business name', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(screen.getByLabelText('상호명'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '사업자 정보 저장' }));
    await screen.findByText('상호명을 1~255자로 입력해 주시기 바랍니다.');
    expect(api.profile.updateProfile).not.toHaveBeenCalled();
  });
  it('edits contact and shipping values through their visible field labels', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(screen.getByLabelText('담당자명'), {
      target: { value: '검증 담당자 변경' },
    });
    fireEvent.change(screen.getByLabelText('이메일', { exact: true }), {
      target: { value: 'updated@example.invalid' },
    });
    fireEvent.change(screen.getByLabelText('기본 배송비 (원)'), {
      target: { value: '4500' },
    });
    fireEvent.click(screen.getByRole('button', { name: '연락처 저장' }));
    await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledTimes(1));
    expect(api.profile.updateProfile.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        managerName: '검증 담당자 변경',
        contactEmail: 'updated@example.invalid',
        contactEmailVisibility: 'public',
      }),
    );
    expect(api.profile.updateProfile.mock.lastCall?.[0]).not.toHaveProperty('baseShippingFee');
    await screen.findByText('담당자 · 공개 연락처가 저장되었습니다.');
    fireEvent.click(screen.getByRole('button', { name: '주문 · 배송 조건 저장' }));
    await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledTimes(2));
    expect(api.profile.updateProfile.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ baseShippingFee: 4500, freeShippingThreshold: null, minOrderAmount: 10000 }),
    );
    expect(api.profile.updateProfile.mock.lastCall?.[0]).not.toHaveProperty('managerName');
  });
  it('keeps onboarding tax/account fields under the settlement save without mail-order fields', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText('tax@company.com'), {
      target: { value: 'fixture-tax@example.invalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: '정산 정보 저장' }));
    await waitFor(() => expect(api.onboarding.updateOnboarding).toHaveBeenCalledTimes(1));
    expect(api.onboarding.updateOnboarding.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        taxInvoiceEmail: 'fixture-tax@example.invalid',
        settlementBankName: '검증 은행',
      }),
    );
    expect(api.onboarding.updateOnboarding.mock.lastCall?.[0]).not.toHaveProperty('mailOrderSalesStatus');
    expect(api.onboarding.updateOnboarding.mock.lastCall?.[0]).not.toHaveProperty('mailOrderSalesRegistrationNumber');
    expect(api.profile.updateProfile).not.toHaveBeenCalled();
  });
  it('shows profile save failures without claiming a saved state', async () => {
    api.profile.updateProfile.mockResolvedValue({
      success: false,
      error: 'FIXTURE_PROFILE_FAILED',
    });
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '사업자 정보 저장' }));
    await screen.findByText('FIXTURE_PROFILE_FAILED');
    expect(screen.queryByRole('button', { name: '저장됨' })).toBeNull();
  });
  it('shows onboarding save failures in the relevant section', async () => {
    api.onboarding.updateOnboarding.mockResolvedValue({
      success: false,
      error: 'FIXTURE_ONBOARDING_FAILED',
    });
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '정산 정보 저장' }));
    await card('공급자 서류 및 정산 정보').findByText('FIXTURE_ONBOARDING_FAILED');
    expect(api.profile.updateProfile).not.toHaveBeenCalled();
  });
  it('accepts PDF uploads, refreshes documents and clears the selected file state', async () => {
    const view = render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(view.container.querySelector('input[type=file]')!, {
      target: {
        files: [new File(['fixture'], 'fixture.pdf', { type: 'application/pdf' })],
      },
    });
    fireEvent.click(
      card('공급자 서류 및 정산 정보').getAllByRole('button', {
        name: '업로드',
      })[0],
    );
    await waitFor(() => expect(api.onboarding.getOnboarding).toHaveBeenCalledTimes(2));
    expect(api.onboarding.uploadDocument).toHaveBeenCalledWith(
      'business_registration',
      expect.any(File),
    );
    expect(
      (
        card('공급자 서류 및 정산 정보').getAllByRole('button', {
          name: '업로드',
        })[0] as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it('rejects non-PDF documents without uploading', async () => {
    const view = render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(view.container.querySelector('input[type=file]')!, {
      target: {
        files: [new File(['fixture'], 'fixture.txt', { type: 'text/plain' })],
      },
    });
    fireEvent.click(
      card('공급자 서류 및 정산 정보').getAllByRole('button', {
        name: '업로드',
      })[0],
    );
    expect(
      card('공급자 서류 및 정산 정보').getByText('PDF 파일만 업로드할 수 있습니다.'),
    ).toBeTruthy();
    expect(api.onboarding.uploadDocument).not.toHaveBeenCalled();
  });
  it('selects a category and refreshes categories without saving the business profile', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.click(screen.getByLabelText('일반 상품'));
    await waitFor(() => expect(api.categories.list).toHaveBeenCalledTimes(2));
    expect(api.categories.select).toHaveBeenCalledWith('general');
    expect(api.profile.updateProfile).not.toHaveBeenCalled();
  });
  it('prevents deselecting an approved category and retains prior evidence access', async () => {
    api.categories.list.mockResolvedValue([
      {
        category: 'drug',
        status: 'approved',
        evidenceDocument: { fileName: 'fixture.pdf' },
      },
    ]);
    render(<SupplierProfilePage />);
    await loaded();
    expect((screen.getByLabelText('의약품') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '증빙 열람' }));
    await screen.findByText('증빙 문서를 열 수 없습니다.');
    expect(api.categories.remove).not.toHaveBeenCalled();
  });
});

vi.mock('../../../lib/api/supplierReview', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/api/supplierReview')>();
  return { ...original, supplierReviewApi: { ...original.supplierReviewApi,
    queue: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    list: vi.fn(async (supplierId: string) => ({ supplierId, current: null, requests: [], actions: [], hasMore: false, page: 1 })),
  } };
});

beforeEach(() => {
  vi.mocked(supplierReviewApi.queue).mockResolvedValue({ items: [], hasMore: false });
  vi.mocked(supplierReviewApi.list).mockImplementation(async (supplierId: string) => ({ supplierId, current: null, requests: [], actions: [], hasMore: false, page: 1 }));
});

describe('supplier profile save notice lifetime', () => {
  it('replaces the saved timer on repeated saves and releases it on unmount', async () => {
    vi.useFakeTimers();
    try {
      const hook = renderHook(() => useSupplierBusinessProfile());
      act(() => hook.result.current.initializeProfile(profile));
      await act(async () => { await hook.result.current.handleSave(); });
      expect(vi.getTimerCount()).toBe(1);
      await act(async () => { await hook.result.current.handleSave(); });
      expect(vi.getTimerCount()).toBe(1);
      hook.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
});

// WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4: 묶음 · 체크리스트 · 정산 보조 입력
describe('supplier profile grouped layout', () => {
  it('shows the four groups in order', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    const groups = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(groups).toEqual(
      expect.arrayContaining(['1사업자 정보', '2담당자 · 공개 연락처', '3정산', '4판매 조건']),
    );
  });
  it('lists missing required items from the server responses with links to their groups', async () => {
    api.profile.getProfile.mockResolvedValue({ ...profile, missingProfileFields: ['managerPhone'] });
    api.onboarding.getOnboarding.mockResolvedValue({ ...onboarding, missingSettlementFields: ['taxInvoiceEmail'] });
    render(<SupplierProfilePage />);
    await loaded();
    const list = within(screen.getByRole('region', { name: /아직 입력하지 않은 필수 항목 2개/ }));
    expect(list.getByRole('link', { name: /담당자 전화번호/ }).getAttribute('href')).toBe('#supplier-group-contact');
    expect(list.getByRole('link', { name: /세금계산서 이메일/ }).getAttribute('href')).toBe('#supplier-group-settlement');
  });
  it('updates the checklist from the profile save response', async () => {
    api.profile.getProfile.mockResolvedValue({ ...profile, missingProfileFields: ['managerPhone'] });
    api.onboarding.getOnboarding.mockResolvedValue({ ...onboarding, missingSettlementFields: [] });
    api.profile.updateProfile.mockResolvedValue({ success: true, data: { missingProfileFields: [] } });
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '연락처 저장' }));
    await screen.findByText('필수 항목을 모두 입력했습니다.');
  });
  it('saves mail-order fields separately and keeps its error out of the settlement section', async () => {
    api.onboarding.updateOnboarding.mockResolvedValue({ success: false, error: 'MAIL_ORDER_REGISTRATION_NUMBER_REQUIRED' });
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '통신판매업 정보 저장' }));
    await waitFor(() => expect(api.onboarding.updateOnboarding).toHaveBeenCalledTimes(1));
    expect(Object.keys(api.onboarding.updateOnboarding.mock.lastCall?.[0]).sort()).toEqual([
      'mailOrderSalesRegistrationNumber',
      'mailOrderSalesStatus',
    ]);
    await card('통신판매업 신고 정보').findByText('MAIL_ORDER_REGISTRATION_NUMBER_REQUIRED');
    expect(card('공급자 서류 및 정산 정보').queryByText('MAIL_ORDER_REGISTRATION_NUMBER_REQUIRED')).toBeNull();
  });
  it('copies the manager into the settlement contact while "same as manager" is checked', async () => {
    api.profile.getProfile.mockResolvedValue({ ...profile, managerEmail: 'manager@example.invalid' });
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.click(screen.getByLabelText('정산 담당자가 담당자와 같음'));
    expect((screen.getByLabelText('정산 담당자명') as HTMLInputElement).value).toBe('검증 담당자');
    expect((screen.getByLabelText('정산 담당자 이메일') as HTMLInputElement).value).toBe('manager@example.invalid');
    fireEvent.click(screen.getByRole('button', { name: '정산 정보 저장' }));
    await waitFor(() => expect(api.onboarding.updateOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ settlementContactName: '검증 담당자', settlementContactEmail: 'manager@example.invalid' }),
    ));
  });
  it('fills the account holder from the business name only when asked', async () => {
    api.onboarding.getOnboarding.mockResolvedValue({ ...onboarding, settlementAccountHolder: '' });
    render(<SupplierProfilePage />);
    await loaded();
    const holder = screen.getByLabelText(/^예금주/) as HTMLInputElement;
    expect(holder.value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: '상호명으로 채우기' }));
    expect(holder.value).toBe('검증 공급자');
  });
  it('marks the invoice email as required for settlement', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    expect(screen.getByLabelText(/^세금계산서 이메일/).closest('div')?.textContent).toContain('*');
    expect(screen.queryByText('세금계산서 이메일 (선택)')).toBeNull();
  });
});

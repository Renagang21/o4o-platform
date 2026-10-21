import { supplierReviewApi } from '../../../lib/api/supplierReview';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  it('saves business/contact/shipping through profile while excluding tax and account fields', async () => {
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText('홍길동'), {
      target: { value: '수정 대표' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검증 주소 적용' }));
    fireEvent.change(screen.getByLabelText(/^세금계산서 이메일/), {
      target: { value: 'fixture-tax@example.invalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledTimes(1));
    const payload = api.profile.updateProfile.mock.lastCall?.[0];
    expect(payload).toEqual(
      expect.objectContaining({
        representativeName: '수정 대표',
        businessAddress: '검증 주소',
        baseShippingFee: 3000,
        freeShippingThreshold: null,
        contactEmailVisibility: 'public',
      }),
    );
    for (const key of [
      'taxInvoiceEmail',
      'settlementBankName',
      'settlementAccountNumber',
      'mailOrderSalesStatus',
    ])
      expect(payload).not.toHaveProperty(key);
    expect(api.onboarding.updateOnboarding).not.toHaveBeenCalled();
  });
  it.each(['', 'simple_taxpayer', 'general_taxpayer', 'tax_exempt', 'non_profit', 'other'])(
    'requires an explicit individual/corporation choice for %s without guessing', async (legacy) => {
      api.profile.getProfile.mockResolvedValue({ ...profile, businessEntityType: legacy });
      render(<SupplierProfilePage />);
      await loaded();
      const select = screen.getByRole('combobox', { name: /사업자 구분/ }) as HTMLSelectElement;
      expect(select.required).toBe(true);
      expect(select.value).toBe('');
      expect(Array.from(select.options, (option) => option.value)).toEqual(['', 'individual', 'corporation']);
      fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
      await screen.findByText('세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주세요.');
      expect(api.profile.updateProfile).not.toHaveBeenCalled();
      fireEvent.change(select, { target: { value: 'corporation' } });
      fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
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
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
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
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await screen.findByText('상호명을 1~255자로 입력해 주세요.');
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
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await waitFor(() => expect(api.profile.updateProfile).toHaveBeenCalledTimes(1));
    expect(api.profile.updateProfile.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        managerName: '검증 담당자 변경',
        contactEmail: 'updated@example.invalid',
        baseShippingFee: 4500,
      }),
    );
  });
  it('keeps onboarding tax/account/mail-order fields under its own save button', async () => {
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
        mailOrderSalesStatus: 'not_applicable',
      }),
    );
    expect(api.profile.updateProfile).not.toHaveBeenCalled();
  });
  it('shows profile save failures without claiming a saved state', async () => {
    api.profile.updateProfile.mockResolvedValue({
      success: false,
      error: 'FIXTURE_PROFILE_FAILED',
    });
    render(<SupplierProfilePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
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

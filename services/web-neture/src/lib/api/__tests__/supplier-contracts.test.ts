import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  supplierApi,
  supplierProfileApi,
  supplierOnboardingApi,
  supplierRegulatedCategoryApi,
  supplierRecruitmentApi,
  supplierKpaEventOfferApi,
  submitBulkCandidates,
} from '../supplier';
const transport = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../apiClient', () => ({ api: transport }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});
const httpError = (status: number, error = 'FIXTURE_ERROR') => ({
  response: { status, data: { error } },
});

describe('Supplier facade transport contracts', () => {
  it('keeps profile fields nullable while rejecting a missing/array profile', async () => {
    transport.get
      .mockResolvedValueOnce({ data: { data: { id: 'fixture', representativeName: null } } })
      .mockResolvedValueOnce({ data: { data: null } })
      .mockResolvedValueOnce({ data: { data: [] } });
    expect(await supplierProfileApi.getProfile()).toEqual({
      id: 'fixture',
      representativeName: null,
    });
    await expect(supplierProfileApi.getProfile()).rejects.toThrow('SUPPLIER_PROFILE_LOAD_FAILED');
    await expect(supplierProfileApi.getProfile()).rejects.toThrow('SUPPLIER_PROFILE_LOAD_FAILED');
  });
  it('does not convert failed onboarding/category reads into empty successful data', async () => {
    transport.get.mockRejectedValue(httpError(500));
    await expect(supplierOnboardingApi.getOnboarding()).rejects.toThrow(
      'SUPPLIER_ONBOARDING_LOAD_FAILED',
    );
    await expect(supplierRegulatedCategoryApi.list()).rejects.toThrow(
      'SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED',
    );
  });
  it('keeps successful empty categories distinct from malformed categories', async () => {
    transport.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: {} } });
    expect(await supplierRegulatedCategoryApi.list()).toEqual([]);
    await expect(supplierRegulatedCategoryApi.list()).rejects.toThrow(
      'SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED',
    );
  });
  it('retains profile/onboarding endpoints and structured write failures', async () => {
    const data = { representativeName: '검증 대표', minOrderAmount: null };
    transport.patch.mockRejectedValue(httpError(409, 'FIXTURE_CONFLICT'));
    expect(await supplierProfileApi.updateProfile(data)).toEqual({
      success: false,
      error: 'FIXTURE_CONFLICT',
    });
    expect(transport.patch).toHaveBeenCalledWith('/neture/supplier/profile', data);
    await supplierOnboardingApi.updateOnboarding({ taxInvoiceEmail: 'fixture@example.invalid' });
    expect(transport.patch).toHaveBeenLastCalledWith('/neture/supplier/onboarding', {
      taxInvoiceEmail: 'fixture@example.invalid',
    });
  });
  it('uploads onboarding PDFs using multipart without changing the document discriminator', async () => {
    const file = new File(['fixture'], 'fixture.pdf', { type: 'application/pdf' });
    transport.post.mockResolvedValue({ data: { success: true } });
    await supplierOnboardingApi.uploadDocument('bank_statement', file);
    const [path, form, config] = transport.post.mock.lastCall!;
    expect(path).toBe('/neture/supplier/documents/bank_statement');
    expect(form.get('file')).toBe(file);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });
  it('returns the downloaded Blob and preserves a null failure result', async () => {
    const blob = new Blob(['fixture']);
    transport.get.mockResolvedValueOnce({ data: blob }).mockRejectedValueOnce(httpError(404));
    expect(await supplierOnboardingApi.downloadDocument('business_registration')).toBe(blob);
    expect(transport.get).toHaveBeenCalledWith(
      '/neture/supplier/documents/business_registration/download',
      { responseType: 'blob' },
    );
    expect(await supplierOnboardingApi.downloadDocument('business_registration')).toBeNull();
  });
  it('forwards product filters and preserves successful empty pagination', async () => {
    transport.get.mockResolvedValue({ data: { success: true, data: [] } });
    expect(
      await supplierApi.getProductsPaginated({
        page: 2,
        keyword: '검증 상품',
        hasImage: 'false',
        serviceApprovalStatus: 'pending',
      }),
    ).toEqual({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    const url = transport.get.mock.lastCall![0];
    expect(url).toContain('page=2');
    expect(url).toContain('hasImage=false');
    expect(url).toContain('serviceApprovalStatus=pending');
    expect(decodeURIComponent(url.replace(/\+/g, ' '))).toContain('keyword=검증 상품');
  });
  it('keeps zero approval counts valid and rejects missing count fields', async () => {
    const zero = { total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 };
    transport.get
      .mockResolvedValueOnce({ data: { success: true, data: zero } })
      .mockResolvedValueOnce({ data: { success: true, data: { total: 0 } } });
    expect(await supplierApi.getApprovalCounts()).toEqual(zero);
    await expect(supplierApi.getApprovalCounts()).rejects.toThrow(
      'SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED',
    );
  });
  it('keeps standard copy mode implicit and preserve mode explicit', async () => {
    transport.post.mockResolvedValue({ data: { data: { copied: 0, results: [] } } });
    await supplierApi.copyImages(['https://fixture.invalid/image.png'], undefined, {
      mode: 'standard',
    });
    expect(transport.post.mock.lastCall![1]).toEqual({
      urls: ['https://fixture.invalid/image.png'],
    });
    await supplierApi.copyImages(['https://fixture.invalid/image.png'], 'https://fixture.invalid', {
      mode: 'preserve',
    });
    expect(transport.post.mock.lastCall![1]).toEqual({
      urls: ['https://fixture.invalid/image.png'],
      shopOrigin: 'https://fixture.invalid',
      mode: 'preserve',
    });
  });
  it('distinguishes order-detail 404 from other read failures', async () => {
    transport.get.mockRejectedValueOnce(httpError(404)).mockRejectedValueOnce(httpError(403));
    expect(await supplierApi.getOrderById('fixture-order')).toBeNull();
    await expect(supplierApi.getOrderById('fixture-order')).rejects.toThrow(
      'SUPPLIER_ORDERS_LOAD_FAILED',
    );
  });
  it('keeps spot-policy forbidden distinct from server failure and normal empty policies', async () => {
    transport.get
      .mockRejectedValueOnce(httpError(403))
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValueOnce({ data: { success: true, data: [] } });
    await expect(supplierApi.listSpotPolicies('fixture-offer')).rejects.toThrow(
      'SUPPLIER_SPOT_POLICIES_FORBIDDEN',
    );
    await expect(supplierApi.listSpotPolicies('fixture-offer')).rejects.toThrow(
      'SUPPLIER_SPOT_POLICIES_LOAD_FAILED',
    );
    expect(await supplierApi.listSpotPolicies('fixture-offer')).toEqual([]);
  });
  it('does not turn a failed library list into a successful empty collection', async () => {
    transport.get.mockRejectedValue(httpError(500));
    await expect(supplierApi.getLibraryItems()).rejects.toThrow(
      'SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED',
    );
  });
  it('retains recruitment not-found and partial decision messages', async () => {
    transport.get.mockRejectedValue(httpError(404));
    await expect(supplierRecruitmentApi.getApplications('fixture')).rejects.toThrow(
      'SUPPLIER_RECRUITMENT_NOT_FOUND',
    );
    transport.post.mockRejectedValue({
      response: { data: { error: 'FIXTURE_APPROVE_FAILED', message: '검증 안내' } },
    });
    expect(await supplierRecruitmentApi.approveApplication('fixture')).toEqual({
      success: false,
      error: 'FIXTURE_APPROVE_FAILED',
      message: '검증 안내',
    });
  });
  it('preserves per-service event proposal results and nullable limits', async () => {
    const result = { results: [{ serviceKey: 'fixture-service', status: 'failed' }] };
    transport.post.mockResolvedValue({ data: { data: result } });
    expect(
      await supplierKpaEventOfferApi.proposeEventOfferToServices(
        'fixture-offer',
        ['fixture-service'],
        { eventPrice: 1000, startAt: '2026-01-01', endAt: '2026-01-02' },
      ),
    ).toEqual(result);
    expect(transport.post.mock.lastCall![1]).toEqual(
      expect.objectContaining({ perOrderLimit: null, perStoreLimit: null, totalQuantity: null }),
    );
  });
  it('retains bulk Candidate partial-row results', async () => {
    const result = { created: 1, failed: 1, rows: [] };
    transport.post.mockResolvedValue({ data: { data: result } });
    expect(await submitBulkCandidates('non_drug', [])).toEqual(result);
    expect(transport.post.mock.lastCall![1]).toEqual({ productType: 'non_drug', rows: [] });
  });
});

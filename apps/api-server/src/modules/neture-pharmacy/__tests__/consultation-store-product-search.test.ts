import { ConsultationGuidanceService } from '../services/consultation-guidance.js';
import { NeturePharmacyError } from '../constants.js';

/**
 * 상담 화면 상품 검색 — 매장 단위 판단(2026-11-13 통합 담당 승인).
 * 상담 방식 권한(authorize)과 매장 이용 자격(requireProducts)만 보고, 근무자별 허용은 묻지 않는다.
 */
const rows = [{ id: '55555555-5555-4555-8555-555555555555', kind: 'listing', name: '비타민C', location: 'A-1' }];
let query: jest.Mock, authorize: jest.Mock, requireProducts: jest.Mock, service: ConsultationGuidanceService;
beforeEach(() => {
  query = jest.fn(async () => rows);
  authorize = jest.fn(async () => undefined);
  requireProducts = jest.fn(async () => undefined);
  service = new ConsultationGuidanceService({ query } as never, authorize, requireProducts, jest.fn(), jest.fn());
});

it('lets a store-level consultation search products without any per-staff feature check', async () => {
  await expect(service.searchProducts('staff', 'store', { mode: 'floor-staff', q: '비타민' })).resolves.toEqual(rows);
  expect(authorize).toHaveBeenCalledWith('staff', 'store', 'floor-staff');
  expect(requireProducts).toHaveBeenCalledWith('staff', 'store');
  expect(query).toHaveBeenCalledTimes(1);
});

it('refuses before searching when the consultation mode or the store entitlement is denied', async () => {
  authorize.mockRejectedValueOnce(new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', 'x'));
  await expect(service.searchProducts('staff', 'store', { mode: 'floor-staff', q: '비타민' })).rejects.toMatchObject({ httpStatus: 403 });
  requireProducts.mockRejectedValueOnce(new NeturePharmacyError(403, 'SERVICE_FEATURE_REQUIRED', 'x'));
  await expect(service.searchProducts('staff', 'store', { mode: 'floor-staff', q: '비타민' })).rejects.toMatchObject({ httpStatus: 403 });
  expect(query).not.toHaveBeenCalled();
});

it('requires a consultation mode', async () => {
  await expect(service.searchProducts('staff', 'store', { q: '비타민' })).rejects.toMatchObject({ httpStatus: 400 });
  expect(authorize).not.toHaveBeenCalled();
});

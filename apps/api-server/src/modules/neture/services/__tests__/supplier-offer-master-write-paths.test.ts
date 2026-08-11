/**
 * WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1 — 서비스 경로 검증
 *
 * offer.service 의 두 write 경로가 실제로 ProductMaster 를 건드리는지 확인한다.
 *   1) resolveProductMetadata (등록/연결)
 *   2) updateSupplierOffer 의 master 필드 반영 구간
 */
// jest 는 workspace subpath export(@o4o/ai-prompts/store)를 해석하지 못한다 — 경로 밖 의존이라 가상 mock.
jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null) })),
    manager: {},
  },
}));

import { NetureOfferService } from '../offer.service.js';

type AnyFn = jest.Mock;

function buildService(masterCreated: boolean) {
  const updateProductMaster: AnyFn = jest.fn().mockResolvedValue({ success: true, data: {} });
  const catalogService = {
    resolveOrCreateMaster: jest.fn().mockResolvedValue({
      success: true,
      created: masterCreated,
      data: { id: 'master-1', barcode: null, isMfdsVerified: false },
    }),
    updateProductMaster,
  };
  const svc = new NetureOfferService(catalogService as never);
  return { svc, catalogService, updateProductMaster };
}

const SUPPLIER_MANUAL = {
  name: '공급자 판매명',
  manufacturerName: '공급자 제조사',
  specification: '공급자 규격',
  originCountry: '중국',
  tags: ['공급자태그'],
  regulatoryType: 'COSMETIC',
};

describe('resolveProductMetadata — 기존 master 연결 시 UPDATE 0', () => {
  it('기존 master(created=false) 는 수정하지 않는다', async () => {
    const { svc, updateProductMaster } = buildService(false);
    const r = await (svc as never as { resolveProductMetadata: AnyFn }).resolveProductMetadata(
      { ...SUPPLIER_MANUAL },
      '',
      SUPPLIER_MANUAL.name,
      null,
      undefined,
    );
    expect(r.success).toBe(true);
    expect(r.data.masterId).toBe('master-1');
    expect(r.data.masterCreated).toBe(false);
    expect(updateProductMaster).not.toHaveBeenCalled();
  });

  it('신규 생성(created=true) 은 확장 필드를 적용한다', async () => {
    const { svc, updateProductMaster } = buildService(true);
    const r = await (svc as never as { resolveProductMetadata: AnyFn }).resolveProductMetadata(
      { ...SUPPLIER_MANUAL },
      '',
      SUPPLIER_MANUAL.name,
      null,
      undefined,
    );
    expect(r.success).toBe(true);
    expect(r.data.masterCreated).toBe(true);
    expect(updateProductMaster).toHaveBeenCalledTimes(1);
    const [, updates] = updateProductMaster.mock.calls[0];
    expect(updates).toMatchObject({
      name: SUPPLIER_MANUAL.name,
      specification: SUPPLIER_MANUAL.specification,
      originCountry: SUPPLIER_MANUAL.originCountry,
      tags: SUPPLIER_MANUAL.tags,
    });
  });

  it.each(['DRUG', 'HEALTH_FUNCTIONAL', 'QUASI_DRUG', 'COSMETIC', 'GENERAL'])(
    '%s 도 동일하게 기존 master 는 불변',
    async (regulatoryType) => {
      const { svc, updateProductMaster } = buildService(false);
      await (svc as never as { resolveProductMetadata: AnyFn }).resolveProductMetadata(
        { ...SUPPLIER_MANUAL, regulatoryType },
        '',
        SUPPLIER_MANUAL.name,
        null,
        undefined,
      );
      expect(updateProductMaster).not.toHaveBeenCalled();
    },
  );
});

describe('updateSupplierOffer — master 기준정보 write 경로 제거', () => {
  it('소스에 offer 수정발 updateProductMaster 호출이 남아 있지 않다', () => {
    // 회귀 방지: 이 경로가 되살아나면 공급자 offer 수정이 공유 master 를 덮어쓴다.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'offer.service.ts'), 'utf-8');
    const updateFn = src.slice(src.indexOf('async updateSupplierOffer'));
    const body = updateFn.slice(0, updateFn.indexOf('\n  async ', 10));
    expect(body).not.toContain('updateProductMaster');
  });
});

describe('권한 — offer 는 supplierId 로 스코프된다', () => {
  /** offerRepo.findOne 은 where.supplierId 가 소유자와 같을 때만 행을 준다 (실제 쿼리와 동일 조건) */
  function serviceWithOwner(ownerSupplierId: string) {
    const findOne = jest.fn(async ({ where }: { where: { id: string; supplierId: string } }) =>
      where.supplierId === ownerSupplierId ? { id: where.id, supplierId: ownerSupplierId, masterId: 'master-1' } : null,
    );
    const svc = new NetureOfferService({ updateProductMaster: jest.fn() } as never);
    (svc as never as { _offerRepo: unknown })._offerRepo = { findOne };
    return { svc, findOne };
  }

  it('타 supplier 의 offer 수정은 PRODUCT_NOT_FOUND', async () => {
    const { svc } = serviceWithOwner('supplier-owner');
    const r = await svc.updateSupplierOffer('offer-1', 'supplier-other', { name: '남의 제품 이름 변경 시도' });
    expect(r.success).toBe(false);
    expect(r.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('조회 조건에 supplierId 가 항상 포함된다', async () => {
    const { svc, findOne } = serviceWithOwner('supplier-owner');
    await svc.updateSupplierOffer('offer-1', 'supplier-other', {});
    expect(findOne).toHaveBeenCalledWith({ where: { id: 'offer-1', supplierId: 'supplier-other' } });
  });
});

/**
 * WO-O4O-SUPPLIER-PRODUCT-OFFER-DUPLICATE-ERROR-CONTRACT-V1 — regression guard
 *
 * 배경: Offer 는 (supplier_id, master_id) 당 1행이고 DB 제약
 *   `uq_supplier_product_offers_master_supplier` 가 이를 보장한다(유지가 정답 —
 *   CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1).
 *   그런데 등록 경로가 사전 검사 없이 save() 로 직행해, 재등록 시 23505 가
 *   컨트롤러의 포괄 catch 에 걸려 **일반 500** 으로 노출됐다.
 *   (전역 duplicate-key → 409 변환기는 이 경로에 도달하지 않는다.)
 *
 * 이 테스트는 DB 없이 service 의 private 헬퍼 2개와 컨트롤러 상태코드 매핑을 검증한다.
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';

// jest resolver 는 '@o4o/ai-prompts/store' subpath export 를 해석하지 못한다.
// offer.service 의 import 체인에만 걸리는 의존이라 virtual mock 으로 끊는다(공용 jest 설정 무변경).
jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });

import { NetureOfferService } from '../modules/neture/services/offer.service.js';

/** private 헬퍼 접근 (런타임에는 일반 메서드) */
const svc = () => Object.create(NetureOfferService.prototype) as any;

function withOfferRepo(found: { id: string; deletedAt: Date | null } | null) {
  const s = svc();
  const calls: any[] = [];
  Object.defineProperty(s, 'offerRepo', {
    value: {
      findOne: async (opts: any) => {
        calls.push(opts);
        return found;
      },
    },
    configurable: true,
  });
  return { s, calls };
}

describe('findDuplicateOffer — (supplier, master) 중복 판정', () => {
  it('중복이 없으면 null 을 반환해 정상 등록이 진행된다', async () => {
    const { s } = withOfferRepo(null);
    await expect(s.findDuplicateOffer('sup-1', 'master-1')).resolves.toBeNull();
  });

  it('살아있는 Offer 가 있으면 OFFER_ALREADY_EXISTS', async () => {
    const { s } = withOfferRepo({ id: 'offer-1', deletedAt: null });
    const r = await s.findDuplicateOffer('sup-1', 'master-1');
    expect(r).toMatchObject({ success: false, error: 'OFFER_ALREADY_EXISTS' });
    expect(r.message).toMatch(/이미 등록된/);
  });

  it('휴지통 Offer 가 있으면 OFFER_IN_RECYCLE_BIN (조치가 다르므로 구분)', async () => {
    const { s } = withOfferRepo({ id: 'offer-1', deletedAt: new Date('2026-01-01') });
    const r = await s.findDuplicateOffer('sup-1', 'master-1');
    expect(r).toMatchObject({ success: false, error: 'OFFER_IN_RECYCLE_BIN' });
    expect(r.message).toMatch(/휴지통/);
    expect(r.message).toMatch(/복원|완전 삭제/);
  });

  it('soft-delete 행도 보이도록 withDeleted 로 조회하고 키는 supplier+master 다', async () => {
    const { s, calls } = withOfferRepo(null);
    await s.findDuplicateOffer('sup-9', 'master-9');
    expect(calls).toHaveLength(1);
    expect(calls[0].withDeleted).toBe(true);
    expect(calls[0].where).toEqual({ supplierId: 'sup-9', masterId: 'master-9' });
  });

  it('응답에 내부 DB 정보(relation/SQL/constraint명)를 담지 않는다', async () => {
    const { s } = withOfferRepo({ id: 'offer-1', deletedAt: null });
    const r = await s.findDuplicateOffer('sup-1', 'master-1');
    expect(JSON.stringify(r)).not.toMatch(/uq_supplier_product_offers|relation|23505|INSERT|constraint/i);
  });
});

describe('asOfferDuplicateViolation — 23505 fallback (경쟁 상태)', () => {
  const s = svc();

  it('해당 제약의 23505 는 OFFER_ALREADY_EXISTS 로 변환한다', () => {
    const r = s.asOfferDuplicateViolation({
      code: '23505',
      constraint: 'uq_supplier_product_offers_master_supplier',
    });
    expect(r).toMatchObject({ success: false, error: 'OFFER_ALREADY_EXISTS' });
  });

  it('driverError 에 실려온 경우도 인식한다', () => {
    const r = s.asOfferDuplicateViolation({
      driverError: { code: '23505', constraint: 'uq_supplier_product_offers_master_supplier' },
    });
    expect(r).toMatchObject({ error: 'OFFER_ALREADY_EXISTS' });
  });

  it('같은 테이블의 다른 unique(slug) 위반은 중복 등록으로 오인하지 않는다', () => {
    expect(s.asOfferDuplicateViolation({ code: '23505', constraint: 'idx_spo_slug' })).toBeNull();
  });

  it('다른 테이블의 unique 위반도 변환하지 않는다', () => {
    expect(s.asOfferDuplicateViolation({ code: '23505', constraint: 'uq_something_else' })).toBeNull();
  });

  it('23505 가 아닌 오류는 변환하지 않는다 (FK 위반 등은 그대로 전파)', () => {
    expect(s.asOfferDuplicateViolation({ code: '23503', constraint: 'uq_supplier_product_offers_master_supplier' })).toBeNull();
    expect(s.asOfferDuplicateViolation(new Error('boom'))).toBeNull();
    expect(s.asOfferDuplicateViolation(undefined)).toBeNull();
  });

  it('변환 결과에 내부 DB 정보를 담지 않는다', () => {
    const r = s.asOfferDuplicateViolation({
      code: '23505',
      constraint: 'uq_supplier_product_offers_master_supplier',
      detail: 'Key (master_id, supplier_id)=(...) already exists.',
    });
    expect(JSON.stringify(r)).not.toMatch(/uq_supplier_product_offers|Key \(|23505|constraint/i);
  });
});

describe('source contract', () => {
  const serviceSrc = () =>
    readFileSync(join(__dirname, '..', 'modules', 'neture', 'services', 'offer.service.ts'), 'utf8');
  const controllerSrc = () =>
    readFileSync(join(__dirname, '..', 'modules', 'neture', 'controllers', 'supplier-product.controller.ts'), 'utf8');

  it('등록 경로가 save() 전에 중복 검사를 수행한다', () => {
    const src = serviceSrc();
    const guardAt = src.indexOf('await this.findDuplicateOffer(supplierId, masterId)');
    const saveAt = src.indexOf('await this.offerRepo.save(offer)');
    expect(guardAt).toBeGreaterThan(-1);
    expect(saveAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(saveAt);
  });

  it('controller 가 두 코드를 모두 409 로 매핑한다', () => {
    const src = controllerSrc();
    expect(src).toMatch(/result\.error === 'OFFER_ALREADY_EXISTS' \? 409/);
    expect(src).toMatch(/result\.error === 'OFFER_IN_RECYCLE_BIN' \? 409/);
  });

  it('기존 계약을 유지한다 (SUPPLIER_NOT_ACTIVE 403, 그 외 400, 성공 201)', () => {
    const src = controllerSrc();
    expect(src).toMatch(/result\.error === 'SUPPLIER_NOT_ACTIVE' \? 403/);
    expect(src).toMatch(/: 400;/);
    expect(src).toMatch(/res\.status\(201\)\.json\(result\)/);
  });

  it('unique 제약과 soft-delete 슬롯 정책은 건드리지 않는다 (migration/DDL 없음)', () => {
    const src = serviceSrc();
    expect(src).not.toMatch(/DROP CONSTRAINT/i);
    expect(src).not.toMatch(/ALTER TABLE supplier_product_offers/i);
    expect(src).not.toMatch(/CREATE (UNIQUE )?INDEX/i);
  });

  it('서비스가 여전히 원본 오류를 로그로 남기고 미인식 오류는 전파한다', () => {
    const src = serviceSrc();
    expect(src).toMatch(/logger\.warn\([^)]*Duplicate offer race/);
    expect(src).toMatch(/throw err;/);
  });
});

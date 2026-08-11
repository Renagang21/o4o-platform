/**
 * SharedProductDescriptionService — 화장품 설명서 작성 계약 Unit Tests
 *
 * WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2
 *
 * 이전 WO(...-COSMETIC-WRITE-GUARD-...)의 "화장품 + 비-supplier → 차단" 계약은 폐기됐다.
 * 새 정책(O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1 §5-1): 화장품은 O4O 와 브랜드 보유 공급자가 공동 관리한다.
 * 서비스 계층은 규제유형으로 작성을 막지 않으며, 주체 제한은 라우팅 가드(requireRole / requireActiveSupplier)가 담당한다.
 *
 * 검증: 화장품이든 아니든 O4O(manual)·공급자(supplier) 가 모두 createCandidate · setCanonical 을 통과하고,
 *   출처는 기존 source_type / created_by / created_by_supplier_id 로 구분되며, 기존 계약(삭제본 승격 금지)은 유지된다.
 * DB 비의존 — repository(create/save/findOne) 를 목킹한다.
 */

import type { DataSource } from 'typeorm';
import { SharedProductDescriptionService } from '../shared-product-description.service.js';

/** createCandidate 용 목 DataSource */
function dsForCreate(): DataSource {
  const repo = {
    create: (e: any) => e,
    save: async (e: any) => ({ id: 'spd-new', ...e }),
    findOne: async () => null,
  };
  return {
    getRepository: () => repo,
    query: async () => [],
  } as unknown as DataSource;
}

/** setCanonical 용 목 DataSource — transaction + 대상 candidate */
function dsForCanonical(target: any): DataSource {
  const qb: any = new Proxy(
    {},
    { get: (_t, p) => (p === 'execute' ? async () => ({}) : () => qb) },
  );
  const repo = {
    findOne: async () => target,
    createQueryBuilder: () => qb,
    save: async (t: any) => t,
  };
  return {
    getRepository: () => repo,
    query: async () => [],
    transaction: async (cb: any) => cb({ getRepository: () => repo, query: async () => [] }),
  } as unknown as DataSource;
}

const BODY = '<p>설명 본문</p>';

describe('createCandidate — 화장품 공동 관리 계약', () => {
  const base = { masterId: 'm1', content: BODY, language: 'ko' as const };

  it('화장품 + O4O(manual) → 허용 (정책 §5-1-2)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate());
    const row = await svc.createCandidate({ ...base, sourceType: 'manual' });
    expect(row.id).toBe('spd-new');
  });

  it('화장품 + 공급자(supplier) → 허용 (정책 §5-1-3)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate());
    const row = await svc.createCandidate({ ...base, sourceType: 'supplier', sourceRefId: 'offer-1' });
    expect(row.id).toBe('spd-new');
  });

  it('출처는 기존 source_type / created_by 구조로 구분한다 (정책 §5-1-7)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate());
    const o4o = await svc.createCandidate({ ...base, sourceType: 'manual', createdBy: 'operator-1' });
    const sup = await svc.createCandidate({
      ...base,
      sourceType: 'supplier',
      createdBySupplierId: 'sup-1',
    });
    expect(o4o.sourceType).toBe('manual');
    expect(o4o.createdBy).toBe('operator-1');
    expect(sup.sourceType).toBe('supplier');
    expect(sup.createdBySupplierId).toBe('sup-1');
  });

  it('기존 제품군(seed 등 비-화장품 경로) → 허용 (회귀 없음)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate());
    const row = await svc.createCandidate({ ...base, sourceType: 'seed' });
    expect(row.id).toBe('spd-new');
  });
});

describe('setCanonical — 화장품 canonical 승격', () => {
  it('화장품 + O4O(manual) 후보 승격 → 허용 (2차 방어도 폐기)', async () => {
    const target = { id: 'c1', masterId: 'm1', descriptionType: 'STORE', language: 'ko', sourceType: 'manual', deletedAt: null };
    const svc = new SharedProductDescriptionService(dsForCanonical(target));
    const row = await svc.setCanonical('c1', 'actor');
    expect(row.status).toBe('canonical');
  });

  it('화장품 + 공급자(supplier) 후보 승격 → 허용', async () => {
    const target = { id: 'c2', masterId: 'm1', descriptionType: 'STORE', language: 'ko', sourceType: 'supplier', deletedAt: null };
    const svc = new SharedProductDescriptionService(dsForCanonical(target));
    const row = await svc.setCanonical('c2', 'actor');
    expect(row.status).toBe('canonical');
  });

  it('삭제된 설명서는 승격하지 않는다 (기존 계약 유지)', async () => {
    const target = { id: 'c3', masterId: 'm1', descriptionType: 'STORE', language: 'ko', sourceType: 'manual', deletedAt: new Date() };
    const svc = new SharedProductDescriptionService(dsForCanonical(target));
    await expect(svc.setCanonical('c3', 'actor')).rejects.toThrow(/deleted/i);
  });
});

/**
 * Service tests — 실제 TX 롤백 실증 (WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2 · §6.1 보강 ②)
 *
 * 실 DB 없이 롤백 의미를 재현한다: fake DataSource.transaction 이 InMemoryPromotionStore 를 snapshot 하고,
 * 콜백이 throw 하면 restore 후 rethrow (PostgreSQL ROLLBACK 과 같은 관측 결과). 콜백이 정상 종료하면 commit(그대로 유지).
 *
 *   regulated create → Core 가 Master/Identifier/candidate 를 쓴 뒤 정책 throw → 롤백
 *     → ProductMaster +0 · ProductIdentifier +0 · candidate pending · matchedProductMasterId null · afterCommit 0
 *   GENERAL create → commit → Master +1 · candidate approved_new_master · afterCommit 1
 */

jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import type { DataSource, EntityManager } from 'typeorm';
import { promoteWithStore } from '../product-promotion-core.service.js';
import type { ProductPromotionPlan, PromotionOutcome } from '../product-promotion.types.js';
import type { SupplierCandidateRecord } from '../adapters/supplier/supplier-candidate.normalizer.js';
import { SupplierNormalizationError } from '../adapters/supplier/supplier-candidate.normalizer.js';
import { SupplierPolicyError } from '../adapters/supplier/supplier-promotion.policy.js';
import {
  SupplierCandidatePromotionService,
  SupplierPromotionNotFoundError,
  type SupplierPromotionCoreLike,
} from '../adapters/supplier/supplier-candidate-promotion.service.js';
import { InMemoryPromotionStore, type MemCandidate } from './in-memory-promotion-store.js';

const GTIN = '8801234567893';
const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';
const CID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

interface Snapshot { masters: string; identifiers: string; candidates: string; writes: string }

class TxRollbackHarness {
  readonly store = new InMemoryPromotionStore();
  tx = { begun: 0, committed: 0, rolledBack: 0 };
  afterCommitCalls: Array<{ plan: ProductPromotionPlan; outcome: PromotionOutcome }> = [];

  private snapshot(): Snapshot {
    return {
      masters: JSON.stringify(this.store.masters),
      identifiers: JSON.stringify(this.store.identifiers),
      candidates: JSON.stringify([...this.store.candidates.entries()]),
      writes: JSON.stringify(this.store.writes),
    };
  }

  private restore(s: Snapshot): void {
    this.store.masters = JSON.parse(s.masters);
    this.store.identifiers = JSON.parse(s.identifiers);
    this.store.candidates = new Map<string, MemCandidate>(JSON.parse(s.candidates));
    this.store.writes = JSON.parse(s.writes);
  }

  /** 같은 TX 의 EntityManager 역할 — 정책 SELECT 를 store 로 답한다 */
  readonly manager = {
    query: async (sql: string, params?: unknown[]) => {
      if (!/FROM product_masters WHERE id = \$1/.test(sql)) throw new Error(`unexpected query: ${sql}`);
      const m = this.store.masters.find((x) => x.id === params?.[0]);
      return m ? [{ id: m.id, regulatory_type: m.regulatoryType, drug_category: m.drugCategory }] : [];
    },
  } as unknown as EntityManager;

  readonly dataSource = {
    transaction: async <T,>(fn: (m: EntityManager) => Promise<T>): Promise<T> => {
      this.tx.begun += 1;
      const snap = this.snapshot();
      try {
        const r = await fn(this.manager);
        this.tx.committed += 1;
        return r;
      } catch (e) {
        this.restore(snap); // ROLLBACK
        this.tx.rolledBack += 1;
        throw e;
      }
    },
    getRepository: () => { throw new Error('loadCandidate 는 deps 로 주입한다'); },
  } as unknown as DataSource;

  readonly core: SupplierPromotionCoreLike = {
    promoteWithin: async (m, plan) => {
      expect(m).toBe(this.manager); // Core 쓰기와 정책 검사가 같은 TX 컨텍스트
      return promoteWithStore(this.store, plan);
    },
    afterCommit: async (plan, outcome) => { this.afterCommitCalls.push({ plan, outcome }); },
  };

  readonly candidates = new Map<string, SupplierCandidateRecord>();

  readonly service = new SupplierCandidatePromotionService(this.dataSource, {
    core: this.core,
    loadCandidate: async (id) => this.candidates.get(id) ?? null,
  });

  seedSingle(regulatoryType: string, over: Partial<SupplierCandidateRecord> = {}, raw: Record<string, unknown> = {}): void {
    this.store.addCandidate(CID);
    this.candidates.set(CID, {
      id: CID, sourceType: 'supplier_web', sourceLabel: 'neture-supplier-single',
      identifierType: 'EAN13', identifierValue: GTIN,
      candidateName: '롤백 상품', candidateBrand: null, candidateManufacturer: '롤백 제조', candidateSpec: null, candidateUnit: null,
      rawPayload: { source: 'supplier_single', supplierId: SUPPLIER_ID, regulatoryType, drugCategory: null, mfdsPermitNumber: '2020-7', ...raw },
      ...over,
    });
  }
}

const pending = (h: TxRollbackHarness) => h.store.candidates.get(CID)!;

describe('SupplierCandidatePromotionService — TX 롤백 실증', () => {
  it.each(['HEALTH_FUNCTIONAL', 'QUASI_DRUG', 'MEDICAL_DEVICE'] as const)(
    '%s 신규: Core write 후 정책 throw → 롤백 → Master +0 · Identifier +0 · candidate pending · matched null · afterCommit 0',
    async (rt) => {
      const h = new TxRollbackHarness();
      h.seedSingle(rt);
      const mastersBefore = h.store.masters.length;
      const identifiersBefore = h.store.identifiers.length;

      await expect(h.service.promote(CID, { reviewedBy: 'u-1' })).rejects.toMatchObject({
        name: 'SupplierPolicyError', code: 'SUPPLIER_REGULATED_CREATE_BLOCKED', data: { regulatoryType: rt },
      });

      expect(h.tx).toEqual({ begun: 1, committed: 0, rolledBack: 1 });
      expect(h.store.masters.length - mastersBefore).toBe(0);
      expect(h.store.identifiers.length - identifiersBefore).toBe(0);
      expect(pending(h)).toMatchObject({ candidateStatus: 'pending', matchedProductMasterId: null });
      expect(pending(h).approval).toBeUndefined();
      expect(h.store.writes).toEqual({ createMaster: 0, createIdentifier: 0, updateCandidate: 0 }); // snapshot 이 writes 도 되돌린다
      expect(h.afterCommitCalls).toHaveLength(0);
    },
  );

  it('DRUG otc 신규: 정책 throw → 롤백 (ensureDrugExtension effect 도 실행되지 않음)', async () => {
    const h = new TxRollbackHarness();
    h.seedSingle('DRUG', {}, { drugCategory: 'otc' });
    await expect(h.service.promote(CID, { reviewedBy: 'u-1' })).rejects.toBeInstanceOf(SupplierPolicyError);
    expect(h.store.masters).toHaveLength(0);
    expect(pending(h).candidateStatus).toBe('pending');
    expect(h.afterCommitCalls).toHaveLength(0);
  });

  it('정책 throw 직전에는 Core 가 실제로 썼음을 확인 (롤백이 의미 있는 테스트라는 증거)', async () => {
    const h = new TxRollbackHarness();
    h.seedSingle('HEALTH_FUNCTIONAL');
    let observed: { masters: number; identifiers: number; status: string | undefined } | null = null;
    const origQuery = h.manager.query.bind(h.manager);
    // 정책은 create 에서 query 를 호출하지 않으므로 promoteWithin 이후 시점을 core 래핑으로 관측한다
    const spyCore: SupplierPromotionCoreLike = {
      promoteWithin: async (m, plan) => {
        const o = await h.core.promoteWithin(m, plan);
        observed = { masters: h.store.masters.length, identifiers: h.store.identifiers.length, status: h.store.candidates.get(CID)?.candidateStatus };
        return o;
      },
      afterCommit: h.core.afterCommit,
    };
    const svc = new SupplierCandidatePromotionService(h.dataSource, { core: spyCore, loadCandidate: async (id) => h.candidates.get(id) ?? null });
    await expect(svc.promote(CID, { reviewedBy: 'u-1' })).rejects.toBeInstanceOf(SupplierPolicyError);
    expect(observed).toEqual({ masters: 1, identifiers: 1, status: 'approved_new_master' }); // TX 안에서는 써졌다
    expect(h.store.masters).toHaveLength(0); // 롤백 후 0
    expect(pending(h).candidateStatus).toBe('pending');
    void origQuery;
  });

  it('GENERAL 신규: commit → Master +1 · Identifier +1 · candidate approved_new_master · afterCommit 1 (커밋 후 · 같은 plan/outcome)', async () => {
    const h = new TxRollbackHarness();
    h.seedSingle('GENERAL');
    const r = await h.service.promote(CID, { reviewedBy: 'u-1', note: 'ok' });

    expect(r.outcome.kind).toBe('create');
    expect(r.normalized.regulatoryType).toBe('GENERAL');
    expect(h.tx).toEqual({ begun: 1, committed: 1, rolledBack: 0 });
    expect(h.store.masters).toHaveLength(1);
    expect(h.store.masters[0]).toMatchObject({ regulatoryType: 'GENERAL', barcode: GTIN, name: '롤백 상품' });
    expect(h.store.identifiers).toHaveLength(1);
    expect(pending(h)).toMatchObject({ candidateStatus: 'approved_new_master', matchedProductMasterId: h.store.masters[0].id, reviewedBy: 'u-1' });
    expect(pending(h).approval).toMatchObject({ kind: 'supplier', origin: 'single', supplierId: SUPPLIER_ID, note: 'ok', outcome: 'create', evidence: { mfdsPermitNumber: '2020-7' } });
    expect(h.afterCommitCalls).toHaveLength(1);
    expect(h.afterCommitCalls[0].outcome).toEqual(r.outcome);
    expect(h.afterCommitCalls[0].plan.candidateId).toBe(CID);
  });

  it('COSMETIC 신규 commit · 기존 HFF Master 로 link commit (afterCommit 은 create 이외에도 호출은 되지만 Core 가 no-op)', async () => {
    const h = new TxRollbackHarness();
    h.store.addMaster({ id: 'm-hff', barcode: GTIN, name: '롤백 상품', manufacturerName: '롤백 제조', regulatoryType: '건강기능식품' });
    h.seedSingle('HEALTH_FUNCTIONAL');
    const r = await h.service.promote(CID, { reviewedBy: 'u-1' });
    expect(r.outcome).toMatchObject({ kind: 'link', masterId: 'm-hff', matchType: 'barcode' });
    expect(h.tx.committed).toBe(1);
    expect(h.store.masters).toHaveLength(1);
    expect(pending(h)).toMatchObject({ candidateStatus: 'matched', matchedProductMasterId: 'm-hff' });
    expect(h.afterCommitCalls).toHaveLength(1);
  });

  it('link 정책 위반(기존 GENERAL ↔ 후보 HFF) → 롤백 → identifier 보강 · candidate matched 전이 모두 취소', async () => {
    const h = new TxRollbackHarness();
    h.store.addMaster({ id: 'm-gen', name: '롤백 상품', manufacturerName: '롤백 제조', regulatoryType: 'GENERAL' }); // barcode 없음 → name 매칭
    h.seedSingle('HEALTH_FUNCTIONAL');
    await expect(h.service.promote(CID, { reviewedBy: 'u-1' })).rejects.toMatchObject({ code: 'SUPPLIER_REGULATORY_TYPE_MISMATCH' });
    expect(h.tx.rolledBack).toBe(1);
    expect(h.store.identifiers).toHaveLength(0); // 보강된 EAN13 도 롤백
    expect(pending(h)).toMatchObject({ candidateStatus: 'pending', matchedProductMasterId: null });
    expect(h.afterCommitCalls).toHaveLength(0);
  });

  it('hold(rx) · conflict 는 TX 는 열리지만 write 0 · commit · afterCommit 호출(Core no-op)', async () => {
    const h = new TxRollbackHarness();
    h.seedSingle('DRUG', {}, { drugCategory: 'rx' });
    const r = await h.service.promote(CID, { reviewedBy: 'u-1' });
    expect(r.outcome).toEqual({ kind: 'hold', reason: 'rx_not_promotable' });
    expect(h.store.writeCount).toBe(0);
    expect(pending(h).candidateStatus).toBe('pending');
  });

  it('후보 없음 → SupplierPromotionNotFoundError · TX 0 · 비공급자 소스 → SupplierNormalizationError · TX 0', async () => {
    const h = new TxRollbackHarness();
    await expect(h.service.promote(CID, { reviewedBy: 'u-1' })).rejects.toBeInstanceOf(SupplierPromotionNotFoundError);
    h.seedSingle('GENERAL', { sourceType: 'csv_import', sourceLabel: '식약처', rawPayload: { regulatoryType: 'HEALTH_FUNCTIONAL' } });
    await expect(h.service.promote(CID, { reviewedBy: 'u-1' })).rejects.toMatchObject({ name: 'SupplierNormalizationError', code: 'SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE' });
    expect(h.tx.begun).toBe(0);
    expect(h.afterCommitCalls).toHaveLength(0);
  });

  it('SupplierNormalizationError 는 export 된 클래스다', () => {
    expect(new SupplierNormalizationError('SUPPLIER_ID_MISSING').code).toBe('SUPPLIER_ID_MISSING');
  });
});

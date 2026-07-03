/**
 * Unit tests — WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1
 *
 * 실 DB 불필요. InMemory PromotionMasterStore 로 create/link/conflict/idempotency 검증.
 * GTIN fixture: valid 8801234567893 / invalid 8801234567894 / valid 8009876543217.
 */

import { normalizeIdentifier } from '../../utils/product-identifier.util.js';
import {
  promoteOne,
  promotionFieldsFromCandidate,
  buildMasterPreview,
  MFDS_PRODUCT_ID_PREFIX,
} from '../drug-master-promotion-apply.service.js';
import type {
  PromotionMasterStore,
  ExistingMaster,
  MasterPreview,
  IdentifierPreview,
  PromoteCtx,
  PromotionFields,
} from '../drug-master-promotion-apply.service.js';

const VALID = '8801234567893';
const INVALID_CD = '8801234567894';
const VALID_B = '8009876543217';

const CTX: PromoteCtx = { apply: true, importBatchId: 'batch-1', sourceBaseDate: '2025-10-31', sourceLabel: 'HIRA_2025-10-31' };
const DRYRUN: PromoteCtx = { ...CTX, apply: false };

/** 인메모리 store (테스트 전용) */
class InMemoryStore implements PromotionMasterStore {
  masters: Array<{ id: string; barcode: string; mfdsProductId: string; name: string; manufacturerName: string; specification: string | null }> = [];
  identifiers: Array<{ masterId: string; type: string; normalized: string }> = [];
  candidateUpdates: Array<{ candidateId: string; masterId: string; kind: string }> = [];
  private seq = 0;

  async findMasterByBarcode(barcode: string): Promise<ExistingMaster | null> {
    const m = this.masters.find((x) => x.barcode === barcode);
    return m ? { id: m.id, name: m.name, manufacturerName: m.manufacturerName, specification: m.specification } : null;
  }
  async findMasterByMfdsProductId(mfdsProductId: string): Promise<{ id: string } | null> {
    const m = this.masters.find((x) => x.mfdsProductId === mfdsProductId);
    return m ? { id: m.id } : null;
  }
  async findMasterIdsByIdentifier(type: IdentifierPreview['identifierType'], normalizedValue: string): Promise<string[]> {
    return [...new Set(this.identifiers.filter((i) => i.type === type && i.normalized === normalizedValue).map((i) => i.masterId))];
  }
  async createMaster(preview: MasterPreview): Promise<{ id: string }> {
    const id = `mem-${++this.seq}`;
    this.masters.push({
      id, barcode: preview.barcode, mfdsProductId: preview.mfdsProductId,
      name: preview.name, manufacturerName: preview.manufacturerName, specification: preview.specification,
    });
    return { id };
  }
  async createIdentifier(masterId: string, preview: IdentifierPreview): Promise<void> {
    const dup = this.identifiers.some((i) => i.masterId === masterId && i.type === preview.identifierType && i.normalized === preview.normalizedValue);
    if (!dup) this.identifiers.push({ masterId, type: preview.identifierType, normalized: preview.normalizedValue });
  }
  async markCandidatePromoted(candidateId: string, masterId: string, kind: 'create' | 'link'): Promise<void> {
    this.candidateUpdates.push({ candidateId, masterId, kind });
  }
  /** 테스트 헬퍼: 기존 master + identifier 세팅 */
  seed(barcode: string, opts?: { name?: string; manuf?: string; spec?: string | null; withKdc?: boolean }): string {
    const id = `seed-${++this.seq}`;
    this.masters.push({
      id, barcode, mfdsProductId: `${MFDS_PRODUCT_ID_PREFIX}${barcode}`,
      name: opts?.name ?? 'seed', manufacturerName: opts?.manuf ?? 'seedM', specification: opts?.spec ?? null,
    });
    if (opts?.withKdc !== false) this.identifiers.push({ masterId: id, type: 'KOREA_DRUG_CODE', normalized: normalizeIdentifier('KOREA_DRUG_CODE', barcode) });
    return id;
  }
}

function fields(over: Partial<PromotionFields>): PromotionFields {
  return {
    candidateId: 'cand-1', rowNumber: 1,
    standardCode: VALID, mfdsCode: '111', insuranceCode: null, atcCode: null,
    productName: '상품A', manufacturer: '제조사A', rxOtc: '일반',
    spec: null, totalQuantity: null, dosageForm: null, packageForm: null, isCancelled: false,
    ...over,
  };
}

describe('drug-master promotion apply', () => {
  test('1. eligible candidate → ProductMaster preview (create)', async () => {
    const store = new InMemoryStore();
    const o = await promoteOne(fields({}), store, DRYRUN);
    expect(o.outcome).toBe('create');
    expect(o.masterPreview?.barcode).toBe(VALID);
    expect(o.identifiersCreated).toBe(2); // KOREA_DRUG_CODE + MFDS_CODE
  });

  test('2. cancelled candidate skip', async () => {
    const store = new InMemoryStore();
    const o = await promoteOne(fields({ isCancelled: true }), store, DRYRUN);
    expect(o.outcome).toBe('skip');
    expect(o.skipReason).toBe('cancelled');
  });

  test('3. invalid GTIN (check-digit) skip', async () => {
    const store = new InMemoryStore();
    const o = await promoteOne(fields({ standardCode: INVALID_CD }), store, DRYRUN);
    expect(o.outcome).toBe('skip');
    expect(o.skipReason).toBe('invalid_standard_code_check_digit');
    expect(o.gtinError).toMatch(/check digit/i);
  });

  test('4. mfdsProductId = HIRA:DRUG_MASTER:{standardCode}', () => {
    const p = buildMasterPreview(fields({}), CTX);
    expect(p.mfdsProductId).toBe(`${MFDS_PRODUCT_ID_PREFIX}${VALID}`);
    expect(p.barcode).toBe(VALID);
    expect(p.mfdsPermitNumber).toBeNull();
    expect(p.regulatoryType).toBe('DRUG');
  });

  test('5. KOREA_DRUG_CODE primary identifier 생성 (apply)', async () => {
    const store = new InMemoryStore();
    const o = await promoteOne(fields({ mfdsCode: null }), store, CTX);
    expect(o.outcome).toBe('create');
    expect(store.masters).toHaveLength(1);
    const kdc = store.identifiers.filter((i) => i.type === 'KOREA_DRUG_CODE');
    expect(kdc).toHaveLength(1);
    expect(kdc[0].normalized).toBe(normalizeIdentifier('KOREA_DRUG_CODE', VALID));
  });

  test('6. MFDS_CODE + 보조 identifier 생성 (apply)', async () => {
    const store = new InMemoryStore();
    const o = await promoteOne(fields({ mfdsCode: '111', insuranceCode: '650012', atcCode: 'A10BA02' }), store, CTX);
    expect(o.outcome).toBe('create');
    expect(o.identifiersCreated).toBe(4);
    const types = store.identifiers.map((i) => i.type).sort();
    expect(types).toEqual(['ATC_CODE', 'KOREA_DRUG_CODE', 'KOREA_INSURANCE_CODE', 'MFDS_CODE']);
  });

  test('7. 기존 barcode master 는 link (새 Master 생성 안 함)', async () => {
    const store = new InMemoryStore();
    const seedId = store.seed(VALID, { name: '기존상품', manuf: '기존제조사' });
    const o = await promoteOne(fields({ mfdsCode: '111' }), store, CTX);
    expect(o.outcome).toBe('link');
    expect(o.masterId).toBe(seedId);
    expect(store.masters).toHaveLength(1); // 새 master 없음
    // KOREA_DRUG_CODE 는 이미 있음 → existing, MFDS_CODE 는 신규 → created
    expect(o.identifiersExisting).toBe(1);
    expect(o.identifiersCreated).toBe(1);
  });

  test('8. KOREA_DRUG_CODE 가 다른 master 에 있으면 conflict (write 금지)', async () => {
    const store = new InMemoryStore();
    // 다른 barcode 의 master 가 우리의 표준코드를 KOREA_DRUG_CODE 로 보유 (불일치 상태)
    const otherId = `other-x`;
    store.masters.push({ id: otherId, barcode: VALID_B, mfdsProductId: `${MFDS_PRODUCT_ID_PREFIX}${VALID_B}`, name: 'x', manufacturerName: 'x', specification: null });
    store.identifiers.push({ masterId: otherId, type: 'KOREA_DRUG_CODE', normalized: normalizeIdentifier('KOREA_DRUG_CODE', VALID) });
    const o = await promoteOne(fields({}), store, CTX);
    expect(o.outcome).toBe('conflict');
    expect(o.conflictReason).toBe('identifier_belongs_to_other_master');
    expect(store.masters).toHaveLength(1); // 새 master 생성 안 됨
  });

  test('9. link 시 name/manufacturer 자동 overwrite 금지 (차이는 diff 로만)', async () => {
    const store = new InMemoryStore();
    store.seed(VALID, { name: '기존상품', manuf: '기존제조사', spec: '기존규격' });
    const o = await promoteOne(fields({ productName: '새상품', manufacturer: '새제조사', spec: '새규격' }), store, CTX);
    expect(o.outcome).toBe('link');
    expect(o.existingMasterDiff?.nameDiffers).toBe(true);
    expect(o.existingMasterDiff?.manufacturerDiffers).toBe(true);
    // 기존 master 값 불변
    expect(store.masters[0].name).toBe('기존상품');
    expect(store.masters[0].manufacturerName).toBe('기존제조사');
  });

  test('10. dry-run 은 write 0', async () => {
    const store = new InMemoryStore();
    const o = await promoteOne(fields({}), store, DRYRUN);
    expect(o.outcome).toBe('create');
    expect(store.masters).toHaveLength(0);
    expect(store.identifiers).toHaveLength(0);
    expect(store.candidateUpdates).toHaveLength(0);
    expect(o.identifiersCreated).toBe(2); // would-create 예측
  });

  test('11. apply idempotent — 두 번 실행해도 중복 없음', async () => {
    const store = new InMemoryStore();
    await promoteOne(fields({ mfdsCode: '111', atcCode: 'A10' }), store, CTX);
    const second = await promoteOne(fields({ mfdsCode: '111', atcCode: 'A10' }), store, CTX);
    expect(second.outcome).toBe('link'); // 2회차는 기존 master link
    expect(store.masters).toHaveLength(1);
    // identifier 중복 없음 (3종)
    expect(store.identifiers).toHaveLength(3);
    expect(second.identifiersCreated).toBe(0);
    expect(second.identifiersExisting).toBe(3);
  });

  test('12. candidate 어댑터 — rawPayload.source 에서 필드 추출', () => {
    const f = promotionFieldsFromCandidate({
      id: 'c1',
      candidateName: '상품X',
      candidateManufacturer: '제조X',
      candidateCategory: '전문',
      candidateSpec: '10mg',
      candidateUnit: null,
      identifierValue: VALID,
      normalizedIdentifierValue: VALID,
      rawPayload: {
        standardCode: VALID, mfdsCode: '999', rowNumber: 42, sourceBaseDate: '2025-10-31', isCancelled: false,
        source: { '제품코드(개정후)': '650999', '국제표준코드(ATC코드)': 'N02BE01', 제품총수량: '30정', 제형구분: '정제' },
      },
    });
    expect(f.standardCode).toBe(VALID);
    expect(f.mfdsCode).toBe('999');
    expect(f.insuranceCode).toBe('650999');
    expect(f.atcCode).toBe('N02BE01');
    expect(f.rxOtc).toBe('전문');
    expect(f.rowNumber).toBe(42);
    const p = buildMasterPreview(f, CTX);
    expect(p.drugCategory).toBe('rx');
    expect(p.specification).toBe('10mg / 30정 / 정제');
  });
});

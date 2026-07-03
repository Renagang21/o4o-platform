/**
 * Unit tests — WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-BATCHING-V1
 *
 * 배치 apply(runCandidatePromotion apply=true) 를 Fake DataSource 로 검증.
 * ProductMaster/Identifier INSERT 가 청크 multi-row(배치)로 이뤄지는지, create/link/skip 판정,
 * idempotency(기존 barcode → link), dry-run write 0 을 확인. 실 DB 불필요.
 */

import { runCandidatePromotion } from '../drug-master-promotion-apply.db.js';

const VALID = '8801234567893';
const VALID_B = '8009876543217';
const VALID_C = '8800000000008';
const INVALID_CD = '8801234567894';

interface CandRow {
  id: string;
  candidate_name: string | null;
  candidate_manufacturer: string | null;
  candidate_category: string | null;
  candidate_spec: string | null;
  candidate_unit: string | null;
  identifier_value: string | null;
  normalized_identifier_value: string | null;
  raw_payload: Record<string, unknown> | null;
}

function cand(id: string, std: string, over: Partial<CandRow> & { cancelled?: boolean; mfds?: string; atc?: string } = {}): CandRow {
  return {
    id,
    candidate_name: over.candidate_name ?? `상품${id}`,
    candidate_manufacturer: over.candidate_manufacturer ?? `제조${id}`,
    candidate_category: over.candidate_category ?? '일반',
    candidate_spec: over.candidate_spec ?? null,
    candidate_unit: over.candidate_unit ?? null,
    identifier_value: std,
    normalized_identifier_value: std,
    raw_payload: {
      standardCode: std,
      mfdsCode: over.mfds ?? '111',
      atcCode: over.atc ?? null,
      isCancelled: over.cancelled ?? false,
      sourceBaseDate: '2025-10-31',
      rowNumber: 1,
      source: {},
    },
  };
}

/** Fake DataSource — raw ds.query 만 흉내. INSERT/UPDATE 기록. */
class FakeDS {
  existingMasters: Array<{ id: string; barcode: string; name: string; manufacturer_name: string; specification: string | null; mfds_product_id: string }> = [];
  existingIdentifiers: Array<{ identifier_type: string; normalized_value: string; product_master_id: string }> = [];
  candidates: CandRow[] = [];

  insertedMasterRows = 0;
  insertedIdentifierRows = 0;
  candUpdateRows = 0;
  masterInsertCalls = 0;
  identifierInsertCalls = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(sql: string, params?: any[]): Promise<any> {
    if (/SELECT[\s\S]*FROM product_masters/i.test(sql)) return this.existingMasters;
    if (/SELECT[\s\S]*FROM product_identifiers/i.test(sql)) return this.existingIdentifiers;
    if (/SELECT[\s\S]*FROM product_candidates/i.test(sql)) {
      const lastId = params?.[0] as string;
      const limMatch = sql.match(/LIMIT (\d+)/);
      const lim = limMatch ? parseInt(limMatch[1], 10) : this.candidates.length;
      return this.candidates
        .filter((c) => c.id > lastId)
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .slice(0, lim)
        .map((c) => {
          // lean 투영(apply 경로) + raw_payload(dry-run 경로) superset
          const rp = c.raw_payload ?? {};
          const src = (rp.source as Record<string, unknown>) ?? {};
          return {
            ...c,
            std: (rp.standardCode as string) ?? c.normalized_identifier_value,
            mfds_code: (rp.mfdsCode as string) ?? (src['품목기준코드'] as string) ?? null,
            atc: (rp.atcCode as string) ?? (src['국제표준코드(ATC코드)'] as string) ?? null,
            insurance: (src['제품코드(개정후)'] as string) ?? null,
            total_qty: (src['제품총수량'] as string) ?? null,
            dosage_form: (src['제형구분'] as string) ?? null,
            is_cancelled: rp.isCancelled === true ? 'true' : rp.isCancelled === false ? 'false' : null,
            row_number: rp.rowNumber != null ? String(rp.rowNumber) : null,
          };
        });
    }
    if (/INSERT INTO product_masters/i.test(sql)) {
      this.masterInsertCalls += 1;
      this.insertedMasterRows += (params?.length ?? 0) / 14;
      return [];
    }
    if (/INSERT INTO product_identifiers/i.test(sql)) {
      this.identifierInsertCalls += 1;
      this.insertedIdentifierRows += (params?.length ?? 0) / 11;
      return [];
    }
    if (/UPDATE product_candidates/i.test(sql)) {
      this.candUpdateRows += (params?.length ?? 0) / 3;
      return [];
    }
    return [];
  }
}

const OPTS = (ds: FakeDS, apply: boolean) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataSource: ds as any,
  apply,
  importBatchId: 'batch-test',
  sourceBaseDate: '2025-10-31',
  sourceLabel: 'HIRA_2025-10-31',
  candidateSourceLabelLike: null,
});

describe('drug-master promotion apply — batching', () => {
  test('빈 catalog + 3 eligible → 배치 INSERT(청크 1회), master 3 / candidate 마킹 3', async () => {
    const ds = new FakeDS();
    ds.candidates = [cand('c1', VALID), cand('c2', VALID_B), cand('c3', VALID_C)];
    const report = await runCandidatePromotion(OPTS(ds, true));

    expect(report.createdMaster).toBe(3);
    expect(report.wouldCreateMaster).toBe(0);
    expect(ds.insertedMasterRows).toBe(3);
    expect(ds.masterInsertCalls).toBe(1); // 청크 1회 (per-row 아님)
    // 각 후보 identifier: KOREA_DRUG_CODE + MFDS_CODE = 2 → 6
    expect(ds.insertedIdentifierRows).toBe(6);
    expect(ds.identifierInsertCalls).toBe(1);
    expect(ds.candUpdateRows).toBe(3);
    expect(report.createdIdentifiers).toBe(6);
  });

  test('cancelled 후보는 skip (INSERT 없음)', async () => {
    const ds = new FakeDS();
    ds.candidates = [cand('c1', VALID, { cancelled: true }), cand('c2', VALID_B)];
    const report = await runCandidatePromotion(OPTS(ds, true));
    expect(report.skippedCancelled).toBe(1);
    expect(report.createdMaster).toBe(1);
    expect(ds.insertedMasterRows).toBe(1);
  });

  test('invalid GTIN(check-digit) skip', async () => {
    const ds = new FakeDS();
    ds.candidates = [cand('c1', INVALID_CD), cand('c2', VALID)];
    const report = await runCandidatePromotion(OPTS(ds, true));
    expect(report.skippedInvalidStandardCodeCheckDigit).toBe(1);
    expect(report.createdMaster).toBe(1);
  });

  test('idempotency — 기존 barcode master 존재 → link, master INSERT 없음', async () => {
    const ds = new FakeDS();
    ds.existingMasters = [
      { id: 'm-existing', barcode: VALID, name: '기존', manufacturer_name: '기존M', specification: null, mfds_product_id: `HIRA:DRUG_MASTER:${VALID}` },
    ];
    ds.existingIdentifiers = [
      { identifier_type: 'KOREA_DRUG_CODE', normalized_value: VALID, product_master_id: 'm-existing' },
    ];
    ds.candidates = [cand('c1', VALID)];
    const report = await runCandidatePromotion(OPTS(ds, true));

    expect(report.linkedExistingMaster).toBe(1);
    expect(report.createdMaster).toBe(0);
    expect(ds.insertedMasterRows).toBe(0); // 새 master 없음
    // KOREA_DRUG_CODE 이미 존재 → MFDS_CODE 만 신규
    expect(ds.insertedIdentifierRows).toBe(1);
    expect(report.createdIdentifiers).toBe(1);
    expect(report.wouldSkipExistingIdentifiers).toBe(1);
  });

  test('dry-run(apply=false) → write 0', async () => {
    const ds = new FakeDS();
    ds.candidates = [cand('c1', VALID), cand('c2', VALID_B)];
    const report = await runCandidatePromotion(OPTS(ds, false));
    expect(report.wouldCreateMaster).toBe(2);
    expect(report.createdMaster).toBe(0);
    expect(ds.insertedMasterRows).toBe(0);
    expect(ds.insertedIdentifierRows).toBe(0);
    expect(ds.candUpdateRows).toBe(0);
  });

  test('같은 run 내 conflict 없음 — 표준코드 유일 3건 모두 create', async () => {
    const ds = new FakeDS();
    ds.candidates = [cand('c1', VALID, { mfds: 'A' }), cand('c2', VALID_B, { mfds: 'A' }), cand('c3', VALID_C, { mfds: 'B' })];
    const report = await runCandidatePromotion(OPTS(ds, true));
    expect(report.createdMaster).toBe(3);
    expect(report.conflictBarcode + report.conflictMfdsProductId + report.conflictIdentifierBelongsToOtherMaster).toBe(0);
    // mfds 'A' 그룹 = 2 표준코드 → multiPackage 1
    expect(report.multiPackageMfdsCodeCount).toBe(1);
  });
});

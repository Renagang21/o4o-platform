/**
 * Unit tests — WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1
 *
 * 실 DB 불필요. JSONL 파싱(.item 언랩) / ITEM_SEQ→MFDS_CODE 매핑 /
 * candidate_name 255자 truncate + overlength flag / 필수 결측 flag /
 * EE/UD/NB 원문 보존(파싱 안 함) / offline dry-run 예측 검증.
 */

import {
  parseQuasiDrugPermitJsonl,
  parseQuasiDrugLine,
} from '../quasi-drug-permit-jsonl.parser.js';
import {
  mapQuasiDrugPermitItem,
  CANDIDATE_NAME_MAX_LEN,
} from '../quasi-drug-permit-candidate.mapper.js';
import { QuasiDrugPermitCandidateImportService } from '../quasi-drug-permit-candidate-import.service.js';

// fetch 메타로 감싼 정상 line (효능/용법/주의 XML + CDATA 존재)
const LINE_ACTIVE = JSON.stringify({
  sourceDataset: 'MFDS_QUASI_DRUG_PERMIT',
  fetchedAt: '2026-07-02T06:46:46.600Z',
  pageNo: 1,
  rowIndex: 0,
  item: {
    ITEM_SEQ: '196000044 ', // trailing space → trim 검증
    ITEM_NAME: '비타민은단',
    ENTP_NAME: '고려은단(주)',
    CLASS_NO_NAME: '[41100]구중청량제(내복용제 및 양치제)',
    CANCEL_CODE_NAME: '정상',
    CANCEL_DATE: null,
    PERMIT_KIND_CODE_NM: '허가',
    MAIN_INGR: '용뇌,진피가루',
    ADIT_INGR: '은박,옥수수전분',
    EE_DOC_DATA: '<DOC title="효능효과" type="EE"><![CDATA[효능]]></DOC>',
    UD_DOC_DATA: '<DOC title="용법용량" type="UD">복용</DOC>',
    NB_DOC_DATA: '<DOC title="사용상주의사항" type="NB">주의</DOC>',
    ENTP_NO: '0546',
    BIZRNO: '1348504437',
  },
});

// 폐업(비정상) + 신고 + 설명 전무
const LINE_CANCELLED = JSON.stringify({
  sourceDataset: 'MFDS_QUASI_DRUG_PERMIT',
  fetchedAt: '2026-07-02T06:46:46.600Z',
  item: {
    ITEM_SEQ: '199900001',
    ITEM_NAME: '폐업제품',
    ENTP_NAME: '(주)폐업사',
    CLASS_NO_NAME: '[32200]보건용 마스크',
    CANCEL_CODE_NAME: '폐업',
    CANCEL_DATE: '20230810',
    PERMIT_KIND_CODE_NM: '신고',
    EE_DOC_DATA: null,
    UD_DOC_DATA: null,
    NB_DOC_DATA: null,
  },
});

describe('quasi-drug-permit-jsonl.parser', () => {
  it('JSONL 1줄을 파싱하고 fetch 메타 래핑(.item)을 언랩한다', () => {
    const row = parseQuasiDrugLine(LINE_ACTIVE, 1);
    expect(row.sourceDataset).toBe('MFDS_QUASI_DRUG_PERMIT');
    expect(row.fetchedAt).toBe('2026-07-02T06:46:46.600Z');
    expect(row.pageNo).toBe(1);
    expect(row.item.ITEM_SEQ).toBe('196000044 ');
    expect(row.item.ITEM_NAME).toBe('비타민은단');
  });

  it('빈 줄은 blankLines 로 세고 rows 에 포함하지 않는다', () => {
    const res = parseQuasiDrugPermitJsonl([LINE_ACTIVE, '', '   ', LINE_CANCELLED].join('\n'));
    expect(res.rows).toHaveLength(2);
    expect(res.blankLines).toBe(2);
    expect(res.errors).toHaveLength(0);
  });

  it('JSON 파싱 실패 line 은 throw 없이 errors[] 에 누적한다 (무음 손실 금지)', () => {
    const res = parseQuasiDrugPermitJsonl([LINE_ACTIVE, '{not-json', LINE_CANCELLED].join('\n'));
    expect(res.rows).toHaveLength(2);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].reason).toContain('JSON_PARSE_ERROR');
    expect(res.errors[0].lineNumber).toBe(2);
  });

  it('평면 item(래퍼 없음)도 item 으로 인식한다', () => {
    const flat = JSON.stringify({ ITEM_SEQ: '1', ITEM_NAME: 'X' });
    const row = parseQuasiDrugLine(flat, 1);
    expect(row.item.ITEM_SEQ).toBe('1');
    expect(row.sourceDataset).toBeNull();
  });
});

describe('quasi-drug-permit-candidate.mapper', () => {
  function map(line: string) {
    const row = parseQuasiDrugLine(line, 1);
    return mapQuasiDrugPermitItem(row.item, { serviceKey: null, collectedAt: row.fetchedAt });
  }

  it('ITEM_SEQ(trim) → MFDS_CODE 식별자 + external_api / MFDS_QUASI_DRUG_PERMIT 라벨', () => {
    const m = map(LINE_ACTIVE);
    expect(m.candidateInput.sourceType).toBe('external_api');
    expect(m.candidateInput.sourceLabel).toBe('MFDS_QUASI_DRUG_PERMIT');
    expect(m.candidateInput.identifierType).toBe('MFDS_CODE');
    expect(m.candidateInput.identifierValue).toBe('196000044'); // trailing space trim
    expect(m.candidateInput.normalizedIdentifierValue).toBe('196000044');
  });

  it('ITEM_NAME→candidateName / ENTP_NAME→manufacturer / CLASS_NO_NAME→category, spec/unit/image=null', () => {
    const m = map(LINE_ACTIVE);
    expect(m.candidateInput.candidateName).toBe('비타민은단');
    expect(m.candidateInput.candidateManufacturer).toBe('고려은단(주)');
    expect(m.candidateInput.candidateCategory).toBe('[41100]구중청량제(내복용제 및 양치제)');
    expect(m.candidateInput.candidateSpec).toBeNull();
    expect(m.candidateInput.candidateUnit).toBeNull();
    expect(m.candidateInput.candidateImageUrl).toBeNull();
  });

  it('candidate_name 은 255자로 truncate 되고 CANDIDATE_NAME_OVERLENGTH flag + 원문 보존', () => {
    const longName = 'A'.repeat(1840);
    const m = mapQuasiDrugPermitItem({ ITEM_SEQ: '300000001', ITEM_NAME: longName, ENTP_NAME: 'E', CLASS_NO_NAME: 'C' });
    expect(m.candidateInput.candidateName?.length).toBe(CANDIDATE_NAME_MAX_LEN);
    expect(m.nameTruncated).toBe(true);
    expect(m.reviewFlags).toContain('CANDIDATE_NAME_OVERLENGTH');
    // 원문은 rawPayload.source 에 무손실 보존
    const source = m.candidateInput.rawPayload.source as Record<string, unknown>;
    expect(source.ITEM_NAME).toBe(longName);
    expect(m.candidateInput.rawPayload.candidateNameOriginalLength).toBe(1840);
  });

  it('255자 이하 이름은 truncate 안 함 (flag 없음)', () => {
    const m = map(LINE_ACTIVE);
    expect(m.nameTruncated).toBe(false);
    expect(m.reviewFlags).not.toContain('CANDIDATE_NAME_OVERLENGTH');
  });

  it('정상 상태는 isCancelled=false, NOT_ACTIVE_PERMIT flag 없음', () => {
    const m = map(LINE_ACTIVE);
    expect(m.isCancelled).toBe(false);
    expect(m.reviewFlags).not.toContain('NOT_ACTIVE_PERMIT');
  });

  it('폐업 상태는 isCancelled=true + NOT_ACTIVE_PERMIT flag / 신고는 NOTIFICATION_ITEM', () => {
    const m = map(LINE_CANCELLED);
    expect(m.isCancelled).toBe(true);
    expect(m.reviewFlags).toContain('NOT_ACTIVE_PERMIT');
    expect(m.reviewFlags).toContain('NOTIFICATION_ITEM');
  });

  it('EE/UD/NB 는 파싱하지 않고 officialRegulatoryText 원문 보존 + CDATA/XML flag', () => {
    const m = map(LINE_ACTIVE);
    const ort = m.candidateInput.rawPayload.officialRegulatoryText as Record<string, unknown>;
    expect(ort.efficacyXml).toContain('<DOC');
    expect(ort.efficacyXml).toContain('CDATA');
    expect(ort.dosageXml).toContain('용법용량');
    expect((ort.ingredients as Record<string, unknown>).main).toBe('용뇌,진피가루');
    expect(m.reviewFlags).toContain('XML_PARSE_REQUIRED');
    expect(m.reviewFlags).toContain('CDATA_PRESENT');
    expect(m.hasOfficialText).toBe(true);
  });

  it('EE/UD/NB 전무 → OFFICIAL_TEXT_MISSING, XML_PARSE_REQUIRED 없음', () => {
    const m = map(LINE_CANCELLED);
    expect(m.reviewFlags).toContain('OFFICIAL_TEXT_MISSING');
    expect(m.reviewFlags).not.toContain('XML_PARSE_REQUIRED');
    expect(m.hasOfficialText).toBe(false);
  });

  it('barcode/SKU 축 부재 → 전건 SKU_IDENTIFIER_MISSING flag', () => {
    expect(map(LINE_ACTIVE).reviewFlags).toContain('SKU_IDENTIFIER_MISSING');
    expect(map(LINE_CANCELLED).reviewFlags).toContain('SKU_IDENTIFIER_MISSING');
  });

  it('필수 결측(ITEM_SEQ/ITEM_NAME/ENTP_NAME/CLASS_NO_NAME) → 각 MISSING flag + identifier 미부착', () => {
    const m = mapQuasiDrugPermitItem({ ITEM_SEQ: null, ITEM_NAME: null, ENTP_NAME: null, CLASS_NO_NAME: null });
    expect(m.reviewFlags).toContain('ITEM_SEQ_MISSING');
    expect(m.reviewFlags).toContain('ITEM_NAME_MISSING');
    expect(m.reviewFlags).toContain('MANUFACTURER_MISSING');
    expect(m.reviewFlags).toContain('CATEGORY_MISSING');
    expect(m.candidateInput.identifierType).toBeNull();
  });

  it('rawPayload 에 원본 item 전체 + 소스 메타를 무손실 보존한다', () => {
    const m = map(LINE_ACTIVE);
    const rp = m.candidateInput.rawPayload;
    expect(rp.sourceAgency).toBe('MFDS');
    expect(rp.sourceDatasetId).toBe('15095679');
    expect(rp.sourceKind).toBe('quasi_drug_permit');
    expect(rp.sourceRowKey).toBe('ITEM_SEQ');
    expect(rp.regulatoryType).toBe('QUASI_DRUG');
    expect((rp.status as Record<string, unknown>).cancelCodeName).toBe('정상');
    const source = rp.source as Record<string, unknown>;
    expect(source.BIZRNO).toBe('1348504437');
  });

  it('dedupKey = external_api + MFDS_CODE + trim(ITEM_SEQ) + quasi_drug_permit', () => {
    const m = map(LINE_ACTIVE);
    expect(m.dedupKey).toEqual({
      sourceType: 'external_api',
      identifierType: 'MFDS_CODE',
      normalizedIdentifierValue: '196000044',
      sourceKind: 'quasi_drug_permit',
    });
  });
});

describe('QuasiDrugPermitCandidateImportService (dry-run, offline)', () => {
  const base = { sourceFileName: 'mfds-quasi-drug-permit-raw.jsonl', apply: false, dataSource: null };

  it('offline dry-run 이 DB 없이 파싱+매핑+예상건수를 낸다', async () => {
    const svc = new QuasiDrugPermitCandidateImportService();
    const report = await svc.run({ ...base, text: [LINE_ACTIVE, LINE_CANCELLED].join('\n') });
    expect(report.mode).toBe('dry-run');
    expect(report.dedupChecked).toBe(false);
    expect(report.processedRows).toBe(2);
    expect(report.counts.createdExpected).toBe(2);
    expect(report.counts.skipped).toBe(0);
    expect(report.counts.errored).toBe(0);
    expect(report.classification.active).toBe(1);
    expect(report.classification.cancelled).toBe(1);
    expect(report.officialTextPresentCount).toBe(1);
    expect(report.officialTextMissingCount).toBe(1);
    expect(report.notes.length).toBeGreaterThan(0);
    expect(report.sampleMappedRows.length).toBe(2);
  });

  it('candidate_name 255자 초과 건수를 리포트한다', async () => {
    const svc = new QuasiDrugPermitCandidateImportService();
    const longLine = JSON.stringify({ item: { ITEM_SEQ: '300000002', ITEM_NAME: 'B'.repeat(300), ENTP_NAME: 'E', CLASS_NO_NAME: 'C' } });
    const report = await svc.run({ ...base, text: longLine });
    expect(report.candidateNameTruncatedCount).toBe(1);
    expect(report.reviewFlagCounts.CANDIDATE_NAME_OVERLENGTH).toBe(1);
  });

  it('동일 파일 내 중복(ITEM_SEQ)은 skipped 로 무한중복 방지', async () => {
    const svc = new QuasiDrugPermitCandidateImportService();
    const report = await svc.run({ ...base, text: [LINE_ACTIVE, LINE_ACTIVE].join('\n') });
    expect(report.counts.createdExpected).toBe(1);
    expect(report.counts.skipped).toBe(1);
  });

  it('ITEM_SEQ 결측 행은 skipped (식별 불가)', async () => {
    const svc = new QuasiDrugPermitCandidateImportService();
    const noSeq = JSON.stringify({ item: { ITEM_NAME: 'X', ENTP_NAME: 'Y', CLASS_NO_NAME: 'Z' } });
    const report = await svc.run({ ...base, text: noSeq });
    expect(report.counts.skipped).toBe(1);
    expect(report.counts.createdExpected).toBe(0);
    expect(report.reviewFlagCounts.ITEM_SEQ_MISSING).toBe(1);
  });

  it('--apply 는 초기화된 DataSource 없으면 거부한다', async () => {
    const svc = new QuasiDrugPermitCandidateImportService();
    await expect(svc.run({ ...base, apply: true, text: LINE_ACTIVE })).rejects.toThrow(
      'APPLY_REQUIRES_INITIALIZED_DATASOURCE',
    );
  });

  it('limit 가 처리 행 수를 제한한다 (샘플 실증)', async () => {
    const svc = new QuasiDrugPermitCandidateImportService();
    const report = await svc.run({ ...base, limit: 1, text: [LINE_ACTIVE, LINE_CANCELLED].join('\n') });
    expect(report.processedRows).toBe(1);
  });
});

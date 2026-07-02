/**
 * Unit tests — WO-O4O-EASY-DRUG-INFO-PRODUCT-CANDIDATE-IMPORT-V1
 *
 * 실 DB 불필요. JSONL 파싱 / itemSeq→MFDS_CODE 매핑 / 이미지·공식텍스트 누락 flag /
 * rawPayload 원문 보존 / offline dry-run 예측 검증.
 */

import {
  parseEasyDrugInfoJsonl,
  parseEasyDrugLine,
} from '../easy-drug-info-jsonl.parser.js';
import { mapEasyDrugInfoItem } from '../easy-drug-info-candidate.mapper.js';
import { EasyDrugInfoCandidateImportService } from '../easy-drug-info-candidate-import.service.js';

// fetch 메타로 감싼 정상 line (이미지 + 공식텍스트 존재)
const LINE_FULL = JSON.stringify({
  sourceDataset: 'MFDS_EASY_DRUG_INFO',
  fetchedAt: '2026-07-02T07:01:49.456Z',
  pageNo: 1,
  rowIndex: 0,
  item: {
    itemSeq: '195900043 ', // trailing space → trim 검증
    itemName: '아네모정',
    entpName: '(주)유한양행',
    itemImage: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/1Pvn3im1f27',
    efcyQesitm: '소화불량, 식욕감퇴',
    useMethodQesitm: '1일 3회 식후 복용',
    atpnWarnQesitm: null,
    atpnQesitm: '임부 주의',
    intrcQesitm: null,
    seQesitm: null,
    depositMethodQesitm: '실온보관',
    openDe: '20210129',
    updateDe: '2024-05-09',
    bizrno: '1108100102',
  },
});

// 이미지 없음 + 공식텍스트 없음 + updateDe 없음
const LINE_NO_IMAGE = JSON.stringify({
  sourceDataset: 'MFDS_EASY_DRUG_INFO',
  fetchedAt: '2026-07-02T07:01:49.456Z',
  item: {
    itemSeq: '199905709',
    itemName: '대효갈근',
    entpName: '(유)대효제약',
    itemImage: null,
    efcyQesitm: null,
    useMethodQesitm: null,
    atpnWarnQesitm: null,
    atpnQesitm: null,
    intrcQesitm: null,
    seQesitm: null,
    depositMethodQesitm: null,
    updateDe: null,
  },
});

describe('easy-drug-info-jsonl.parser', () => {
  it('JSONL 1줄을 파싱하고 fetch 메타 래핑을 언랩한다', () => {
    const row = parseEasyDrugLine(LINE_FULL, 1);
    expect(row.sourceDataset).toBe('MFDS_EASY_DRUG_INFO');
    expect(row.fetchedAt).toBe('2026-07-02T07:01:49.456Z');
    expect(row.pageNo).toBe(1);
    expect(row.item.itemSeq).toBe('195900043 ');
    expect(row.item.itemName).toBe('아네모정');
  });

  it('빈 줄은 blankLines 로 세고 rows 에 포함하지 않는다', () => {
    const res = parseEasyDrugInfoJsonl([LINE_FULL, '', '   ', LINE_NO_IMAGE].join('\n'));
    expect(res.rows).toHaveLength(2);
    expect(res.blankLines).toBe(2);
    expect(res.errors).toHaveLength(0);
  });

  it('JSON 파싱 실패 line 은 throw 없이 errors[] 에 누적한다 (무음 손실 금지)', () => {
    const res = parseEasyDrugInfoJsonl([LINE_FULL, '{not-json', LINE_NO_IMAGE].join('\n'));
    expect(res.rows).toHaveLength(2);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].reason).toContain('JSON_PARSE_ERROR');
    expect(res.errors[0].lineNumber).toBe(2);
  });

  it('평면 item(래퍼 없음)도 item 으로 인식한다', () => {
    const flat = JSON.stringify({ itemSeq: '1', itemName: 'X' });
    const row = parseEasyDrugLine(flat, 1);
    expect(row.item.itemSeq).toBe('1');
    expect(row.sourceDataset).toBeNull();
  });
});

describe('easy-drug-info-candidate.mapper', () => {
  function map(line: string) {
    const row = parseEasyDrugLine(line, 1);
    return mapEasyDrugInfoItem(row.item, { serviceKey: null, collectedAt: row.fetchedAt });
  }

  it('itemSeq(trim) → MFDS_CODE 식별자 + external_api / MFDS_EASY_DRUG_INFO 라벨', () => {
    const m = map(LINE_FULL);
    expect(m.candidateInput.sourceType).toBe('external_api');
    expect(m.candidateInput.sourceLabel).toBe('MFDS_EASY_DRUG_INFO');
    expect(m.candidateInput.identifierType).toBe('MFDS_CODE');
    expect(m.candidateInput.identifierValue).toBe('195900043'); // trailing space trim
    expect(m.candidateInput.normalizedIdentifierValue).toBe('195900043');
  });

  it('itemName→candidateName / entpName→candidateManufacturer / itemImage→candidateImageUrl', () => {
    const m = map(LINE_FULL);
    expect(m.candidateInput.candidateName).toBe('아네모정');
    expect(m.candidateInput.candidateManufacturer).toBe('(주)유한양행');
    expect(m.candidateInput.candidateImageUrl).toBe(
      'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/1Pvn3im1f27',
    );
    expect(m.candidateInput.candidateCategory).toBe('의약품개요정보(e약은요)');
    expect(m.candidateInput.candidateSpec).toBeNull();
    expect(m.candidateInput.candidateUnit).toBeNull();
  });

  it('itemImage 누락 → IMAGE_MISSING flag', () => {
    expect(map(LINE_NO_IMAGE).reviewFlags).toContain('IMAGE_MISSING');
    expect(map(LINE_FULL).reviewFlags).not.toContain('IMAGE_MISSING');
  });

  it('공식 설명 원문 전무 → OFFICIAL_TEXT_MISSING flag', () => {
    expect(map(LINE_NO_IMAGE).reviewFlags).toContain('OFFICIAL_TEXT_MISSING');
    expect(map(LINE_FULL).reviewFlags).not.toContain('OFFICIAL_TEXT_MISSING');
  });

  it('updateDe 누락 → UPDATE_DATE_MISSING flag', () => {
    expect(map(LINE_NO_IMAGE).reviewFlags).toContain('UPDATE_DATE_MISSING');
    expect(map(LINE_FULL).reviewFlags).not.toContain('UPDATE_DATE_MISSING');
  });

  it('효능/용법/주의 원문을 rawPayload.officialConsumerText 에 보존한다 (상품 기본정보와 분리)', () => {
    const m = map(LINE_FULL);
    const oct = m.candidateInput.rawPayload.officialConsumerText as Record<string, string | null>;
    expect(oct.efficacy).toBe('소화불량, 식욕감퇴');
    expect(oct.usage).toBe('1일 3회 식후 복용');
    expect(oct.caution).toBe('임부 주의');
    expect(oct.storage).toBe('실온보관');
    expect(oct.warning).toBeNull();
  });

  it('rawPayload 에 원본 item 전체 + 소스 메타를 무손실 보존한다', () => {
    const m = map(LINE_FULL);
    const rp = m.candidateInput.rawPayload;
    expect(rp.sourceAgency).toBe('MFDS');
    expect(rp.sourceDatasetId).toBe('15075057');
    expect(rp.sourceKind).toBe('easy_drug_info');
    expect(rp.sourceRowKey).toBe('itemSeq');
    expect(rp.collectedAt).toBe('2026-07-02T07:01:49.456Z');
    const source = rp.source as Record<string, unknown>;
    expect(source.bizrno).toBe('1108100102');
    expect(source.openDe).toBe('20210129');
  });

  it('dedupKey = external_api + MFDS_CODE + trim(itemSeq) + easy_drug_info', () => {
    const m = map(LINE_FULL);
    expect(m.dedupKey).toEqual({
      sourceType: 'external_api',
      identifierType: 'MFDS_CODE',
      normalizedIdentifierValue: '195900043',
      sourceKind: 'easy_drug_info',
    });
  });
});

describe('EasyDrugInfoCandidateImportService (dry-run, offline)', () => {
  const base = { sourceFileName: 'mfds-easy-drug-info-raw.jsonl', apply: false, dataSource: null };

  it('offline dry-run 이 DB 없이 파싱+매핑+예상건수를 낸다', async () => {
    const svc = new EasyDrugInfoCandidateImportService();
    const report = await svc.run({ ...base, text: [LINE_FULL, LINE_NO_IMAGE].join('\n') });
    expect(report.mode).toBe('dry-run');
    expect(report.dedupChecked).toBe(false);
    expect(report.processedRows).toBe(2);
    expect(report.counts.createdExpected).toBe(2);
    expect(report.imagePresentCount).toBe(1);
    expect(report.imageMissingCount).toBe(1);
    expect(report.officialTextPresentCount).toBe(1);
    expect(report.officialTextMissingCount).toBe(1);
    expect(report.notes.length).toBeGreaterThan(0);
    expect(report.sampleMappedRows.length).toBe(2);
  });

  it('동일 파일 내 중복(itemSeq)은 skipped 로 무한중복 방지', async () => {
    const svc = new EasyDrugInfoCandidateImportService();
    const report = await svc.run({ ...base, text: [LINE_FULL, LINE_FULL].join('\n') });
    expect(report.counts.createdExpected).toBe(1);
    expect(report.counts.skipped).toBe(1);
  });

  it('itemSeq 결측 행은 skipped (식별 불가)', async () => {
    const svc = new EasyDrugInfoCandidateImportService();
    const noSeq = JSON.stringify({ item: { itemName: 'X', entpName: 'Y' } });
    const report = await svc.run({ ...base, text: noSeq });
    expect(report.counts.skipped).toBe(1);
    expect(report.counts.createdExpected).toBe(0);
    expect(report.reviewFlagCounts.ITEM_SEQ_MISSING).toBe(1);
  });

  it('--apply 는 초기화된 DataSource 없으면 거부한다', async () => {
    const svc = new EasyDrugInfoCandidateImportService();
    await expect(svc.run({ ...base, apply: true, text: LINE_FULL })).rejects.toThrow(
      'APPLY_REQUIRES_INITIALIZED_DATASOURCE',
    );
  });

  it('limit 가 처리 행 수를 제한한다 (샘플 실증)', async () => {
    const svc = new EasyDrugInfoCandidateImportService();
    const report = await svc.run({ ...base, limit: 1, text: [LINE_FULL, LINE_NO_IMAGE].join('\n') });
    expect(report.processedRows).toBe(1);
  });
});

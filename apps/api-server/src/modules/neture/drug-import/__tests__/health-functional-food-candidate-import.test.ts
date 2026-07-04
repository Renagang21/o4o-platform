/**
 * Unit tests — WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1
 *
 * 실 DB 불필요. JSONL 파싱(flatten raw) / STTEMNT_NO→MFDS_STTEMNT_NO 매핑 / PRDUCT trim /
 * optional 결측 flag / candidate_name 방어적 truncate / rawPayload 원문 보존 / offline dry-run 예측.
 */

import {
  parseHealthFunctionalFoodJsonl,
  parseHealthFunctionalFoodLine,
} from '../health-functional-food-jsonl.parser.js';
import {
  mapHealthFunctionalFoodItem,
  CANDIDATE_NAME_MAX_LEN,
} from '../health-functional-food-candidate.mapper.js';
import { HealthFunctionalFoodCandidateImportService } from '../health-functional-food-candidate-import.service.js';

// flatten raw line (HFF 기본 — 래퍼 없음). PRDUCT 선행 공백 → trim 검증.
const LINE_FULL = JSON.stringify({
  ENTRPS: '일동바이오사이언스(주)',
  PRDUCT: ' 11종 혼합유산균',
  STTEMNT_NO: '20140017002183',
  REGIST_DT: '20201027',
  DISTB_PD: '제조일로부터 24개월까지',
  SUNGSANG: '노랑 하양색의 입자성이 있는 분말',
  SRV_USE: '건강기능식품 원료로 사용',
  PRSRV_PD: '냉장조건',
  INTAKE_HINT1: '이상사례 발생 시 섭취를 중단하고 전문가와 상담하십시오.',
  MAIN_FNCTN: '유산균 증식 및 유해균 억제·배변활동 원활에 도움을 줄 수 있음',
  BASE_STANDARD: '프로바이오틱스 수 표시량 이상',
});

// optional(PRSRV_PD/INTAKE_HINT1/MAIN_FNCTN) 결측
const LINE_OPT_MISSING = JSON.stringify({
  ENTRPS: '(주)테스트제약',
  PRDUCT: '홍삼정',
  STTEMNT_NO: '20990099009999',
  REGIST_DT: '20250101',
  PRSRV_PD: null,
  INTAKE_HINT1: '',
  MAIN_FNCTN: null,
});

describe('health-functional-food-jsonl.parser', () => {
  it('flatten JSONL 1줄을 파싱한다 (래퍼 없음 → 최상위가 item)', () => {
    const row = parseHealthFunctionalFoodLine(LINE_FULL, 1);
    expect(row.sourceDataset).toBeNull(); // flatten raw 엔 메타 없음
    expect(row.item.STTEMNT_NO).toBe('20140017002183');
    expect(row.item.PRDUCT).toBe(' 11종 혼합유산균');
  });

  it('fetch 메타 래핑(`{item:{...}}`) 도 언랩한다 (관대)', () => {
    const wrapped = JSON.stringify({ fetchedAt: '2026-07-04T00:00:00Z', item: { STTEMNT_NO: '1', PRDUCT: 'X' } });
    const row = parseHealthFunctionalFoodLine(wrapped, 1);
    expect(row.fetchedAt).toBe('2026-07-04T00:00:00Z');
    expect(row.item.STTEMNT_NO).toBe('1');
  });

  it('빈 줄은 blankLines 로 세고 rows 에 포함하지 않는다', () => {
    const res = parseHealthFunctionalFoodJsonl([LINE_FULL, '', '   ', LINE_OPT_MISSING].join('\n'));
    expect(res.rows).toHaveLength(2);
    expect(res.blankLines).toBe(2);
    expect(res.errors).toHaveLength(0);
  });

  it('JSON 파싱 실패 line 은 throw 없이 errors[] 에 누적한다 (무음 손실 금지)', () => {
    const res = parseHealthFunctionalFoodJsonl([LINE_FULL, '{not-json', LINE_OPT_MISSING].join('\n'));
    expect(res.rows).toHaveLength(2);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].reason).toContain('JSON_PARSE_ERROR');
    expect(res.errors[0].lineNumber).toBe(2);
  });
});

describe('health-functional-food-candidate.mapper', () => {
  function map(line: string) {
    const row = parseHealthFunctionalFoodLine(line, 1);
    return mapHealthFunctionalFoodItem(row.item, { serviceKey: null });
  }

  it('STTEMNT_NO → MFDS_STTEMNT_NO 식별자 + external_api / MFDS_HEALTH_FUNCTIONAL_FOOD 라벨', () => {
    const m = map(LINE_FULL);
    expect(m.candidateInput.sourceType).toBe('external_api');
    expect(m.candidateInput.sourceLabel).toBe('MFDS_HEALTH_FUNCTIONAL_FOOD');
    expect(m.candidateInput.identifierType).toBe('MFDS_STTEMNT_NO');
    expect(m.candidateInput.identifierValue).toBe('20140017002183');
    expect(m.candidateInput.normalizedIdentifierValue).toBe('20140017002183');
  });

  it('PRDUCT 선행공백 trim → candidateName / ENTRPS→manufacturer / category 상수', () => {
    const m = map(LINE_FULL);
    expect(m.candidateInput.candidateName).toBe('11종 혼합유산균'); // 선행 공백 제거
    expect(m.candidateInput.candidateManufacturer).toBe('일동바이오사이언스(주)');
    expect(m.candidateInput.candidateCategory).toBe('HEALTH_FUNCTIONAL_FOOD');
    expect(m.candidateInput.candidateSpec).toBeNull();
    expect(m.candidateInput.candidateUnit).toBeNull();
    expect(m.candidateInput.candidateImageUrl).toBeNull();
  });

  it('optional(PRSRV_PD/INTAKE_HINT1/MAIN_FNCTN) 결측 → 각 flag', () => {
    const flags = map(LINE_OPT_MISSING).reviewFlags;
    expect(flags).toContain('PRESERVATION_MISSING');
    expect(flags).toContain('INTAKE_HINT_MISSING');
    expect(flags).toContain('MAIN_FUNCTION_MISSING');
    const full = map(LINE_FULL).reviewFlags;
    expect(full).not.toContain('PRESERVATION_MISSING');
    expect(full).not.toContain('INTAKE_HINT_MISSING');
    expect(full).not.toContain('MAIN_FUNCTION_MISSING');
  });

  it('barcode 축 부재 → 전건 SKU_IDENTIFIER_MISSING flag (승격 보류 근거)', () => {
    expect(map(LINE_FULL).reviewFlags).toContain('SKU_IDENTIFIER_MISSING');
  });

  it('candidate_name 255자 초과 → 방어적 truncate + CANDIDATE_NAME_OVERLENGTH flag (원문 보존)', () => {
    const longName = 'ㄱ'.repeat(300);
    const line = JSON.stringify({ ENTRPS: 'E', PRDUCT: longName, STTEMNT_NO: '1' });
    const m = mapHealthFunctionalFoodItem(JSON.parse(line));
    expect(m.nameTruncated).toBe(true);
    expect(m.candidateInput.candidateName!.length).toBe(CANDIDATE_NAME_MAX_LEN);
    expect(m.reviewFlags).toContain('CANDIDATE_NAME_OVERLENGTH');
    // 원문은 rawPayload.source.PRDUCT 에 무손실 보존
    expect((m.candidateInput.rawPayload.source as Record<string, unknown>).PRDUCT).toBe(longName);
    expect(m.candidateInput.rawPayload.candidateNameOriginalLength).toBe(300);
  });

  it('MAIN_FNCTN 는 rawPayload.mainFunction 에 보존한다 (상품 기본정보와 분리)', () => {
    const m = map(LINE_FULL);
    expect(m.candidateInput.rawPayload.mainFunction).toBe(
      '유산균 증식 및 유해균 억제·배변활동 원활에 도움을 줄 수 있음',
    );
  });

  it('rawPayload 에 원본 item 전체 + 소스 메타를 무손실 보존한다', () => {
    const m = map(LINE_FULL);
    const rp = m.candidateInput.rawPayload;
    expect(rp.sourceAgency).toBe('MFDS');
    expect(rp.sourceDatasetId).toBe('15056760');
    expect(rp.sourceKind).toBe('health_functional_food');
    expect(rp.sourceRowKey).toBe('STTEMNT_NO');
    expect(rp.regulatoryType).toBe('HEALTH_FUNCTIONAL');
    const source = rp.source as Record<string, unknown>;
    expect(source.BASE_STANDARD).toBe('프로바이오틱스 수 표시량 이상');
    expect(source.REGIST_DT).toBe('20201027');
  });

  it('dedupKey = external_api + MFDS_STTEMNT_NO + trim(STTEMNT_NO) + health_functional_food', () => {
    const m = map(LINE_FULL);
    expect(m.dedupKey).toEqual({
      sourceType: 'external_api',
      identifierType: 'MFDS_STTEMNT_NO',
      normalizedIdentifierValue: '20140017002183',
      sourceKind: 'health_functional_food',
    });
  });

  it('STTEMNT_NO 결측 → 식별자 미부착(null) + STTEMNT_NO_MISSING flag', () => {
    const line = JSON.stringify({ ENTRPS: 'E', PRDUCT: 'P' });
    const m = mapHealthFunctionalFoodItem(JSON.parse(line));
    expect(m.candidateInput.identifierType).toBeNull();
    expect(m.candidateInput.normalizedIdentifierValue).toBeNull();
    expect(m.reviewFlags).toContain('STTEMNT_NO_MISSING');
  });
});

describe('HealthFunctionalFoodCandidateImportService (dry-run, offline)', () => {
  const base = { sourceFileName: 'mfds-health-functional-food-info-raw.jsonl', apply: false, dataSource: null };

  it('offline dry-run 이 DB 없이 파싱+매핑+예상건수를 낸다', async () => {
    const svc = new HealthFunctionalFoodCandidateImportService();
    const report = await svc.run({ ...base, text: [LINE_FULL, LINE_OPT_MISSING].join('\n') });
    expect(report.mode).toBe('dry-run');
    expect(report.dedupChecked).toBe(false);
    expect(report.processedRows).toBe(2);
    expect(report.counts.createdExpected).toBe(2);
    expect(report.counts.skipped).toBe(0);
    expect(report.counts.errored).toBe(0);
    expect(report.reviewFlagCounts.PRESERVATION_MISSING).toBe(1);
    expect(report.reviewFlagCounts.INTAKE_HINT_MISSING).toBe(1);
    expect(report.reviewFlagCounts.SKU_IDENTIFIER_MISSING).toBe(2);
    expect(report.notes.length).toBeGreaterThan(0);
    expect(report.sampleMappedRows.length).toBe(2);
  });

  it('동일 파일 내 중복(STTEMNT_NO)은 skipped 로 무한중복 방지', async () => {
    const svc = new HealthFunctionalFoodCandidateImportService();
    const report = await svc.run({ ...base, text: [LINE_FULL, LINE_FULL].join('\n') });
    expect(report.counts.createdExpected).toBe(1);
    expect(report.counts.skipped).toBe(1);
  });

  it('STTEMNT_NO 결측 행은 skipped (식별 불가)', async () => {
    const svc = new HealthFunctionalFoodCandidateImportService();
    const noId = JSON.stringify({ ENTRPS: 'E', PRDUCT: 'P' });
    const report = await svc.run({ ...base, text: noId });
    expect(report.counts.skipped).toBe(1);
    expect(report.counts.createdExpected).toBe(0);
    expect(report.reviewFlagCounts.STTEMNT_NO_MISSING).toBe(1);
  });

  it('candidate_name 255 초과 방어 로직이 리포트 nameTruncatedCount 에 집계된다', async () => {
    const svc = new HealthFunctionalFoodCandidateImportService();
    const longLine = JSON.stringify({ ENTRPS: 'E', PRDUCT: 'ㄱ'.repeat(300), STTEMNT_NO: '77' });
    const report = await svc.run({ ...base, text: longLine });
    expect(report.nameTruncatedCount).toBe(1);
    expect(report.reviewFlagCounts.CANDIDATE_NAME_OVERLENGTH).toBe(1);
  });

  it('--apply 는 초기화된 DataSource 없으면 거부한다 (DB write 0 보장)', async () => {
    const svc = new HealthFunctionalFoodCandidateImportService();
    await expect(svc.run({ ...base, apply: true, text: LINE_FULL })).rejects.toThrow(
      'APPLY_REQUIRES_INITIALIZED_DATASOURCE',
    );
  });

  it('limit 가 처리 행 수를 제한한다 (샘플 실증)', async () => {
    const svc = new HealthFunctionalFoodCandidateImportService();
    const report = await svc.run({ ...base, limit: 1, text: [LINE_FULL, LINE_OPT_MISSING].join('\n') });
    expect(report.processedRows).toBe(1);
  });
});

/**
 * Unit tests — WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1
 *
 * 실 DB 불필요. CSV 파서 / CP949 처리 / 매핑 정책 / dry-run / 중복 idempotency 검증.
 */

import iconv from 'iconv-lite';
import { parseDrugMasterCsv } from '../drug-master-csv.parser.js';
import { mapDrugMasterRow, DRUG_MASTER_HEADERS } from '../drug-master-row.mapper.js';
import { DrugCandidateImportService } from '../drug-candidate-import.service.js';

const HEADER = DRUG_MASTER_HEADERS.join(',');

// 약가마스터 표준 22컬럼 한 행 생성 헬퍼
function row(cols: Partial<Record<(typeof DRUG_MASTER_HEADERS)[number], string>>): string {
  return DRUG_MASTER_HEADERS.map((h) => cols[h] ?? '').join(',');
}

// active 일반 행 (표준코드 13자리, 포장형태 있음)
const ROW_ACTIVE = row({
  한글상품명: '레스타시스점안액0.05%',
  업체명: '(유)삼일엘러간',
  약품규격: '0.4밀리리터',
  제품총수량: '30',
  제형구분: '점안액',
  포장형태: '튜브',
  품목기준코드: '200510968 ',
  품목허가일자: '2005-01-01',
  전문일반구분: '전문',
  대표코드: '8806920000500',
  표준코드: '8806920000531 ', // trailing space → trim 검증
  '국제표준코드(ATC코드)': 'S01XA18',
});

// cancelled 행 (취소일자 존재) + 포장형태 결측
const ROW_CANCELLED = row({
  한글상품명: '대효갈근',
  업체명: '(유)대효제약',
  약품규격: '없음',
  제품총수량: '0',
  품목기준코드: '199905709',
  표준코드: '8800628000107',
  비고: '"한약재, 갈근"', // 따옴표+쉼표 안전 파서 검증 (raw 문자열에 큰따옴표 포함)
  취소일자: '2020-05-01',
});

// 동일 품목기준코드, 다른 업체 (multi-manufacturer)
const ROW_MULTI_MFR = row({
  한글상품명: '레스타시스점안액0.05%',
  업체명: '한국엘러간(주)',
  약품규격: '0.4밀리리터',
  제품총수량: '30',
  포장형태: '튜브',
  품목기준코드: '200510968',
  표준코드: '8806920000999',
});

// 표준코드 형식 이상 (13자리 아님)
const ROW_BAD_CODE = row({
  한글상품명: '형식이상상품',
  업체명: '(주)테스트',
  품목기준코드: '111111111',
  표준코드: 'ABC123', // 비-13자리
  포장형태: '병',
});

function utf8Csv(rows: string[]): Buffer {
  return Buffer.from([HEADER, ...rows].join('\n'), 'utf-8');
}
function cp949Csv(rows: string[]): Buffer {
  return iconv.encode([HEADER, ...rows].join('\n'), 'cp949');
}

describe('drug-master-csv.parser', () => {
  it('따옴표 안의 쉼표를 단일 필드로 보존한다 (단순 split 금지)', () => {
    const res = parseDrugMasterCsv(utf8Csv([ROW_CANCELLED]), 'utf-8');
    expect(res.headerMatches).toBe(true);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].record['비고']).toBe('한약재, 갈근');
  });

  it('CP949 인코딩 버퍼를 UTF-8 로 무손실 디코드한다', () => {
    const res = parseDrugMasterCsv(cp949Csv([ROW_ACTIVE]), 'cp949');
    expect(res.encodingUsed).toBe('cp949');
    expect(res.rows[0].record['한글상품명']).toBe('레스타시스점안액0.05%');
    expect(res.rows[0].record['업체명']).toBe('(유)삼일엘러간');
  });

  it('encoding=auto 가 UTF-8 BOM / CP949 를 판정한다', () => {
    const utf8 = parseDrugMasterCsv(utf8Csv([ROW_ACTIVE]), 'auto');
    expect(utf8.encodingUsed).toBe('utf-8');
    const cp = parseDrugMasterCsv(cp949Csv([ROW_ACTIVE]), 'auto');
    expect(cp.encodingUsed).toBe('cp949');
  });

  it('헤더가 약가마스터 형식이면 headerMatches=true', () => {
    const res = parseDrugMasterCsv(utf8Csv([ROW_ACTIVE]), 'utf-8');
    expect(res.headerMatches).toBe(true);
    expect(res.header).toHaveLength(22);
  });

  it('컬럼 수가 다른 행의 rawColumnCount 를 보고한다', () => {
    const short = HEADER + '\n' + 'a,b,c'; // 3컬럼
    const res = parseDrugMasterCsv(Buffer.from(short, 'utf-8'), 'utf-8');
    expect(res.rows[0].rawColumnCount).toBe(3);
  });
});

describe('drug-master-row.mapper', () => {
  const opts = { sourceFileName: '약가마스터_20251031.csv', sourceBaseDate: '2025-10-31', rowNumber: 1 };

  function mapped(rowStr: string, rowNumber = 1) {
    const res = parseDrugMasterCsv(utf8Csv([rowStr]), 'utf-8');
    const r = res.rows[0];
    return mapDrugMasterRow(r.record, r.rawColumnCount, { ...opts, rowNumber });
  }

  it('표준코드 trailing space 를 trim 하고 KOREA_DRUG_CODE 후보로 부착한다', () => {
    const m = mapped(ROW_ACTIVE);
    expect(m.candidateInput.identifierType).toBe('KOREA_DRUG_CODE');
    expect(m.candidateInput.identifierValue).toBe('8806920000531'); // no trailing space
    expect(m.candidateInput.rawPayload.standardCode).toBe('8806920000531');
  });

  it('한글상품명→candidateName, 업체명→candidateManufacturer 후보 (자동 대표 파생 아님)', () => {
    const m = mapped(ROW_ACTIVE);
    expect(m.candidateInput.candidateName).toBe('레스타시스점안액0.05%');
    expect(m.candidateInput.candidateManufacturer).toBe('(유)삼일엘러간');
  });

  it('groupKey = 품목기준코드 (trim) 를 rawPayload 에 보존한다', () => {
    const m = mapped(ROW_ACTIVE);
    expect(m.groupKey).toBe('200510968');
    expect(m.candidateInput.rawPayload.groupKey).toBe('200510968');
    expect(m.candidateInput.rawPayload.mfdsCode).toBe('200510968');
  });

  it('취소일자 공란 → active, 존재 → cancelled', () => {
    expect(mapped(ROW_ACTIVE).isCancelled).toBe(false);
    expect(mapped(ROW_CANCELLED).isCancelled).toBe(true);
    expect(mapped(ROW_CANCELLED).candidateInput.rawPayload.isCancelled).toBe(true);
  });

  it('포장형태 결측 → PACKAGE_FORM_MISSING review flag', () => {
    expect(mapped(ROW_CANCELLED).reviewFlags).toContain('PACKAGE_FORM_MISSING');
    expect(mapped(ROW_ACTIVE).reviewFlags).not.toContain('PACKAGE_FORM_MISSING');
  });

  it('표준코드 형식 이상 → STANDARD_CODE_FORMAT flag + 식별자 미부착', () => {
    const m = mapped(ROW_BAD_CODE);
    expect(m.reviewFlags).toContain('STANDARD_CODE_FORMAT');
    expect(m.candidateInput.identifierType).toBeNull();
    expect(m.candidateInput.identifierValue).toBeNull();
  });

  it('원본 22컬럼을 rawPayload.source 에 무손실 보존한다', () => {
    const m = mapped(ROW_ACTIVE);
    const source = m.candidateInput.rawPayload.source as Record<string, string | null>;
    expect(Object.keys(source)).toHaveLength(22);
    expect(source['국제표준코드(ATC코드)']).toBe('S01XA18');
    expect(source['제형구분']).toBe('점안액');
  });

  it('ATC/제형/총수량 등 보조 원본값을 rawPayload 에 보존한다', () => {
    const m = mapped(ROW_ACTIVE);
    expect(m.candidateInput.rawPayload.atcCode).toBe('S01XA18');
    expect(m.candidateInput.rawPayload.dosageFormRaw).toBe('점안액');
    expect(m.candidateInput.rawPayload.totalQuantityRaw).toBe('30');
    expect(m.candidateInput.rawPayload.sourceFileName).toBe('약가마스터_20251031.csv');
    expect(m.candidateInput.rawPayload.sourceBaseDate).toBe('2025-10-31');
    expect(m.candidateInput.rawPayload.rowNumber).toBe(1);
  });
});

describe('DrugCandidateImportService (dry-run, offline)', () => {
  const base = {
    sourceFileName: '약가마스터_20251031.csv',
    sourceBaseDate: '2025-10-31',
    encoding: 'utf-8' as const,
    apply: false,
    dataSource: null,
  };

  it('offline dry-run 이 DB 없이 파싱+매핑+예상건수를 낸다', async () => {
    const svc = new DrugCandidateImportService();
    const report = await svc.run({ ...base, buffer: utf8Csv([ROW_ACTIVE, ROW_CANCELLED]) });
    expect(report.mode).toBe('dry-run');
    expect(report.dedupChecked).toBe(false);
    expect(report.processedRows).toBe(2);
    expect(report.counts.created).toBe(2);
    expect(report.classification).toEqual({ active: 1, cancelled: 1 });
    expect(report.notes.length).toBeGreaterThan(0);
  });

  it('동일 파일 내 중복(표준코드+기준일)은 skipped 로 무한중복 방지', async () => {
    const svc = new DrugCandidateImportService();
    // ROW_ACTIVE 두 번 → 두번째는 skipped
    const report = await svc.run({ ...base, buffer: utf8Csv([ROW_ACTIVE, ROW_ACTIVE]) });
    expect(report.counts.created).toBe(1);
    expect(report.counts.skipped).toBe(1);
  });

  it('표준코드 형식 이상 행은 skipped (식별 불가)', async () => {
    const svc = new DrugCandidateImportService();
    const report = await svc.run({ ...base, buffer: utf8Csv([ROW_BAD_CODE]) });
    expect(report.counts.skipped).toBe(1);
    expect(report.counts.created).toBe(0);
    expect(report.reviewFlagCounts.STANDARD_CODE_FORMAT).toBe(1);
  });

  it('multi-manufacturer 감지: 동일 품목기준코드 + 다른 업체', async () => {
    const svc = new DrugCandidateImportService();
    const report = await svc.run({ ...base, buffer: utf8Csv([ROW_ACTIVE, ROW_MULTI_MFR]) });
    expect(report.multiManufacturer.detectedGroups).toBe(1);
    expect(report.multiManufacturer.rowsInMultiManufacturerGroups).toBe(2);
  });

  it('CP949 버퍼로도 dry-run 이 동작한다', async () => {
    const svc = new DrugCandidateImportService();
    const report = await svc.run({
      ...base,
      encoding: 'cp949',
      buffer: cp949Csv([ROW_ACTIVE, ROW_CANCELLED]),
    });
    expect(report.encodingUsed).toBe('cp949');
    expect(report.processedRows).toBe(2);
  });

  it('--apply 는 초기화된 DataSource 없으면 거부한다', async () => {
    const svc = new DrugCandidateImportService();
    await expect(
      svc.run({ ...base, apply: true, buffer: utf8Csv([ROW_ACTIVE]) }),
    ).rejects.toThrow('APPLY_REQUIRES_INITIALIZED_DATASOURCE');
  });

  it('limit 가 처리 행 수를 제한한다 (샘플 실증)', async () => {
    const svc = new DrugCandidateImportService();
    const report = await svc.run({ ...base, limit: 1, buffer: utf8Csv([ROW_ACTIVE, ROW_CANCELLED]) });
    expect(report.processedRows).toBe(1);
  });
});

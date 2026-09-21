/**
 * 원내 약품 Local Dataset — 브라우저 파싱·정규화·저장·조회 단위 테스트
 *
 * WO-O4O-HOSPITAL-DRUG-BROWSER-LOCAL-DATA-CONNECT-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 원내 파일이 서버로 가지 않고 브라우저에서 완결됨을 세운다: CSV/XLSX 를 SheetJS 로 파싱해
 * 표준 필드로 정규화하고, localStorage 에 담고, contains 매칭으로 조회한다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLocalDataset,
  loadLocalDataset,
  makeDataset,
  matchLocalByResearchIngredients,
  parseDrugFile,
  queryLocalRows,
  renderLocalContextBlock,
  saveLocalDataset,
  type LocalDrugRow,
} from '../localDataset';

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

function csvFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('parseDrugFile — 브라우저 파싱·정규화', () => {
  it('한글 헤더(제품명·성분·함량·제형·제조사)를 표준 필드로 정규화한다', async () => {
    const csv = ['제품명,성분,함량,제형,제조사', '타이레놀정,아세트아미노펜,500mg,정제,한국얀센', '아목시실린캡슐,아목시실린,250mg,캡슐,종근당'].join(
      '\n',
    );
    const out = await parseDrugFile(csvFile('원내약품.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toEqual({
      product_name: '타이레놀정',
      ingredient: '아세트아미노펜',
      strength: '500mg',
      dosage_form: '정제',
      manufacturer: '한국얀센',
    });
  });

  it('영문 헤더 별칭(name·ingredient·strength)도 인식한다', async () => {
    const csv = ['name,ingredient,strength', 'Tylenol,Acetaminophen,500mg'].join('\n');
    const out = await parseDrugFile(csvFile('drugs.csv', csv));
    expect(out.rows[0].product_name).toBe('Tylenol');
    expect(out.rows[0].ingredient).toBe('Acetaminophen');
  });

  it('제품명 열이 없으면 missingNameColumn 으로 알린다(연결 거부)', async () => {
    const csv = ['성분,함량', '아세트아미노펜,500mg'].join('\n');
    const out = await parseDrugFile(csvFile('bad.csv', csv));
    expect(out.missingNameColumn).toBe(true);
    expect(out.rows).toHaveLength(0);
  });

  it('제품명이 빈 행은 건너뛴다(skipped 집계)', async () => {
    const csv = ['제품명,성분', '타이레놀정,아세트아미노펜', ',성분만있음', '아목시실린,아목시실린'].join('\n');
    const out = await parseDrugFile(csvFile('gaps.csv', csv));
    expect(out.rows).toHaveLength(2);
    expect(out.skipped).toBe(1);
  });
});

describe('parseDrugFile — 실제 현업 Excel 형태(헤더 자동 탐색·괄호/슬래시 헤더)', () => {
  it('A. 첫 행 헤더(제품명/성분/함량)', async () => {
    const csv = ['제품명,성분,함량', '타이레놀정,아세트아미노펜,500mg'].join('\n');
    const out = await parseDrugFile(csvFile('A.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.headerRowIndex).toBe(0);
    expect(out.rows[0]).toEqual({ product_name: '타이레놀정', ingredient: '아세트아미노펜', strength: '500mg' });
  });

  it('B. 앞에 제목/작성일 행이 있고 헤더가 4행째', async () => {
    const csv = [
      '○○병원 원내 약품 목록',
      '작성일: 2026-09-21',
      '약제부',
      '제품명,성분,함량,제조사',
      '타이레놀정,아세트아미노펜,500mg,한국얀센',
      '아목시실린캡슐,아목시실린,250mg,종근당',
    ].join('\n');
    const out = await parseDrugFile(csvFile('B.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.headerRowIndex).toBe(3);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].product_name).toBe('타이레놀정');
  });

  it('C. 괄호가 붙은 헤더 제품명(약품명)', async () => {
    const csv = ['제품명(약품명),성분,함량', '타이레놀정,아세트아미노펜,500mg'].join('\n');
    const out = await parseDrugFile(csvFile('C.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.rows[0].product_name).toBe('타이레놀정');
  });

  it('D. 다른 별칭 헤더(약품명/성분명/규격/제조원)', async () => {
    const csv = ['약품명,성분명,규격,제조원', '세토펜정,아세트아미노펜,650mg,삼남'].join('\n');
    const out = await parseDrugFile(csvFile('D.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.rows[0]).toEqual({
      product_name: '세토펜정',
      ingredient: '아세트아미노펜',
      strength: '650mg',
      manufacturer: '삼남',
    });
  });

  it('C2. 한 셀 안에 슬래시로 별칭이 붙은 헤더도 인식(성분/함량)', async () => {
    const csv = ['"제품명","성분/함량"', '"타이레놀정","아세트아미노펜"'].join('\n');
    const out = await parseDrugFile(csvFile('C2.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.rows[0].product_name).toBe('타이레놀정');
    // '성분/함량' → 첫 토큰 성분(ingredient) 으로 매핑
    expect(out.rows[0].ingredient).toBe('아세트아미노펜');
  });

  it('E. product_name 단일 컬럼도 지원', async () => {
    const csv = ['품목명', '타이레놀정', '아목시실린캡슐'].join('\n');
    const out = await parseDrugFile(csvFile('E.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].product_name).toBe('타이레놀정');
  });

  it('F. 약품명 열이 없는 파일은 명확히 거부하고 인식한 열 제목을 돌려준다', async () => {
    const csv = ['성분,함량,제조사', '아세트아미노펜,500mg,한국얀센'].join('\n');
    const out = await parseDrugFile(csvFile('F.csv', csv));
    expect(out.missingNameColumn).toBe(true);
    expect(out.rows).toHaveLength(0);
    expect(out.detectedHeaders).toEqual(['성분', '함량', '제조사']);
  });

  it('F2. 문장형 제목 행(제품명 단어 포함)만으로는 헤더로 오인하지 않는다', async () => {
    const csv = ['본 목록은 원내 제품명 기준입니다', '성분,함량', '아세트아미노펜,500mg'].join('\n');
    const out = await parseDrugFile(csvFile('F2.csv', csv));
    expect(out.missingNameColumn).toBe(true);
  });
});

describe('localStorage 저장·복원', () => {
  it('저장한 데이터셋을 그대로 복원한다(새로고침 후 유지)', () => {
    const rows: LocalDrugRow[] = [{ product_name: '타이레놀정', ingredient: '아세트아미노펜', strength: '500mg' }];
    const ds = makeDataset('원내약품.xlsx', rows);
    expect(saveLocalDataset(ds)).toEqual({ ok: true });

    const restored = loadLocalDataset();
    expect(restored?.count).toBe(1);
    expect(restored?.fileName).toBe('원내약품.xlsx');
    expect(restored?.rows[0].product_name).toBe('타이레놀정');
  });

  it('해제하면 복원값이 없다', () => {
    saveLocalDataset(makeDataset('x.csv', [{ product_name: 'A' }]));
    clearLocalDataset();
    expect(loadLocalDataset()).toBeNull();
  });

  it('손상·구버전 값은 null 로 무시한다', () => {
    localStorage.setItem('neture:hospital-drug:local-dataset:v1', '{ not json');
    expect(loadLocalDataset()).toBeNull();
    localStorage.setItem('neture:hospital-drug:local-dataset:v1', JSON.stringify({ v: 99, rows: [] }));
    expect(loadLocalDataset()).toBeNull();
  });
});

describe('queryLocalRows — contains 매칭', () => {
  const rows: LocalDrugRow[] = [
    { product_name: '타이레놀정500mg', ingredient: '아세트아미노펜', strength: '500mg' },
    { product_name: '아목시실린캡슐250mg', ingredient: '아목시실린', strength: '250mg' },
  ];

  it('제품명 부분일치로 찾는다', () => {
    expect(queryLocalRows(rows, ['타이레놀'])).toHaveLength(1);
  });

  it('성분명으로도 찾는다', () => {
    const found = queryLocalRows(rows, ['아세트아미노펜']);
    expect(found[0].product_name).toBe('타이레놀정500mg');
  });

  it('2글자 미만·매칭 없음은 빈 배열', () => {
    expect(queryLocalRows(rows, ['x'])).toHaveLength(0);
    expect(queryLocalRows(rows, ['존재하지않는약'])).toHaveLength(0);
  });
});

describe('matchLocalByResearchIngredients — 동일성분 결합', () => {
  const rows: LocalDrugRow[] = [
    { product_name: '타이레놀정', ingredient: '아세트아미노펜' },
    { product_name: '세토펜정', ingredient: '아세트아미노펜' },
    { product_name: '아목시실린캡슐', ingredient: '아목시실린' },
  ];

  it('research 본문에 등장한 성분과 같은 성분의 원내 행을 모은다', () => {
    const research = '타이레놀정의 주성분은 아세트아미노펜이며 해열·진통에 쓰입니다.';
    const found = matchLocalByResearchIngredients(rows, research);
    expect(found.map((r) => r.product_name).sort()).toEqual(['세토펜정', '타이레놀정']);
  });

  it('본문에 성분이 없으면 빈 배열', () => {
    expect(matchLocalByResearchIngredients(rows, '관련 정보가 없습니다.')).toHaveLength(0);
  });
});

describe('renderLocalContextBlock — 서버 renderLocalBlock 과 같은 형식', () => {
  it('매칭 결과를 건수·행으로 렌더한다', () => {
    const block = renderLocalContextBlock([{ product_name: '타이레놀정', ingredient: '아세트아미노펜', strength: '500mg' }], null);
    expect(block).toContain('[원내 약품] 1건 확인');
    expect(block).toContain('타이레놀정');
    expect(block).toContain('성분 아세트아미노펜');
  });

  it('매칭이 없으면 「찾지 못했습니다」', () => {
    expect(renderLocalContextBlock([], null)).toContain('찾지 못했습니다');
  });
});
